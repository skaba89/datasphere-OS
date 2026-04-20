'use client'
// app/pricing/page.tsx
import { useState } from 'react'
import { Check, X, Zap, Building2, Leaf, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

const PLANS = [
  {
    id:       'free',
    icon:     Leaf,
    name:     'Free',
    price:    0,
    period:   'pour toujours',
    color:    'text-ds-text3',
    gradient: 'from-ds-bg3 to-ds-bg4',
    border:   'border-ds-border',
    features: [
      'Dashboard KPIs complet',
      '3 missions maximum',
      '5 factures maximum',
      '10 contacts CRM',
      'Export CSV/FEC',
      'Agenda interactif',
    ],
    locked: [
      'Agent IA autonome',
      'Offres live marché',
      'Facturation illimitée',
      'Email tracking',
      'Export PDF professionnel',
      'Sync multi-device (cloud)',
    ],
    cta:       'Plan actuel',
    ctaAction: null,
    badge:     null,
  },
  {
    id:        'pro',
    icon:      Zap,
    name:      'Pro',
    price:     29,
    period:    '/mois',
    color:     'text-ds-blue2',
    gradient:  'from-ds-blue/20 to-ds-violet/10',
    border:    'border-ds-blue/40',
    features: [
      'Tout le plan Free',
      'Missions & factures illimitées',
      'Contacts CRM illimités',
      'Agent IA autonome illimité',
      'Offres live (8 sources)',
      'Email tracking ouvertures',
      'Export PDF professionnel',
      'Sync multi-device (Supabase)',
      'Contrats & devis IA',
      'Support prioritaire 24h',
    ],
    locked:    [],
    cta:       'Commencer l\'essai 14j',
    ctaAction: process.env.NEXT_PUBLIC_STRIPE_LINK_PRO_MONTHLY || '',
    badge:     'Populaire',
    badgeColor:'bg-ds-blue text-white',
  },
  {
    id:        'agency',
    icon:      Building2,
    name:      'Agency',
    price:     79,
    period:    '/mois',
    color:     'text-ds-violet2',
    gradient:  'from-ds-violet/20 to-ds-purple/10',
    border:    'border-ds-violet/30',
    features: [
      'Tout le plan Pro',
      'Multi-profils (5 CV freelances)',
      'White-label (logo custom)',
      'Accès API DataSphere',
      'Rapports automatisés hebdo',
      'Onboarding dédié',
      'SLA support 4h',
    ],
    locked:    [],
    cta:       'Contacter pour démo',
    ctaAction: process.env.NEXT_PUBLIC_STRIPE_LINK_AGENCY || '',
    badge:     'Équipe',
    badgeColor:'bg-ds-violet text-white',
  },
]

export default function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const yearlyDiscount = 0.17 // -17% annuel = 2 mois offerts

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-ds-text mb-3">
          Choisir votre plan
        </h1>
        <p className="text-ds-text3 text-base mb-6">
          Commencez gratuitement, passez au Pro quand vous êtes prêt.
          <br />Annulable à tout moment.
        </p>

        {/* Toggle mensuel / annuel */}
        <div className="inline-flex items-center gap-1 p-1 bg-ds-bg2
          border border-ds-border rounded-full">
          {(['monthly', 'yearly'] as const).map(b => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                billing === b
                  ? 'bg-ds-blue text-white shadow-sm'
                  : 'text-ds-text3 hover:text-ds-text2'
              )}
            >
              {b === 'monthly' ? 'Mensuel' : 'Annuel'}
              {b === 'yearly' && (
                <span className="ml-1.5 text-[10px] font-bold
                  bg-ds-green/20 text-ds-green px-1.5 py-0.5 rounded-full">
                  -17%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {PLANS.map(plan => {
          const Icon          = plan.icon
          const displayPrice  = billing === 'yearly' && plan.price > 0
            ? Math.round(plan.price * (1 - yearlyDiscount))
            : plan.price

          return (
            <div
              key={plan.id}
              className={cn(
                'relative flex flex-col rounded-ds-xl border p-6 transition-all',
                `bg-gradient-to-b ${plan.gradient}`,
                plan.border,
                plan.badge && 'shadow-[0_8px_32px_rgba(91,127,255,.2)] scale-[1.02]'
              )}
            >
              {/* Badge */}
              {plan.badge && (
                <div className={cn(
                  'absolute -top-3 left-1/2 -translate-x-1/2',
                  'text-[10px] font-bold px-3 py-1 rounded-full',
                  plan.badgeColor
                )}>
                  {plan.badge}
                </div>
              )}

              {/* Icon + Nom */}
              <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                  'w-9 h-9 rounded-ds-sm flex items-center justify-center',
                  'bg-ds-bg3 border border-ds-border'
                )}>
                  <Icon size={18} className={plan.color} />
                </div>
                <div>
                  <div className="text-base font-bold text-ds-text">{plan.name}</div>
                </div>
              </div>

              {/* Prix */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className={cn('text-4xl font-extrabold tracking-tight', plan.color)}>
                    {plan.price === 0 ? '0€' : `${displayPrice}€`}
                  </span>
                  <span className="text-sm text-ds-text3">{plan.period}</span>
                </div>
                {billing === 'yearly' && plan.price > 0 && (
                  <div className="text-[11px] text-ds-green mt-1">
                    Soit {Math.round(displayPrice * 12)}€/an — 2 mois offerts
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-ds-text2">
                    <Check size={14} className={cn('flex-shrink-0 mt-0.5', plan.color)} />
                    {f}
                  </li>
                ))}
                {plan.locked.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-ds-text3/40">
                    <X size={14} className="flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {plan.ctaAction ? (
                <a
                  href={plan.ctaAction + (plan.ctaAction.includes('?') ? '&' : '?') +
                    `prefilled_email=${encodeURIComponent('')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'w-full py-2.5 rounded-ds-sm text-sm font-semibold text-center',
                    'transition-all hover:opacity-90 active:scale-[.98]',
                    plan.id === 'pro'
                      ? 'bg-gradient-to-r from-ds-blue to-ds-violet text-white shadow-[0_4px_16px_rgba(91,127,255,.35)]'
                      : 'bg-ds-violet/80 text-white'
                  )}
                >
                  {plan.cta}
                </a>
              ) : (
                <div className="w-full py-2.5 rounded-ds-sm text-sm font-semibold
                  text-center bg-ds-bg3 text-ds-text3 border border-ds-border">
                  Plan actuel
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Early Bird */}
      <div className="card border-ds-amber/30 bg-gradient-to-r
        from-ds-amber/5 to-ds-rose/5 text-center py-8">
        <div className="text-3xl mb-3">⭐</div>
        <h3 className="text-lg font-bold text-ds-text mb-1">
          Early Bird — Accès Pro à vie
        </h3>
        <p className="text-sm text-ds-text3 mb-1">
          <strong className="text-ds-amber text-xl">199€</strong> une seule fois
        </p>
        <p className="text-xs text-ds-text3 mb-5">
          Offre limitée aux 100 premiers utilisateurs · Toutes les futures fonctionnalités incluses
        </p>
        {process.env.NEXT_PUBLIC_STRIPE_LINK_EARLYBIRD ? (
          <a
            href={process.env.NEXT_PUBLIC_STRIPE_LINK_EARLYBIRD}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-ds-sm
              bg-gradient-to-r from-ds-amber to-ds-rose text-white
              text-sm font-bold hover:opacity-90 transition-opacity"
          >
            <Star size={16} /> Saisir l'offre Early Bird
          </a>
        ) : (
          <p className="text-xs text-ds-text3">
            Configurez le lien Stripe dans <code className="text-ds-blue2">.env.local</code>
          </p>
        )}
      </div>

      {/* Garanties */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: '🔒', label: 'Paiement sécurisé', sub: 'via Stripe' },
          { icon: '🔄', label: 'Annulable', sub: 'à tout moment' },
          { icon: '💰', label: 'Remboursé', sub: 'sous 30 jours' },
          { icon: '🇪🇺', label: 'Données EU', sub: 'RGPD conforme' },
        ].map(g => (
          <div key={g.label} className="text-center">
            <div className="text-2xl mb-1">{g.icon}</div>
            <div className="text-xs font-semibold text-ds-text">{g.label}</div>
            <div className="text-[10px] text-ds-text3">{g.sub}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
