// app/api/stripe/webhook/route.ts
// ═══════════════════════════════════════════════════
// Webhook Stripe — Activation automatique des plans
// Configure dans le Dashboard Stripe :
// → Developers → Webhooks → Add endpoint
// URL: https://votre-domaine.com/api/stripe/webhook
// Events: checkout.session.completed, customer.subscription.updated,
//         customer.subscription.deleted, invoice.payment_failed
// ═══════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Mapping Price ID → Plan
const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY  || '']: 'pro',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY   || '']: 'pro',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY_MONTHLY||'']: 'agency',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_EARLYBIRD    || '']: 'earlybird',
}

async function updateUserPlan(
  customerId: string,
  plan: string,
  subscriptionId?: string,
  subscriptionEnd?: number
) {
  // Trouver l'utilisateur par customer_id Stripe
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) {
    console.error('[Stripe Webhook] Utilisateur non trouvé pour customer:', customerId)
    return
  }

  await supabase
    .from('user_profiles')
    .update({
      plan,
      stripe_subscription_id:  subscriptionId,
      subscription_expires_at: subscriptionEnd
        ? new Date(subscriptionEnd * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', profile.user_id)

  console.log(`[Stripe Webhook] Plan mis à jour: ${customerId} → ${plan}`)
}

export async function POST(req: NextRequest) {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('[Stripe Webhook] Signature invalide:', err)
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  try {
    switch (event.type) {

      // ── Paiement unique réussi (Payment Link ou Checkout) ──
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const customerId  = session.customer as string
        const priceId     = session.line_items?.data[0]?.price?.id || ''
        const plan        = PRICE_TO_PLAN[priceId] || 'pro'
        const subId       = session.subscription as string | undefined

        // Stocker le customer_id si pas encore fait
        if (session.customer_email) {
          const { data: user } = await supabase.auth.admin.getUserByEmail(
            session.customer_email
          )
          if (user?.user) {
            await supabase
              .from('user_profiles')
              .upsert({
                user_id:            user.user.id,
                stripe_customer_id: customerId,
                plan,
              }, { onConflict: 'user_id' })
          }
        } else {
          await updateUserPlan(customerId, plan, subId)
        }
        break
      }

      // ── Abonnement mis à jour ──
      case 'customer.subscription.updated': {
        const sub        = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string
        const priceId    = sub.items.data[0]?.price?.id || ''
        const plan       = PRICE_TO_PLAN[priceId] || 'pro'
        const status     = sub.status

        if (status === 'active' || status === 'trialing') {
          await updateUserPlan(customerId, plan, sub.id, sub.current_period_end)
        } else if (status === 'past_due' || status === 'unpaid') {
          // Garder le plan mais notifier
          console.warn('[Stripe] Paiement en retard:', customerId)
        }
        break
      }

      // ── Abonnement annulé ──
      case 'customer.subscription.deleted': {
        const sub        = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string
        await updateUserPlan(customerId, 'free', undefined, undefined)
        break
      }

      // ── Paiement échoué ──
      case 'invoice.payment_failed': {
        const invoice    = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        console.warn('[Stripe] Paiement échoué pour:', customerId)
        // Optionnel : envoyer un email de relance via Resend
        break
      }
    }

    return NextResponse.json({ received: true })

  } catch (err) {
    console.error('[Stripe Webhook] Erreur traitement:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// GET pour vérifier que le webhook est en place
export async function GET() {
  return NextResponse.json({
    status: 'Stripe webhook actif',
    events: ['checkout.session.completed', 'customer.subscription.updated',
             'customer.subscription.deleted', 'invoice.payment_failed'],
  })
}
