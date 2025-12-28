import { supabaseAdmin, apiResponse, createAuditLog } from '@/lib/supabase-admin'

// POST /api/auth/login
// Login with email/password or PIN
export async function POST(request) {
  try {
    const body = await request.json()
    const { email, pin, username } = body
    
    if (!email && !pin && !username) {
      return apiResponse(false, null, 'Email, username, or PIN is required', 400)
    }
    
    let query = supabaseAdmin
      .from('users')
      .select(`
        *,
        branches:branch_id (
          id, name, code, address, phone, status
        ),
        tenants:tenant_id (
          id, name, slug, currency, country, tax_rate, service_charge_rate, status
        )
      `)
      .eq('status', 'active')
    
    // Login by PIN
    if (pin) {
      query = query.eq('pin', pin)
      
      // If username is also provided, filter by it
      if (username) {
        const { data: users, error } = await query
        
        if (error) throw error
        
        // Find user by username match (email prefix or name)
        const user = users?.find(u => 
          u.email?.split('@')[0].toLowerCase() === username.toLowerCase() ||
          u.name?.toLowerCase() === username.toLowerCase() ||
          u.email?.toLowerCase() === username.toLowerCase()
        )
        
        if (!user) {
          return apiResponse(false, null, 'Invalid username or PIN', 401)
        }
        
        // Update last login
        await supabaseAdmin
          .from('users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', user.id)
        
        // Audit log
        await createAuditLog({
          tenantId: user.tenant_id,
          userId: user.id,
          action: 'login',
          resourceType: 'user',
          resourceId: user.id
        })
        
        return apiResponse(true, {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenant_id: user.tenant_id,
            branch_id: user.branch_id,
            tenant: user.tenants,
            branch: user.branches
          }
        })
      }
    }
    
    // Login by email
    if (email) {
      query = query.eq('email', email.toLowerCase())
    }
    
    const { data: users, error } = await query
    
    if (error) throw error
    
    if (!users || users.length === 0) {
      return apiResponse(false, null, 'Invalid credentials', 401)
    }
    
    const user = users[0]
    
    // Update last login
    await supabaseAdmin
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id)
    
    // Audit log
    await createAuditLog({
      tenantId: user.tenant_id,
      userId: user.id,
      action: 'login',
      resourceType: 'user',
      resourceId: user.id
    })
    
    return apiResponse(true, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
        branch_id: user.branch_id,
        tenant: user.tenants,
        branch: user.branches
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return apiResponse(false, null, 'Authentication failed', 500)
  }
}
