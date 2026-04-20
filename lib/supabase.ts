import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client navigateur (singleton)
let _browserClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowser() {
  if (!_browserClient) {
    _browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)
  }
  return _browserClient
}

// Client admin (API routes uniquement)
export function getSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante')
  return createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export async function getUserProfile(userId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error) throw error
  return data
}

export async function updateUserPlan(
  userId: string,
  plan: string,
  stripeCustomerId?: string,
  subscriptionId?: string,
  expiresAt?: string
) {
  const supabase = getSupabaseAdmin()
  const updates: Record<string, unknown> = {
    plan,
    updated_at: new Date().toISOString(),
  }
  if (stripeCustomerId) updates.stripe_customer_id = stripeCustomerId
  if (subscriptionId)   updates.stripe_subscription_id = subscriptionId
  if (expiresAt)        updates.subscription_expires_at = expiresAt

  const { error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('user_id', userId)
  if (error) throw error
}

export async function saveUserData(userId: string, data: Record<string, unknown>) {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('user_data')
    .upsert({ user_id: userId, data, updated_at: new Date().toISOString() },
             { onConflict: 'user_id' })
  if (error) throw error
}

export async function loadUserData(userId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('user_data')
    .select('data')
    .eq('user_id', userId)
    .single()
  if (error) return null
  return data?.data ?? null
}
