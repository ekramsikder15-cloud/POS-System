import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client with service role key
// Use this for API routes that need full database access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables for server. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Create a fresh Supabase client (use for avoiding caching issues)
export const createSupabaseAdmin = () => {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    }
  })
}

// Helper to generate order number
export const generateOrderNumber = async (branchId) => {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  
  // Get today's order count for this branch
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
  const { count } = await supabaseAdmin
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('branch_id', branchId)
    .gte('created_at', startOfDay)
  
  const seq = String((count || 0) + 1).padStart(3, '0')
  return `ORD-${dateStr}-${seq}`
}

// Helper to create audit log
export const createAuditLog = async ({
  tenantId,
  userId,
  action,
  resourceType,
  resourceId,
  beforeValue = null,
  afterValue = null,
  ipAddress = null,
  userAgent = null
}) => {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: tenantId,
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      before_value: beforeValue,
      after_value: afterValue,
      ip_address: ipAddress,
      user_agent: userAgent
    })
  } catch (error) {
    console.error('Audit log error:', error)
  }
}

// Standard API response helper
export const apiResponse = (success, data = null, error = null, status = 200) => {
  return Response.json(
    { success, ...(data && { data }), ...(error && { error }) },
    { status }
  )
}

// Validate UUID
export const isValidUUID = (str) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}
