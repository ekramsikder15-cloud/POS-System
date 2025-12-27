import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Note: Tenant and Branch IDs are now loaded from user session
// The POS system supports multiple tenants - each user's tenant_id and branch_id
// come from their login session stored in localStorage
