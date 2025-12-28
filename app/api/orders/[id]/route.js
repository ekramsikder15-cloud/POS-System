import { supabaseAdmin, apiResponse, isValidUUID, createAuditLog } from '@/lib/supabase-admin'
import { v4 as uuidv4 } from 'uuid'

// Valid order status transitions (QSR simplified flow)
// pending -> preparing -> ready -> completed
// Or pending -> accepted -> preparing -> ready -> dispatched -> delivered -> completed (full delivery flow)
const STATUS_TRANSITIONS = {
  pending: ['accepted', 'preparing', 'cancelled'], // Allow direct to preparing for QSR
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['dispatched', 'completed', 'cancelled'],
  dispatched: ['delivered', 'cancelled'],
  delivered: ['completed'],
  completed: [],
  cancelled: []
}

// GET /api/orders/[id]
export async function GET(request, { params }) {
  try {
    const { id } = await params
    
    if (!isValidUUID(id)) {
      return apiResponse(false, null, 'Invalid order ID format', 400)
    }
    
    // Get order with all related data
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        branches:branch_id (
          id, name, address, phone
        ),
        users:user_id (
          id, name, email
        ),
        customers:customer_id (
          id, name, phone, email
        ),
        tables:table_id (
          id, table_number, capacity
        )
      `)
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return apiResponse(false, null, 'Order not found', 404)
      }
      throw error
    }
    
    // Get order items with modifiers
    const { data: items } = await supabaseAdmin
      .from('order_items')
      .select(`
        *,
        order_item_modifiers (
          id, modifier_id, modifier_name_en, modifier_name_ar, price, quantity
        )
      `)
      .eq('order_id', id)
      .order('created_at', { ascending: true })
    
    // Get payments
    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: true })
    
    // Get order states (history)
    const { data: states } = await supabaseAdmin
      .from('order_states')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: true })
    
    // Get refunds if any
    const { data: refunds } = await supabaseAdmin
      .from('refunds')
      .select('*')
      .eq('order_id', id)
    
    return apiResponse(true, {
      order: {
        ...order,
        items: items || [],
        payments: payments || [],
        states: states || [],
        refunds: refunds || [],
        allowed_transitions: STATUS_TRANSITIONS[order.status] || []
      }
    })
  } catch (error) {
    console.error('Get order error:', error)
    return apiResponse(false, null, 'Failed to fetch order', 500)
  }
}

// PATCH /api/orders/[id]
// Update order status or details
export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    
    if (!isValidUUID(id)) {
      return apiResponse(false, null, 'Invalid order ID format', 400)
    }
    
    // Get current order
    const { data: currentOrder, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return apiResponse(false, null, 'Order not found', 404)
      }
      throw fetchError
    }
    
    const {
      status,
      payment_status,
      notes,
      delivery_address,
      delivery_instructions,
      customer_name,
      customer_phone,
      user_id,
      reason
    } = body
    
    const updateData = {}
    
    // Handle status change
    if (status && status !== currentOrder.status) {
      // Validate transition
      const allowedTransitions = STATUS_TRANSITIONS[currentOrder.status] || []
      if (!allowedTransitions.includes(status)) {
        return apiResponse(false, null, 
          `Invalid status transition from '${currentOrder.status}' to '${status}'. Allowed: ${allowedTransitions.join(', ')}`, 
          400
        )
      }
      
      updateData.status = status
      
      // Set timestamps based on status
      if (status === 'accepted') {
        updateData.accepted_at = new Date().toISOString()
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
      } else if (status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString()
      }
      
      // Create order state record
      await supabaseAdmin.from('order_states').insert({
        id: uuidv4(),
        order_id: id,
        from_status: currentOrder.status,
        to_status: status,
        notes: reason || `Status changed to ${status}`
      })
    }
    
    // Handle other updates
    if (payment_status) updateData.payment_status = payment_status
    if (notes !== undefined) updateData.notes = notes
    if (delivery_address !== undefined) updateData.delivery_address = delivery_address
    if (delivery_instructions !== undefined) updateData.delivery_instructions = delivery_instructions
    if (customer_name !== undefined) updateData.customer_name = customer_name
    if (customer_phone !== undefined) updateData.customer_phone = customer_phone
    
    updateData.updated_at = new Date().toISOString()
    
    const { data: order, error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (updateError) throw updateError
    
    // Audit log
    if (user_id) {
      await createAuditLog({
        tenantId: currentOrder.tenant_id,
        userId: user_id,
        action: 'update',
        resourceType: 'order',
        resourceId: id,
        beforeValue: currentOrder,
        afterValue: order
      })
    }
    
    return apiResponse(true, {
      order,
      message: status ? `Order status updated to ${status}` : 'Order updated successfully'
    })
  } catch (error) {
    console.error('Update order error:', error)
    return apiResponse(false, null, 'Failed to update order', 500)
  }
}
