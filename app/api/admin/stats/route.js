import { supabaseAdmin, apiResponse, isValidUUID } from '@/lib/supabase-admin'

// GET /api/admin/stats?tenant_id={id}&branch_id={id}&date={date}
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant_id')
    const branchId = searchParams.get('branch_id')
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10)  // Default to today
    
    if (!tenantId) {
      return apiResponse(false, null, 'tenant_id is required', 400)
    }
    
    if (!isValidUUID(tenantId)) {
      return apiResponse(false, null, 'Invalid tenant_id format', 400)
    }
    
    const startOfDay = `${date}T00:00:00.000Z`
    const endOfDay = `${date}T23:59:59.999Z`
    
    // Build base query conditions
    let conditions = `tenant_id.eq.${tenantId}`
    if (branchId) {
      if (!isValidUUID(branchId)) {
        return apiResponse(false, null, 'Invalid branch_id format', 400)
      }
      conditions += `,branch_id.eq.${branchId}`
    }
    
    // Get today's orders
    let ordersQuery = supabaseAdmin
      .from('orders')
      .select('id, status, total_amount, payment_status, channel, order_type', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
    
    if (branchId) {
      ordersQuery = ordersQuery.eq('branch_id', branchId)
    }
    
    const { data: orders, count: totalOrders, error: ordersError } = await ordersQuery
    
    if (ordersError) throw ordersError
    
    // Calculate stats from orders
    const stats = {
      date,
      orders: {
        total: totalOrders || 0,
        pending: 0,
        preparing: 0,
        ready: 0,
        completed: 0,
        cancelled: 0
      },
      sales: {
        total: 0,
        paid: 0,
        pending: 0
      },
      by_channel: {},
      by_order_type: {}
    }
    
    if (orders) {
      orders.forEach(order => {
        // Count by status
        const status = order.status || 'pending'
        if (stats.orders[status] !== undefined) {
          stats.orders[status]++
        }
        
        // Calculate sales
        const amount = parseFloat(order.total_amount) || 0
        stats.sales.total += amount
        
        if (order.payment_status === 'paid') {
          stats.sales.paid += amount
        } else {
          stats.sales.pending += amount
        }
        
        // Count by channel
        const channel = order.channel || 'pos'
        stats.by_channel[channel] = (stats.by_channel[channel] || 0) + 1
        
        // Count by order type
        const orderType = order.order_type || 'qsr'
        stats.by_order_type[orderType] = (stats.by_order_type[orderType] || 0) + 1
      })
    }
    
    // Round sales to 3 decimals (KWD)
    stats.sales.total = Math.round(stats.sales.total * 1000) / 1000
    stats.sales.paid = Math.round(stats.sales.paid * 1000) / 1000
    stats.sales.pending = Math.round(stats.sales.pending * 1000) / 1000
    
    // Get top selling items today
    let topItemsQuery = supabaseAdmin
      .from('order_items')
      .select(`
        item_id,
        item_name_en,
        quantity
      `)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
    
    const { data: orderItems } = await topItemsQuery
    
    // Aggregate top items
    const itemCounts = {}
    if (orderItems) {
      orderItems.forEach(item => {
        const key = item.item_id
        if (!itemCounts[key]) {
          itemCounts[key] = {
            item_id: item.item_id,
            name: item.item_name_en,
            quantity: 0
          }
        }
        itemCounts[key].quantity += item.quantity || 1
      })
    }
    
    stats.top_items = Object.values(itemCounts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
    
    // Get recent orders (last 10)
    let recentQuery = supabaseAdmin
      .from('orders')
      .select('id, order_number, status, total_amount, customer_name, created_at, order_type, channel')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (branchId) {
      recentQuery = recentQuery.eq('branch_id', branchId)
    }
    
    const { data: recentOrders } = await recentQuery
    stats.recent_orders = recentOrders || []
    
    return apiResponse(true, { stats })
  } catch (error) {
    console.error('Get stats error:', error)
    return apiResponse(false, null, 'Failed to fetch stats', 500)
  }
}
