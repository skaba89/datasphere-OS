import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY   || 'none1']: 'pro',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY    || 'none2']: 'pro',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY_MONTHLY|| 'none3']: 'agency',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_EARLYBIRD     || 'none4']: 'earlybird',
}

async function updateUserPlan(customerId: string, plan: string, subscriptionId?: string, subscriptionEnd?: number) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) return

  await supabase.from('user_profiles').update({
    plan,
    stripe_subscription_id:  subscriptionId || null,
    subscription_expires_at: subscriptionEnd ? new Date(subscriptionEnd * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq('user_id', profile.user_id)
}

export async function POST(req: NextRequest) {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature') || ''

  if (!signature) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET || '')
  } catch {
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session    = event.data.object as Stripe.Checkout.Session
      const customerId = session.customer as string
      const priceId    = ''
      const plan       = PRICE_TO_PLAN[priceId] || 'pro'
      await updateUserPlan(customerId, plan, session.subscription as string)
    }

    if (event.type === 'customer.subscription.updated') {
      const sub        = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string
      const priceId    = sub.items.data[0]?.price?.id || ''
      const plan       = PRICE_TO_PLAN[priceId] || 'pro'
      if (['active', 'trialing'].includes(sub.status)) {
        await updateUserPlan(customerId, plan, sub.id, sub.current_period_end)
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub        = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string
      await updateUserPlan(customerId, 'free')
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[Stripe Webhook]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Stripe webhook actif' })
}
