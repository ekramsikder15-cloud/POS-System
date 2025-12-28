import { supabaseAdmin, apiResponse, isValidUUID, createAuditLog } from '@/lib/supabase-admin'
import { v4 as uuidv4 } from 'uuid'

// GET /api/menu/categories?tenant_id={id}&status={status}
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant_id')
    const status = searchParams.get('status')
    
    if (!tenantId) {
      return apiResponse(false, null, 'tenant_id is required', 400)
    }
    
    if (!isValidUUID(tenantId)) {
      return apiResponse(false, null, 'Invalid tenant_id format', 400)
    }
    
    let query = supabaseAdmin
      .from('categories')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true })
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    return apiResponse(true, { categories: data })
  } catch (error) {
    console.error('Get categories error:', error)
    return apiResponse(false, null, 'Failed to fetch categories', 500)
  }
}

// POST /api/menu/categories
export async function POST(request) {
  try {
    const body = await request.json()
    const { tenant_id, name_en, name_ar, description_en, description_ar, image_url, sort_order, status, user_id } = body
    
    if (!tenant_id || !name_en) {
      return apiResponse(false, null, 'tenant_id and name_en are required', 400)
    }
    
    const categoryId = uuidv4()
    const categoryData = {
      id: categoryId,
      tenant_id,
      name_en,
      name_ar: name_ar || null,
      description_en: description_en || null,
      description_ar: description_ar || null,
      image_url: image_url || null,
      sort_order: sort_order || 0,
      status: status || 'active'
    }
    
    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert(categoryData)
      .select()
      .single()
    
    if (error) throw error
    
    // Audit log
    if (user_id) {
      await createAuditLog({
        tenantId: tenant_id,
        userId: user_id,
        action: 'create',
        resourceType: 'category',
        resourceId: categoryId,
        afterValue: categoryData
      })
    }
    
    return apiResponse(true, { category: data }, null, 201)
  } catch (error) {
    console.error('Create category error:', error)
    return apiResponse(false, null, 'Failed to create category', 500)
  }
}
