import { supabaseAdmin, apiResponse, isValidUUID } from '@/lib/supabase-admin'

// GET /api/orders/list?tenant_id={id}&branch_id={id}&status={status}&date={date}&channel={channel}&limit={limit}&offset={offset}
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant_id')
    const branchId = searchParams.get('branch_id')
    const status = searchParams.get('status')
    const date = searchParams.get('date')  // YYYY-MM-DD
    const channel = searchParams.get('channel')
    const orderType = searchParams.get('order_type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const includeItems = searchParams.get('include_items') !== 'false'
    
    if (!tenantId) {
      return apiResponse(false, null, 'tenant_id is required', 400)
    }
    
    if (!isValidUUID(tenantId)) {
      return apiResponse(false, null, 'Invalid tenant_id format', 400)
    }
    
    let query = supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (branchId) {
      if (!isValidUUID(branchId)) {
        return apiResponse(false, null, 'Invalid branch_id format', 400)
      }
      query = query.eq('branch_id', branchId)
    }
    
    if (status) {
      // Support multiple statuses separated by comma
      const statuses = status.split(',').map(s => s.trim())
      console.log('Status filter:', statuses)
      query = query.in('status', statuses)
    }
    
    if (date) {
      const startOfDay = `${date}T00:00:00`
      const endOfDay = `${date}T23:59:59.999`
      query = query.gte('created_at', startOfDay).lte('created_at', endOfDay)
    }
    
    if (channel) {
      query = query.eq('channel', channel)
    }
    
    if (orderType) {
      query = query.eq('order_type', orderType)
    }
    
    const { data: orders, error, count } = await query
    
    if (error) throw error
    
    // Include order items if requested
    if (includeItems && orders && orders.length > 0) {
      const orderIds = orders.map(o => o.id)
      
      const { data: orderItems } = await supabaseAdmin
        .from('order_items')
        .select(`
          *,
          order_item_modifiers (
            id, modifier_id, modifier_name_en, modifier_name_ar, price, quantity
          )
        `)
        .in('order_id', orderIds)
      
      // Attach items to orders
      const ordersWithItems = orders.map(order => ({
        ...order,
        items: orderItems?.filter(item => item.order_id === order.id) || []
      }))
      
      return apiResponse(true, {
        orders: ordersWithItems,
        pagination: {
          total: count,
          limit,
          offset,
          has_more: offset + orders.length < count
        }
      })
    }
    
    return apiResponse(true, {
      orders,
      pagination: {
        total: count,
        limit,
        offset,
        has_more: offset + orders.length < count
      }
    })
  } catch (error) {
    console.error('List orders error:', error)
    return apiResponse(false, null, 'Failed to fetch orders', 500)
  }
}
