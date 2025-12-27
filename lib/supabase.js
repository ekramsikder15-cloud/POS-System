import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Constants from environment
export const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID
export const BRANCH_ID = process.env.NEXT_PUBLIC_BRANCH_ID
