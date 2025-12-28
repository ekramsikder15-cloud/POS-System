import { supabaseAdmin, apiResponse, isValidUUID, createAuditLog } from '@/lib/supabase-admin'
import { v4 as uuidv4 } from 'uuid'

// GET /api/menu/items/[id]
export async function GET(request, { params }) {
  try {
    const { id } = await params
    
    if (!isValidUUID(id)) {
      return apiResponse(false, null, 'Invalid item ID format', 400)
    }
    
    const { data: item, error } = await supabaseAdmin
      .from('items')
      .select(`
        *,
        categories:category_id (
          id, name_en, name_ar
        )
      `)
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return apiResponse(false, null, 'Item not found', 404)
      }
      throw error
    }
    
    // Get modifier groups for this item
    const { data: itemModGroups } = await supabaseAdmin
      .from('item_modifier_groups')
      .select(`
        modifier_group_id,
        sort_order,
        modifier_groups:modifier_group_id (
          id, name_en, name_ar, min_select, max_select, required, status
        )
      `)
      .eq('item_id', id)
      .order('sort_order', { ascending: true })
    
    // Get modifiers for those groups
    const modGroupIds = itemModGroups?.map(img => img.modifier_group_id) || []
    const { data: modifiers } = await supabaseAdmin
      .from('modifiers')
      .select('*')
      .in('modifier_group_id', modGroupIds)
      .eq('status', 'active')
      .order('sort_order', { ascending: true })
    
    // Attach modifiers to groups
    const modifierGroups = itemModGroups?.map(ig => ({
      ...ig.modifier_groups,
      modifiers: modifiers?.filter(m => m.modifier_group_id === ig.modifier_group_id) || []
    })) || []
    
    return apiResponse(true, { item: { ...item, modifier_groups: modifierGroups } })
  } catch (error) {
    console.error('Get item error:', error)
    return apiResponse(false, null, 'Failed to fetch item', 500)
  }
}

// PATCH /api/menu/items/[id]
export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    
    if (!isValidUUID(id)) {
      return apiResponse(false, null, 'Invalid item ID format', 400)
    }
    
    // Get current item for audit
    const { data: currentItem, error: fetchError } = await supabaseAdmin
      .from('items')
      .select('*')
      .eq('id', id)
      .single()
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return apiResponse(false, null, 'Item not found', 404)
      }
      throw fetchError
    }
    
    const {
      category_id, name_en, name_ar, description_en, description_ar,
      image_url, base_price, cost_price, sku, barcode, sort_order, status,
      is_available, available_from, available_until, modifier_group_ids, user_id
    } = body
    
    const updateData = {
      ...(category_id && { category_id }),
      ...(name_en && { name_en }),
      ...(name_ar !== undefined && { name_ar }),
      ...(description_en !== undefined && { description_en }),
      ...(description_ar !== undefined && { description_ar }),
      ...(image_url !== undefined && { image_url }),
      ...(base_price !== undefined && { base_price: parseFloat(base_price) }),
      ...(cost_price !== undefined && { cost_price: parseFloat(cost_price) }),
      ...(sku !== undefined && { sku }),
      ...(barcode !== undefined && { barcode }),
      ...(sort_order !== undefined && { sort_order }),
      ...(status && { status }),
      ...(is_available !== undefined && { is_available }),
      ...(available_from !== undefined && { available_from }),
      ...(available_until !== undefined && { available_until }),
      updated_at: new Date().toISOString()
    }
    
    const { data, error } = await supabaseAdmin
      .from('items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    // Update modifier groups if provided
    if (modifier_group_ids !== undefined) {
      // Delete existing
      await supabaseAdmin.from('item_modifier_groups').delete().eq('item_id', id)
      
      // Insert new
      if (modifier_group_ids.length > 0) {
        const itemModifierGroups = modifier_group_ids.map((mgId, index) => ({
          id: uuidv4(),
          item_id: id,
          modifier_group_id: mgId,
          sort_order: index
        }))
        await supabaseAdmin.from('item_modifier_groups').insert(itemModifierGroups)
      }
    }
    
    // Audit log
    if (user_id) {
      await createAuditLog({
        tenantId: currentItem.tenant_id,
        userId: user_id,
        action: 'update',
        resourceType: 'item',
        resourceId: id,
        beforeValue: currentItem,
        afterValue: data
      })
    }
    
    return apiResponse(true, { item: data })
  } catch (error) {
    console.error('Update item error:', error)
    return apiResponse(false, null, 'Failed to update item', 500)
  }
}

// DELETE /api/menu/items/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    
    if (!isValidUUID(id)) {
      return apiResponse(false, null, 'Invalid item ID format', 400)
    }
    
    // Get current item for audit
    const { data: currentItem, error: fetchError } = await supabaseAdmin
      .from('items')
      .select('*')
      .eq('id', id)
      .single()
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return apiResponse(false, null, 'Item not found', 404)
      }
      throw fetchError
    }
    
    // Soft delete - set status to inactive
    const { error } = await supabaseAdmin
      .from('items')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', id)
    
    if (error) throw error
    
    // Audit log
    if (userId) {
      await createAuditLog({
        tenantId: currentItem.tenant_id,
        userId: userId,
        action: 'delete',
        resourceType: 'item',
        resourceId: id,
        beforeValue: currentItem
      })
    }
    
    return apiResponse(true, { message: 'Item deleted successfully' })
  } catch (error) {
    console.error('Delete item error:', error)
    return apiResponse(false, null, 'Failed to delete item', 500)
  }
}
