import { supabaseAdmin, apiResponse, isValidUUID, createAuditLog } from '@/lib/supabase-admin'
import { v4 as uuidv4 } from 'uuid'

// GET /api/menu/items?tenant_id={id}&category_id={id}&status={status}
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant_id')
    const categoryId = searchParams.get('category_id')
    const status = searchParams.get('status')
    const includeModifiers = searchParams.get('include_modifiers') === 'true'
    
    if (!tenantId) {
      return apiResponse(false, null, 'tenant_id is required', 400)
    }
    
    if (!isValidUUID(tenantId)) {
      return apiResponse(false, null, 'Invalid tenant_id format', 400)
    }
    
    let query = supabaseAdmin
      .from('items')
      .select(`
        *,
        categories:category_id (
          id, name_en, name_ar
        )
      `)
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true })
    
    if (categoryId) {
      if (!isValidUUID(categoryId)) {
        return apiResponse(false, null, 'Invalid category_id format', 400)
      }
      query = query.eq('category_id', categoryId)
    }
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data: items, error } = await query
    
    if (error) throw error
    
    // If includeModifiers, fetch modifier groups for each item
    if (includeModifiers && items && items.length > 0) {
      const itemIds = items.map(i => i.id)
      
      // Get item_modifier_groups
      const { data: itemModGroups } = await supabaseAdmin
        .from('item_modifier_groups')
        .select(`
          item_id,
          modifier_group_id,
          sort_order,
          modifier_groups:modifier_group_id (
            id, name_en, name_ar, min_select, max_select, required, status
          )
        `)
        .in('item_id', itemIds)
        .order('sort_order', { ascending: true })
      
      // Get all modifier group IDs
      const modGroupIds = [...new Set(itemModGroups?.map(img => img.modifier_group_id) || [])]
      
      // Get modifiers for those groups
      const { data: modifiers } = await supabaseAdmin
        .from('modifiers')
        .select('*')
        .in('modifier_group_id', modGroupIds)
        .eq('status', 'active')
        .order('sort_order', { ascending: true })
      
      // Attach modifiers to items
      const itemsWithModifiers = items.map(item => {
        const itemGroups = itemModGroups?.filter(img => img.item_id === item.id) || []
        const modifierGroups = itemGroups.map(ig => ({
          ...ig.modifier_groups,
          modifiers: modifiers?.filter(m => m.modifier_group_id === ig.modifier_group_id) || []
        }))
        return { ...item, modifier_groups: modifierGroups }
      })
      
      return apiResponse(true, { items: itemsWithModifiers })
    }
    
    return apiResponse(true, { items })
  } catch (error) {
    console.error('Get items error:', error)
    return apiResponse(false, null, 'Failed to fetch items', 500)
  }
}

// POST /api/menu/items
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      tenant_id, category_id, name_en, name_ar, description_en, description_ar,
      image_url, base_price, cost_price, sku, barcode, sort_order, status,
      is_available, available_from, available_until, modifier_group_ids, user_id
    } = body
    
    if (!tenant_id || !category_id || !name_en || base_price === undefined) {
      return apiResponse(false, null, 'tenant_id, category_id, name_en, and base_price are required', 400)
    }
    
    const itemId = uuidv4()
    const itemData = {
      id: itemId,
      tenant_id,
      category_id,
      name_en,
      name_ar: name_ar || null,
      description_en: description_en || null,
      description_ar: description_ar || null,
      image_url: image_url || null,
      base_price: parseFloat(base_price),
      cost_price: cost_price ? parseFloat(cost_price) : null,
      sku: sku || null,
      barcode: barcode || null,
      sort_order: sort_order || 0,
      status: status || 'active',
      is_available: is_available !== false,
      available_from: available_from || null,
      available_until: available_until || null
    }
    
    const { data, error } = await supabaseAdmin
      .from('items')
      .insert(itemData)
      .select()
      .single()
    
    if (error) throw error
    
    // Create item_modifier_groups if provided
    if (modifier_group_ids && modifier_group_ids.length > 0) {
      const itemModifierGroups = modifier_group_ids.map((mgId, index) => ({
        id: uuidv4(),
        item_id: itemId,
        modifier_group_id: mgId,
        sort_order: index
      }))
      
      await supabaseAdmin.from('item_modifier_groups').insert(itemModifierGroups)
    }
    
    // Audit log
    if (user_id) {
      await createAuditLog({
        tenantId: tenant_id,
        userId: user_id,
        action: 'create',
        resourceType: 'item',
        resourceId: itemId,
        afterValue: itemData
      })
    }
    
    return apiResponse(true, { item: data }, null, 201)
  } catch (error) {
    console.error('Create item error:', error)
    return apiResponse(false, null, 'Failed to create item', 500)
  }
}
