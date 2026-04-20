'use client'
// app/dashboard/page.tsx
// ═══════════════════════════════════════════════════
// Dashboard principal — KPIs, alertes, actions rapides
// ═══════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import {
  TrendingUp, Clock, AlertCircle, CheckCircle2,
  Plus, FileText, Bot, CreditCard, RefreshCw
} from 'lucide-react'
import { fmt, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface AppState {
  missions:    { statut: string; titre: string; client: string; dateFin: string }[]
  factures:    { statut: string; montant: number; date: string; client: string; numero: string }[]
  rappels:     { done: boolean; date: string; texte: string; priorite: string }[]
  plan:        string
  cv:          { nom: string; tjm: string }
  commercial:  { deals: { statut: string; montant: number }[] }
}

export default function DashboardPage() {
  const [state, setState] = useState<AppState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('datasphere_os_v1')
      if (raw) setState(JSON.parse(raw))
    } catch {}
    setLoading(false)
  }, [])

  if (loading) return <DashboardSkeleton />
  if (!state)  return <EmptyDashboard />

  const year = new Date().getFullYear()
  const today = new Date().toISOString().slice(0, 10)

  const missionsEnCours = state.missions?.filter(m => m.statut === 'En cours') || []
  const factures        = state.factures || []
  const rappels         = state.rappels  || []

  const caYtd    = factures.filter(f => f.statut === 'Payée' && (f.date||'').startsWith(String(year)))
                           .reduce((s, f) => s + (Number(f.montant)||0), 0)
  const overdue  = factures.filter(f =>
    f.statut !== 'Payée' &&
    ((Date.now() - new Date(f.date||Date.now()).getTime()) / 86400000) > 30
  )
  const todayRappels = rappels.filter(r => !r.done && (r.date||'') <= today)
  const tjm          = Number(state.cv?.tjm) || 0
  const objective    = 120000 // objectif annuel par défaut
  const caPct        = Math.min(100, Math.round(caYtd / objective * 100))

  const dealsGagnes = (state.commercial?.deals || []).filter(d => d.statut === 'Gagné')
    .reduce((s, d) => s + (Number(d.montant)||0), 0)

  return (
    <div className="space-y-6">

      {/* Alertes */}
      {overdue.length > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-3
          bg-ds-rose/8 border border-ds-rose/25 rounded-ds animate-fade-up">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={16} className="text-ds-rose flex-shrink-0" />
            <span className="text-sm text-ds-text">
              <strong>{overdue.length}</strong> facture{overdue.length > 1 ? 's' : ''} impayée{overdue.length > 1 ? 's' : ''} depuis plus de 30 jours
            </span>
          </div>
          <a href="/facturation"
            className="text-xs text-ds-rose font-semibold hover:underline whitespace-nowrap">
            Voir →
          </a>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          icon={<TrendingUp size={18} />}
          label="CA cette année"
          value={fmt(caYtd) + '€'}
          sub={`Objectif ${fmt(objective)}€`}
          color="text-ds-teal"
          barPct={caPct}
          barColor="bg-ds-teal"
          delay="ci-1"
        />
        <KPICard
          icon={<CheckCircle2 size={18} />}
          label="Missions actives"
          value={String(missionsEnCours.length)}
          sub={missionsEnCours.map(m => m.client).slice(0,2).join(', ') || '—'}
          color="text-ds-blue2"
          barPct={Math.min(100, missionsEnCours.length * 33)}
          barColor="bg-ds-blue"
          delay="ci-2"
        />
        <KPICard
          icon={<Clock size={18} />}
          label="Rappels aujourd'hui"
          value={String(todayRappels.length)}
          sub={todayRappels.length ? todayRappels[0].texte.slice(0, 30) + '…' : 'Aucun rappel'}
          color={todayRappels.length ? 'text-ds-amber' : 'text-ds-text3'}
          barPct={Math.min(100, todayRappels.length * 25)}
          barColor="bg-ds-amber"
          delay="ci-3"
        />
        <KPICard
          icon={<CreditCard size={18} />}
          label="TJM actuel"
          value={tjm ? fmt(tjm) + '€/j' : '—'}
          sub={tjm ? `≈ ${fmt(tjm * 22)}€/mois` : 'À configurer dans le CV'}
          color="text-ds-violet2"
          barPct={Math.min(100, tjm / 12)}
          barColor="bg-ds-violet"
          delay="ci-4"
        />
      </div>

      {/* Corps — 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Missions en cours */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-ds-text flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-ds-blue
                shadow-[0_0_6px_rgba(91,127,255,.6)]" />
              Missions en cours
            </h2>
            <a href="/missions"
              className="text-xs text-ds-text3 hover:text-ds-text2 transition-colors">
              Tout voir →
            </a>
          </div>

          {missionsEnCours.length === 0 ? (
            <div className="text-center py-10 text-ds-text3">
              <p className="text-sm mb-3">Aucune mission en cours</p>
              <a href="/missions"
                className="inline-flex items-center gap-1.5 text-xs text-ds-blue2
                  hover:underline">
                <Plus size={12} /> Créer une mission
              </a>
            </div>
          ) : (
            <div className="space-y-1">
              {missionsEnCours.map((m, i) => (
                <div key={i}
                  className="flex items-center justify-between py-2.5 px-3
                    rounded-ds-sm hover:bg-ds-bg3 transition-colors group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-ds-sm bg-ds-blue/10
                      flex items-center justify-center text-ds-blue2 flex-shrink-0">
                      <CheckCircle2 size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-ds-text truncate">
                        {m.titre || m.client}
                      </div>
                      <div className="text-[11px] text-ds-text3">{m.client}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[10px] text-ds-text3">
                      {m.dateFin ? `Jusqu'au ${formatDate(m.dateFin)}` : 'En cours'}
                    </div>
                    <div className="inline-flex items-center gap-1 text-[10px] font-semibold
                      px-2 py-0.5 rounded-full bg-ds-green/10 text-ds-green mt-0.5">
                      <span className="w-1 h-1 rounded-full bg-ds-green" />
                      Actif
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel droit */}
        <div className="space-y-4">

          {/* Rappels du jour */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-ds-text">⏰ Rappels du jour</h3>
              <a href="/rappels" className="text-xs text-ds-text3 hover:text-ds-text2">Voir tout →</a>
            </div>
            {todayRappels.length === 0 ? (
              <p className="text-xs text-ds-text3 text-center py-4">
                Aucun rappel pour aujourd'hui ✅
              </p>
            ) : (
              <div className="space-y-2">
                {todayRappels.slice(0, 3).map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className={cn(
                      'w-1 h-1 rounded-full mt-1.5 flex-shrink-0',
                      r.priorite === 'haute' ? 'bg-ds-rose' : 'bg-ds-amber'
                    )} />
                    <span className="text-xs text-ds-text2 line-clamp-2">{r.texte}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions rapides */}
          <div className="card">
            <h3 className="text-sm font-bold text-ds-text mb-3">⚡ Actions rapides</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: <Plus size={14} />,      label: 'Mission',  href: '/missions',    color: 'text-ds-blue2',   bg: 'bg-ds-blue/8   border-ds-blue/20' },
                { icon: <FileText size={14} />,  label: 'Facture',  href: '/facturation', color: 'text-ds-teal',    bg: 'bg-ds-teal/8   border-ds-teal/20' },
                { icon: <Bot size={14} />,       label: 'Agent IA', href: '/agent',       color: 'text-ds-violet2', bg: 'bg-ds-violet/8 border-ds-violet/20' },
                { icon: <RefreshCw size={14} />, label: 'Offres',   href: '/offres',      color: 'text-ds-amber',   bg: 'bg-ds-amber/8  border-ds-amber/20' },
              ].map(a => (
                <a key={a.label} href={a.href}
                  className={cn(
                    'flex flex-col items-center gap-1.5 py-3 rounded-ds-sm border',
                    'text-center transition-all hover:-translate-y-0.5 hover:shadow-md',
                    a.bg
                  )}>
                  <span className={a.color}>{a.icon}</span>
                  <span className={cn('text-[11px] font-semibold', a.color)}>{a.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Composants ──────────────────────────────────────────
function KPICard({ icon, label, value, sub, color, barPct, barColor, delay }: {
  icon: React.ReactNode; label: string; value: string; sub: string
  color: string; barPct: number; barColor: string; delay?: string
}) {
  return (
    <div className={cn('kpi-card', delay)}>
      <div className="flex items-start justify-between mb-2">
        <div className="text-[10px] font-bold uppercase tracking-[.07em] text-ds-text3">
          {label}
        </div>
        <span className={cn('opacity-20', color)}>{icon}</span>
      </div>
      <div className={cn('text-[22px] font-extrabold tracking-tight leading-none mb-1', color)}>
        {value}
      </div>
      <div className="text-[11px] text-ds-text3 mb-3 truncate">{sub}</div>
      <div className="h-1 bg-ds-bg4 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', barColor)}
          style={{ width: `${barPct}%` }}
        />
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-ds bg-ds-bg2 border border-ds-border" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 h-64 rounded-ds bg-ds-bg2 border border-ds-border" />
        <div className="space-y-4">
          <div className="h-28 rounded-ds bg-ds-bg2 border border-ds-border" />
          <div className="h-28 rounded-ds bg-ds-bg2 border border-ds-border" />
        </div>
      </div>
    </div>
  )
}

function EmptyDashboard() {
  return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">📊</div>
      <h1 className="text-xl font-bold text-ds-text mb-2">Bienvenue sur DataSphere OS</h1>
      <p className="text-sm text-ds-text3 mb-6">Commencez par créer votre première mission.</p>
      <a href="/missions"
        className="inline-flex items-center gap-2 px-5 py-2.5
          bg-gradient-to-r from-ds-blue to-ds-violet rounded-ds-sm
          text-white text-sm font-semibold shadow-[0_4px_16px_rgba(91,127,255,.3)]
          hover:opacity-90 transition-opacity">
        <Plus size={16} /> Créer une mission
      </a>
    </div>
  )
}
