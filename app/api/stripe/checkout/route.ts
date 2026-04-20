// app/api/stripe/checkout/route.ts
// ═══════════════════════════════════════════════════
// Crée une session Stripe Checkout
// POST { planKey, email } → { url }
// ═══════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient }        from '@supabase/ssr'
import { createCheckoutSession, STRIPE_PLANS, type PlanKey } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { planKey, email } = body as { planKey: PlanKey; email?: string }

    if (!planKey || !STRIPE_PLANS[planKey]) {
      return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
    }

    const plan = STRIPE_PLANS[planKey]

    // Si un Payment Link est configuré, rediriger directement
    if (plan.paymentLink && plan.paymentLink.includes('buy.stripe.com')) {
      const url = email
        ? `${plan.paymentLink}?prefilled_email=${encodeURIComponent(email)}`
        : plan.paymentLink
      return NextResponse.json({ url, type: 'payment_link' })
    }

    // Sinon créer une session Checkout (nécessite un Price ID)
    if (!plan.priceId) {
      return NextResponse.json({
        error: 'Prix non configuré. Ajoutez STRIPE_PRICE_* dans les variables d\'environnement.'
      }, { status: 400 })
    }

    // Récupérer l'utilisateur connecté
    let userId = 'anonymous'
    let userEmail = email || ''

    try {
      const response = NextResponse.next()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return req.cookies.getAll() },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, options)
              )
            },
          },
        }
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId    = user.id
        userEmail = user.email || userEmail
      }
    } catch {}

    const appUrl     = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const successUrl = `${appUrl}/dashboard?payment=success&plan=${plan.plan}`
    const cancelUrl  = `${appUrl}/pricing?payment=cancelled`

    const session = await createCheckoutSession({
      priceId:       plan.priceId,
      customerEmail: userEmail || undefined,
      userId,
      successUrl,
      cancelUrl,
    })

    return NextResponse.json({ url: session.url, type: 'checkout_session' })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur'
    console.error('[Stripe Checkout] Erreur:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
