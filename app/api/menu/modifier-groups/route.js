import { supabaseAdmin, apiResponse, isValidUUID, createAuditLog } from '@/lib/supabase-admin'
import { v4 as uuidv4 } from 'uuid'

// GET /api/menu/modifier-groups?tenant_id={id}&status={status}
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant_id')
    const status = searchParams.get('status')
    const includeModifiers = searchParams.get('include_modifiers') !== 'false'
    
    if (!tenantId) {
      return apiResponse(false, null, 'tenant_id is required', 400)
    }
    
    if (!isValidUUID(tenantId)) {
      return apiResponse(false, null, 'Invalid tenant_id format', 400)
    }
    
    let query = supabaseAdmin
      .from('modifier_groups')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true })
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data: groups, error } = await query
    
    if (error) throw error
    
    // Include modifiers by default
    if (includeModifiers && groups && groups.length > 0) {
      const groupIds = groups.map(g => g.id)
      
      const { data: modifiers } = await supabaseAdmin
        .from('modifiers')
        .select('*')
        .in('modifier_group_id', groupIds)
        .order('sort_order', { ascending: true })
      
      const groupsWithModifiers = groups.map(group => ({
        ...group,
        modifiers: modifiers?.filter(m => m.modifier_group_id === group.id) || []
      }))
      
      return apiResponse(true, { modifier_groups: groupsWithModifiers })
    }
    
    return apiResponse(true, { modifier_groups: groups })
  } catch (error) {
    console.error('Get modifier groups error:', error)
    return apiResponse(false, null, 'Failed to fetch modifier groups', 500)
  }
}

// POST /api/menu/modifier-groups
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      tenant_id, name_en, name_ar, min_select, max_select, required,
      sort_order, status, modifiers, user_id
    } = body
    
    if (!tenant_id || !name_en) {
      return apiResponse(false, null, 'tenant_id and name_en are required', 400)
    }
    
    const groupId = uuidv4()
    const groupData = {
      id: groupId,
      tenant_id,
      name_en,
      name_ar: name_ar || null,
      min_select: min_select || 0,
      max_select: max_select || 1,
      required: required || false,
      sort_order: sort_order || 0,
      status: status || 'active'
    }
    
    const { data, error } = await supabaseAdmin
      .from('modifier_groups')
      .insert(groupData)
      .select()
      .single()
    
    if (error) throw error
    
    // Create modifiers if provided
    let createdModifiers = []
    if (modifiers && modifiers.length > 0) {
      const modifierData = modifiers.map((m, index) => ({
        id: uuidv4(),
        modifier_group_id: groupId,
        name_en: m.name_en,
        name_ar: m.name_ar || null,
        price: parseFloat(m.price || 0),
        default_selected: m.default_selected || false,
        sort_order: index,
        status: 'active'
      }))
      
      const { data: mods } = await supabaseAdmin
        .from('modifiers')
        .insert(modifierData)
        .select()
      
      createdModifiers = mods || []
    }
    
    // Audit log
    if (user_id) {
      await createAuditLog({
        tenantId: tenant_id,
        userId: user_id,
        action: 'create',
        resourceType: 'modifier_group',
        resourceId: groupId,
        afterValue: { ...groupData, modifiers: createdModifiers }
      })
    }
    
    return apiResponse(true, { modifier_group: { ...data, modifiers: createdModifiers } }, null, 201)
  } catch (error) {
    console.error('Create modifier group error:', error)
    return apiResponse(false, null, 'Failed to create modifier group', 500)
  }
}
