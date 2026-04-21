'use client'
import { useEffect, useState } from 'react'
import { TrendingUp, Clock, AlertCircle, CheckCircle2, Plus, FileText, Bot, Search, ArrowRight, Zap } from 'lucide-react'
import { fmt, formatDate, cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface AppState {
  missions:   { statut: string; titre: string; client: string; fin?: string }[]
  factures:   { statut: string; montant: number; date: string; client: string; numero: string }[]
  rappels:    { done: boolean; date: string; texte: string; priorite: string }[]
  plan:       string
  cv:         { nom: string; tjm: string; disponibilite?: string }
  commercial: { deals: { statut: string; montant: number }[] }
  agentRuns:  { candidatures: { statut: string; score: number }[] }[]
}

function load<T>(k: string, d: T): T {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d }
}

export default function DashboardPage() {
  const [state, setState]   = useState<AppState | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiKey, setAiKey]   = useState(false)
  const router = useRouter()

  useEffect(() => {
    const raw = load<AppState | null>('datasphere_os_v1', null)
    setState(raw)
    const cfg = load<{ groqKey?: string; openrouterKey?: string; anthropicKey?: string }>('datasphere_ai_config', {})
    setAiKey(!!(cfg.groqKey || cfg.openrouterKey || cfg.anthropicKey))
    setLoading(false)
    document.title = 'Dashboard — DataSphere OS'
  }, [])

  if (loading) return <Skeleton />

  // App neuve sans données → onboarding
  if (!state) return <Onboarding onStart={() => router.push('/settings')} />

  const year  = new Date().getFullYear()
  const today = new Date().toISOString().slice(0, 10)

  const missionsEnCours = (state.missions || []).filter(m => m.statut === 'En cours')
  const factures        = state.factures || []
  const rappels         = state.rappels  || []
  const allCands        = (state.agentRuns || []).flatMap(r => r.candidatures || [])

  const caYtd    = factures.filter(f => f.statut === 'Payée' && (f.date||'').startsWith(String(year)))
                           .reduce((s, f) => s + (Number(f.montant)||0), 0)
  const overdue  = factures.filter(f =>
    f.statut !== 'Payée' && ((Date.now() - new Date(f.date||Date.now()).getTime()) / 86400000) > 30
  )
  const todayRappels = rappels.filter(r => !r.done && (r.date||'') <= today)
  const tjm          = Number(state.cv?.tjm) || 0
  const objective    = tjm ? tjm * 200 : 120000
  const caPct        = Math.min(100, Math.round(caYtd / objective * 100))
  const entretiens   = allCands.filter(c => c.statut === 'Entretien').length
  const reponses     = allCands.filter(c => ['Réponse reçue','Entretien'].includes(c.statut)).length

  return (
    <div className="space-y-5">

      {/* Alerte IA non configurée */}
      {!aiKey && (
        <div className="flex items-center justify-between gap-3 px-4 py-3
          bg-ds-violet/8 border border-ds-violet/25 rounded-ds animate-fade-up">
          <div className="flex items-center gap-2.5">
            <Zap size={16} className="text-ds-violet2 flex-shrink-0" />
            <span className="text-sm text-ds-text">
              Configurez une <strong>clé IA</strong> pour débloquer l'Agent, l'IA Studio et les analyses
            </span>
          </div>
          <button onClick={() => router.push('/settings')}
            className="flex-shrink-0 text-xs text-ds-violet2 font-semibold hover:underline flex items-center gap-1">
            Configurer <ArrowRight size={11} />
          </button>
        </div>
      )}

      {/* Alerte factures en retard */}
      {overdue.length > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-3
          bg-ds-rose/8 border border-ds-rose/25 rounded-ds">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={16} className="text-ds-rose flex-shrink-0" />
            <span className="text-sm text-ds-text">
              <strong>{overdue.length}</strong> facture{overdue.length > 1 ? 's' : ''} impayée{overdue.length > 1 ? 's' : ''} depuis +30 jours
            </span>
          </div>
          <button onClick={() => router.push('/facturation')}
            className="flex-shrink-0 text-xs text-ds-rose font-semibold hover:underline flex items-center gap-1">
            Voir <ArrowRight size={11} />
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI icon={<TrendingUp size={16}/>} label={`CA ${year}`}
          value={fmt(caYtd)+'€'} sub={`Objectif ${fmt(objective)}€`}
          pct={caPct} barColor="bg-ds-teal" color="text-ds-teal"
          onClick={() => router.push('/facturation')} />
        <KPI icon={<CheckCircle2 size={16}/>} label="Missions actives"
          value={String(missionsEnCours.length)}
          sub={missionsEnCours.slice(0,2).map(m=>m.client).join(', ')||'Aucune'}
          pct={Math.min(100, missionsEnCours.length*25)} barColor="bg-ds-blue"
          color="text-ds-blue2" onClick={() => router.push('/missions')} />
        <KPI icon={<Clock size={16}/>} label="Rappels du jour"
          value={String(todayRappels.length)}
          sub={todayRappels[0]?.texte.slice(0,28)||'Aucun rappel'}
          pct={Math.min(100, todayRappels.length*25)} barColor="bg-ds-amber"
          color={todayRappels.length ? 'text-ds-amber' : 'text-ds-text3'}
          onClick={() => router.push('/rappels')} />
        <KPI icon={<Bot size={16}/>} label="Candidatures IA"
          value={String(allCands.length)}
          sub={reponses ? `${reponses} réponse${reponses>1?'s':''} · ${entretiens} entretien${entretiens>1?'s':''}` : 'Aucune réponse'}
          pct={allCands.length ? Math.round(reponses/allCands.length*100) : 0}
          barColor="bg-ds-violet" color="text-ds-violet2"
          onClick={() => router.push('/agent')} />
      </div>

      {/* Corps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Missions */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-ds-text flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-ds-blue shadow-[0_0_6px_rgba(91,127,255,.6)]" />
              Missions en cours
            </h2>
            <button onClick={() => router.push('/missions')} className="text-xs text-ds-text3 hover:text-ds-blue2 flex items-center gap-1">
              Tout voir <ArrowRight size={10} />
            </button>
          </div>
          {missionsEnCours.length === 0 ? (
            <div className="text-center py-10 text-ds-text3">
              <p className="text-sm mb-3">Aucune mission en cours</p>
              <button onClick={() => router.push('/missions')}
                className="inline-flex items-center gap-1.5 text-xs text-ds-blue2 hover:underline">
                <Plus size={12} /> Créer une mission
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {missionsEnCours.slice(0,5).map((m, i) => (
                <button key={i} onClick={() => router.push('/missions')}
                  className="flex items-center justify-between w-full py-2.5 px-3 rounded-[8px] hover:bg-ds-bg3 transition-colors text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-[8px] bg-ds-blue/10 flex items-center justify-center text-ds-blue2 flex-shrink-0">
                      <CheckCircle2 size={13} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-ds-text truncate">{m.titre || m.client}</div>
                      <div className="text-[11px] text-ds-text3">{m.client}</div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {m.fin && <div className="text-[10px] text-ds-text3">→ {formatDate(m.fin)}</div>}
                    <div className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-ds-green/10 text-ds-green mt-0.5">
                      <span className="w-1 h-1 rounded-full bg-ds-green" />Actif
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar droite */}
        <div className="space-y-4">

          {/* Rappels */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-ds-text">⏰ Rappels du jour</h3>
              <button onClick={() => router.push('/rappels')} className="text-xs text-ds-text3 hover:text-ds-blue2">Voir tout</button>
            </div>
            {todayRappels.length === 0 ? (
              <p className="text-xs text-ds-text3 text-center py-4">Aucun rappel pour aujourd'hui ✅</p>
            ) : (
              <div className="space-y-2">
                {todayRappels.slice(0,3).map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0',
                      r.priorite === 'haute' ? 'bg-ds-rose' : 'bg-ds-amber')} />
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
                { icon: <Plus size={13}/>,       label:'Mission',   id:'missions',    bg:'bg-ds-blue/8   border-ds-blue/20',   color:'text-ds-blue2' },
                { icon: <FileText size={13}/>,   label:'Facture',   id:'facturation', bg:'bg-ds-teal/8   border-ds-teal/20',   color:'text-ds-teal' },
                { icon: <Bot size={13}/>,        label:'Agent IA',  id:'agent',       bg:'bg-ds-violet/8 border-ds-violet/20', color:'text-ds-violet2' },
                { icon: <Search size={13}/>,     label:'Offres',    id:'offres',      bg:'bg-ds-amber/8  border-ds-amber/20',  color:'text-ds-amber' },
              ].map(a => (
                <button key={a.id} onClick={() => router.push('/'+a.id)}
                  className={cn('flex flex-col items-center gap-1.5 py-3 rounded-[8px] border text-center transition-all hover:-translate-y-0.5', a.bg)}>
                  <span className={a.color}>{a.icon}</span>
                  <span className={cn('text-[10px] font-semibold', a.color)}>{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stats candidatures */}
          {allCands.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-ds-text">🤖 Agent IA</h3>
                <button onClick={() => router.push('/agent')} className="text-xs text-ds-text3 hover:text-ds-blue2">Voir</button>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Candidatures', val: allCands.length, color: 'text-ds-blue2' },
                  { label: 'Réponses',     val: reponses,        color: 'text-ds-teal' },
                  { label: 'Entretiens',   val: entretiens,      color: 'text-ds-green' },
                ].map(k => (
                  <div key={k.label} className="flex items-center justify-between">
                    <span className="text-xs text-ds-text3">{k.label}</span>
                    <span className={cn('text-xs font-bold', k.color)}>{k.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KPI({ icon, label, value, sub, color, barColor, pct, onClick }: {
  icon: React.ReactNode; label: string; value: string; sub: string
  color: string; barColor: string; pct: number; onClick?: () => void
}) {
  return (
    <button onClick={onClick} className="kpi-card text-left w-full cursor-pointer hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-2">
        <div className="text-[10px] font-bold uppercase tracking-[.07em] text-ds-text3">{label}</div>
        <span className={cn('opacity-20', color)}>{icon}</span>
      </div>
      <div className={cn('text-[22px] font-extrabold tracking-tight leading-none mb-1', color)}>{value}</div>
      <div className="text-[11px] text-ds-text3 mb-3 truncate">{sub}</div>
      <div className="h-1 bg-ds-bg4 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-700', barColor)} style={{ width:`${pct}%` }} />
      </div>
    </button>
  )
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_,i) => <div key={i} className="h-28 rounded-ds bg-ds-bg2 border border-ds-border" />)}
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

function Onboarding({ onStart }: { onStart: () => void }) {
  const router = useRouter()
  const steps = [
    { icon:'⚙️', title:'Configurer l\'IA',   desc:'Ajoutez votre clé Groq (gratuit) pour activer toutes les fonctionnalités',      cta:'Configurer', action: onStart },
    { icon:'🚀', title:'Créer une mission',  desc:'Enregistrez vos missions en cours avec TJM, dates et client',                      cta:'Missions',   action: () => router.push('/missions') },
    { icon:'🔍', title:'Explorer les offres',desc:'Parcourez des offres freelance live depuis 7 sources dont Free-Work et Indeed', cta:'Offres live', action: () => router.push('/offres') },
    { icon:'🤖', title:'Lancer l\'Agent IA', desc:'L\'IA génère des candidatures et emails personnalisés pour les meilleures offres',  cta:'Agent IA',   action: () => router.push('/agent') },
  ]
  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="text-center mb-10">
        <div className="inline-flex w-16 h-16 rounded-[20px] mb-5 bg-gradient-to-br from-ds-blue to-ds-violet items-center justify-center text-white text-3xl shadow-[0_8px_32px_rgba(91,127,255,.4)]">◈</div>
        <h1 className="text-2xl font-extrabold text-ds-text mb-2">Bienvenue sur DataSphere OS</h1>
        <p className="text-ds-text3 text-sm max-w-md mx-auto">Votre OS freelance data. Commencez par ces 4 étapes pour tirer le meilleur de la plateforme.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {steps.map((s, i) => (
          <div key={i} className="card hover:-translate-y-0.5 hover:shadow-md transition-all">
            <div className="text-3xl mb-3">{s.icon}</div>
            <div className="text-sm font-bold text-ds-text mb-1">{s.title}</div>
            <div className="text-xs text-ds-text3 mb-4 leading-relaxed">{s.desc}</div>
            <button onClick={s.action}
              className="flex items-center gap-1.5 text-xs font-semibold text-ds-blue2 hover:underline">
              {s.cta} <ArrowRight size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
