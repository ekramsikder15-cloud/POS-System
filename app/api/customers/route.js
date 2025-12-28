import { supabaseAdmin, apiResponse, isValidUUID, createAuditLog } from '@/lib/supabase-admin'
import { v4 as uuidv4 } from 'uuid'

// GET /api/customers?tenant_id={id}&search={query}&limit={limit}&offset={offset}
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant_id')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    if (!tenantId) {
      return apiResponse(false, null, 'tenant_id is required', 400)
    }
    
    if (!isValidUUID(tenantId)) {
      return apiResponse(false, null, 'Invalid tenant_id format', 400)
    }
    
    let query = supabaseAdmin
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
    }
    
    const { data: customers, error, count } = await query
    
    if (error) throw error
    
    return apiResponse(true, {
      customers,
      pagination: {
        total: count,
        limit,
        offset,
        has_more: offset + customers.length < count
      }
    })
  } catch (error) {
    console.error('Get customers error:', error)
    return apiResponse(false, null, 'Failed to fetch customers', 500)
  }
}

// POST /api/customers
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      tenant_id,
      name,
      phone,
      email,
      language,
      user_id
    } = body
    
    if (!tenant_id) {
      return apiResponse(false, null, 'tenant_id is required', 400)
    }
    
    if (!phone && !email) {
      return apiResponse(false, null, 'Either phone or email is required', 400)
    }
    
    // Check for existing customer
    let existingQuery = supabaseAdmin
      .from('customers')
      .select('*')
      .eq('tenant_id', tenant_id)
    
    if (phone) {
      existingQuery = existingQuery.eq('phone', phone)
    } else if (email) {
      existingQuery = existingQuery.eq('email', email.toLowerCase())
    }
    
    const { data: existing } = await existingQuery.single()
    
    if (existing) {
      // Return existing customer
      return apiResponse(true, { customer: existing, existing: true })
    }
    
    // Create new customer
    const customerId = uuidv4()
    const customerData = {
      id: customerId,
      tenant_id,
      name: name || null,
      phone: phone || null,
      email: email ? email.toLowerCase() : null,
      language: language || 'en',
      loyalty_points: 0,
      wallet_balance: 0,
      status: 'active'
    }
    
    const { data: customer, error } = await supabaseAdmin
      .from('customers')
      .insert(customerData)
      .select()
      .single()
    
    if (error) throw error
    
    // Audit log
    if (user_id) {
      await createAuditLog({
        tenantId: tenant_id,
        userId: user_id,
        action: 'create',
        resourceType: 'customer',
        resourceId: customerId,
        afterValue: customerData
      })
    }
    
    return apiResponse(true, { customer, existing: false }, null, 201)
  } catch (error) {
    console.error('Create customer error:', error)
    return apiResponse(false, null, 'Failed to create customer', 500)
  }
}
