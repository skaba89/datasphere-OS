// lib/supabase.ts
// ═══════════════════════════════════════════════════
// Clients Supabase — client, serveur, admin
// ═══════════════════════════════════════════════════
import { createBrowserClient } from '@supabase/ssr'
import { createClient }        from '@supabase/supabase-js'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ── Client navigateur (composants client) ────────────
let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowser() {
  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)
  }
  return browserClient
}

// ── Client admin (API routes serveur uniquement) ─────
export function getSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante')
  return createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

// ── Helpers ──────────────────────────────────────────

/** Récupère le profil complet de l'utilisateur connecté */
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

/** Met à jour le plan d'un utilisateur */
export async function updateUserPlan(
  userId: string,
  plan: string,
  stripeCustomerId?: string,
  subscriptionId?: string,
  expiresAt?: string
) {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('user_profiles')
    .update({
      plan,
      ...(stripeCustomerId && { stripe_customer_id: stripeCustomerId }),
      ...(subscriptionId   && { stripe_subscription_id: subscriptionId }),
      ...(expiresAt        && { subscription_expires_at: expiresAt }),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
  if (error) throw error
}

/** Sauvegarde le state JSON de l'utilisateur */
export async function saveUserData(userId: string, data: Record<string, unknown>) {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('user_data')
    .upsert({ user_id: userId, data, updated_at: new Date().toISOString() },
             { onConflict: 'user_id' })
  if (error) throw error
}

/** Charge le state JSON de l'utilisateur */
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
