// lib/stripe.ts
// ═══════════════════════════════════════════════════
// Client Stripe + helpers pour checkout et webhooks
// ═══════════════════════════════════════════════════
import Stripe from 'stripe'

// Singleton Stripe (côté serveur uniquement)
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY manquante')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-04-10',
      typescript:  true,
    })
  }
  return _stripe
}

// ── Plans et Price IDs ────────────────────────────────

export const STRIPE_PLANS = {
  pro_monthly: {
    priceId:     process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY || '',
    paymentLink: process.env.NEXT_PUBLIC_STRIPE_LINK_PRO_MONTHLY  || '',
    plan:        'pro' as const,
    name:        'Pro Mensuel',
    price:       29,
  },
  pro_yearly: {
    priceId:     process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY || '',
    paymentLink: '',
    plan:        'pro' as const,
    name:        'Pro Annuel',
    price:       290,
  },
  agency_monthly: {
    priceId:     process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY_MONTHLY || '',
    paymentLink: process.env.NEXT_PUBLIC_STRIPE_LINK_AGENCY || '',
    plan:        'agency' as const,
    name:        'Agency Mensuel',
    price:       79,
  },
  earlybird: {
    priceId:     process.env.NEXT_PUBLIC_STRIPE_PRICE_EARLYBIRD || '',
    paymentLink: process.env.NEXT_PUBLIC_STRIPE_LINK_EARLYBIRD  || '',
    plan:        'earlybird' as const,
    name:        'Early Bird',
    price:       199,
  },
} as const

export type PlanKey = keyof typeof STRIPE_PLANS

// Mapper un Price ID vers un plan
export function getPlanFromPriceId(priceId: string): string {
  const entry = Object.values(STRIPE_PLANS).find(p => p.priceId === priceId)
  return entry?.plan || 'pro'
}

// ── Créer une session Checkout ────────────────────────

export async function createCheckoutSession({
  priceId,
  customerEmail,
  userId,
  successUrl,
  cancelUrl,
}: {
  priceId:       string
  customerEmail?: string
  userId:        string
  successUrl:    string
  cancelUrl:     string
}) {
  const stripe = getStripe()

  const isOneTime = priceId === STRIPE_PLANS.earlybird.priceId

  const session = await stripe.checkout.sessions.create({
    mode:               isOneTime ? 'payment' : 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    ...(customerEmail && { customer_email: customerEmail }),
    metadata: { userId },
    success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
    cancel_url:  cancelUrl,
    // Essai gratuit 14j sur les abonnements
    ...((!isOneTime) && {
      subscription_data: {
        trial_period_days: 14,
        metadata: { userId },
      },
    }),
    allow_promotion_codes: true,
  })

  return session
}

// ── Créer/récupérer un customer Stripe ───────────────

export async function getOrCreateCustomer(email: string, userId: string): Promise<string> {
  const stripe = getStripe()

  // Chercher si le customer existe déjà
  const existing = await stripe.customers.list({ email, limit: 1 })
  if (existing.data.length > 0) {
    return existing.data[0].id
  }

  // Créer un nouveau customer
  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  })
  return customer.id
}

// ── Vérifier la signature du webhook ─────────────────

export function constructWebhookEvent(
  payload:   string | Buffer,
  signature: string
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET manquante')
  return getStripe().webhooks.constructEvent(payload, signature, secret)
}
