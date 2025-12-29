import { supabaseAdmin, apiResponse, isValidUUID, generateOrderNumber, createAuditLog } from '@/lib/supabase-admin'
import { v4 as uuidv4 } from 'uuid'

// POST /api/orders/create
// Create a new order with items, modifiers, and payment
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      tenant_id,
      branch_id,
      order_type,         // qsr, takeaway, delivery, dine_in
      channel,            // pos, website, mobile, talabat, deliveroo, careem, etc.
      aggregator,         // talabat, deliveroo, careem (optional, for orders from aggregators)
      items,              // Array of { item_id, variant_id?, quantity, modifiers: [{id, price}], notes? }
      customer_id,
      customer_name,
      customer_phone,
      customer_email,
      table_id,
      device_id,
      user_id,
      delivery_address_id,
      delivery_address,   // { address_line, area, block, street, building, floor, apartment, lat, lng }
      delivery_instructions,
      payment_method,     // cash, card, online, wallet
      amount_received,    // For cash payments
      notes,
      scheduled_for,
      coupon_code,
      discount_amount
    } = body
    
    // Validation
    if (!tenant_id || !branch_id || !items || items.length === 0) {
      return apiResponse(false, null, 'tenant_id, branch_id, and items are required', 400)
    }
    
    if (!isValidUUID(tenant_id) || !isValidUUID(branch_id)) {
      return apiResponse(false, null, 'Invalid tenant_id or branch_id format', 400)
    }
    
    // Get tenant for tax and service charge rates
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('currency, tax_rate, service_charge_rate')
      .eq('id', tenant_id)
      .single()
    
    if (tenantError || !tenant) {
      return apiResponse(false, null, 'Tenant not found', 404)
    }
    
    // Get item details for price calculation
    const itemIds = items.map(i => i.item_id)
    const { data: menuItems, error: itemsError } = await supabaseAdmin
      .from('items')
      .select('id, name_en, name_ar, base_price')
      .in('id', itemIds)
    
    if (itemsError || !menuItems || menuItems.length === 0) {
      return apiResponse(false, null, 'One or more items not found', 404)
    }
    
    // Create item lookup
    const itemLookup = menuItems.reduce((acc, item) => {
      acc[item.id] = item
      return acc
    }, {})
    
    // Calculate order totals
    let subtotal = 0
    const orderItems = items.map(item => {
      const menuItem = itemLookup[item.item_id]
      if (!menuItem) throw new Error(`Item ${item.item_id} not found`)
      
      const modifiersTotal = (item.modifiers || []).reduce((sum, m) => sum + (m.price || 0), 0)
      const unitPrice = menuItem.base_price + modifiersTotal
      const totalPrice = unitPrice * item.quantity
      subtotal += totalPrice
      
      return {
        id: uuidv4(),
        item_id: item.item_id,
        variant_id: item.variant_id || null,
        item_name_en: menuItem.name_en,
        item_name_ar: menuItem.name_ar,
        variant_name_en: item.variant_name_en || null,
        variant_name_ar: item.variant_name_ar || null,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        notes: item.notes || null,
        modifiers: item.modifiers || []
      }
    })
    
    // Calculate taxes and charges
    const taxRate = tenant.tax_rate || 0
    const serviceChargeRate = (order_type === 'dine_in' || order_type === 'qsr') ? (tenant.service_charge_rate || 0) : 0
    const taxAmount = subtotal * (taxRate / 100)
    const serviceCharge = subtotal * (serviceChargeRate / 100)
    const discountAmt = discount_amount || 0
    const deliveryFee = order_type === 'delivery' ? 0.500 : 0  // Default delivery fee, can be customized
    const totalAmount = subtotal + taxAmount + serviceCharge - discountAmt + deliveryFee
    
    // Generate order number
    const orderNumber = await generateOrderNumber(branch_id)
    
    // Create order
    const orderId = uuidv4()
    const orderData = {
      id: orderId,
      tenant_id,
      branch_id,
      order_number: orderNumber,
      order_type: order_type || 'qsr',
      channel: channel || 'pos',
      customer_id: customer_id || null,
      customer_name: customer_name || null,
      customer_phone: customer_phone || null,
      customer_email: customer_email || null,
      table_id: table_id || null,
      device_id: device_id || null,
      user_id: user_id || null,
      delivery_address_id: delivery_address_id || null,
      delivery_address: delivery_address || null,
      delivery_instructions: delivery_instructions || null,
      subtotal,
      tax_amount: taxAmount,
      service_charge: serviceCharge,
      discount_amount: discountAmt,
      delivery_fee: deliveryFee,
      total_amount: totalAmount,
      status: 'pending',
      payment_status: payment_method === 'cash' ? 'pending' : 'paid',
      notes: notes || null,
      scheduled_for: scheduled_for || null
    }
    
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert(orderData)
      .select()
      .single()
    
    if (orderError) throw orderError
    
    // Create order items
    const orderItemsData = orderItems.map(item => ({
      id: item.id,
      order_id: orderId,
      item_id: item.item_id,
      variant_id: item.variant_id,
      item_name_en: item.item_name_en,
      item_name_ar: item.item_name_ar,
      variant_name_en: item.variant_name_en,
      variant_name_ar: item.variant_name_ar,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      notes: item.notes,
      status: 'pending'
    }))
    
    const { error: orderItemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemsData)
    
    if (orderItemsError) {
      console.error('Order items error:', orderItemsError)
    }
    
    // Create order item modifiers
    const orderItemModifiers = []
    orderItems.forEach(item => {
      if (item.modifiers && item.modifiers.length > 0) {
        item.modifiers.forEach(mod => {
          orderItemModifiers.push({
            id: uuidv4(),
            order_item_id: item.id,
            modifier_id: mod.id,
            modifier_name_en: mod.name_en || mod.name,
            modifier_name_ar: mod.name_ar || null,
            price: mod.price || 0,
            quantity: 1
          })
        })
      }
    })
    
    if (orderItemModifiers.length > 0) {
      await supabaseAdmin.from('order_item_modifiers').insert(orderItemModifiers)
    }
    
    // Create payment record
    if (payment_method) {
      const paymentData = {
        id: uuidv4(),
        order_id: orderId,
        payment_method: payment_method,
        provider: payment_method === 'online' ? 'upay' : null,
        amount: totalAmount,
        currency: tenant.currency || 'KWD',
        status: payment_method === 'cash' ? 'pending' : 'completed',
        received_amount: amount_received || totalAmount,
        change_amount: payment_method === 'cash' ? Math.max(0, (amount_received || 0) - totalAmount) : 0
      }
      
      await supabaseAdmin.from('payments').insert(paymentData)
    }
    
    // Create initial order state
    const { data: user } = user_id ? await supabaseAdmin.from('users').select('id').eq('id', user_id).single() : { data: null }
    
    await supabaseAdmin.from('order_states').insert({
      id: uuidv4(),
      order_id: orderId,
      from_status: null,
      to_status: 'pending',
      notes: 'Order created'
    })
    
    // Audit log
    if (user_id) {
      await createAuditLog({
        tenantId: tenant_id,
        userId: user_id,
        action: 'create',
        resourceType: 'order',
        resourceId: orderId,
        afterValue: { order: orderData, items: orderItemsData }
      })
    }
    
    return apiResponse(true, {
      order: {
        ...order,
        items: orderItems,
        currency: tenant.currency || 'KWD'
      },
      order_number: orderNumber
    }, null, 201)
  } catch (error) {
    console.error('Create order error:', error)
    return apiResponse(false, null, error.message || 'Failed to create order', 500)
  }
}
