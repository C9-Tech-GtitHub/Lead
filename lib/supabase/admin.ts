import { createClient } from '@supabase/supabase-js'

/**
 * Admin Supabase Client
 *
 * This client uses the service role key and bypasses Row Level Security (RLS).
 * ONLY use this for trusted server-side operations like background jobs.
 *
 * NEVER expose this client to the browser or use it for user-initiated actions.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  }

  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
