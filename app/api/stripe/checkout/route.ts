import { NextRequest, NextResponse } from 'next/server'
import { STRIPE_PLANS, type PlanKey, createCheckoutSession } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { planKey, email } = body as { planKey: PlanKey; email?: string }

    if (!planKey || !STRIPE_PLANS[planKey]) {
      return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
    }

    const plan = STRIPE_PLANS[planKey]

    if (plan.paymentLink && plan.paymentLink.includes('buy.stripe.com')) {
      const url = email
        ? `${plan.paymentLink}?prefilled_email=${encodeURIComponent(email)}`
        : plan.paymentLink
      return NextResponse.json({ url, type: 'payment_link' })
    }

    if (!plan.priceId) {
      return NextResponse.json({
        error: 'Prix non configuré. Ajoutez les Price IDs Stripe dans les variables d\'environnement.'
      }, { status: 400 })
    }

    const appUrl     = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const successUrl = `${appUrl}/dashboard?payment=success&plan=${plan.plan}`
    const cancelUrl  = `${appUrl}/pricing?payment=cancelled`

    const session = await createCheckoutSession({
      priceId:       plan.priceId,
      customerEmail: email,
      userId:        'anonymous',
      successUrl,
      cancelUrl,
    })

    return NextResponse.json({ url: session.url, type: 'checkout_session' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
