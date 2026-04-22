'use client'
import { useEffect, useState } from 'react'
import { cn, fmt, formatDate } from '@/lib/utils'

function load<T>(k: string, d: T): T {
  try { const v = typeof window !== 'undefined' && localStorage.getItem(k); return v ? JSON.parse(v) : d }
  catch { return d }
}

interface BarData { label: string; val: number; max: number; color: string }

function Bar({ label, val, max, color }: BarData) {
  const pct = max > 0 ? Math.round((val / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-[11px] text-ds-text3 truncate flex-shrink-0 text-right">{label}</div>
      <div className="flex-1 h-6 bg-ds-bg4 rounded-[6px] overflow-hidden relative">
        <div className={cn('h-full rounded-[6px] transition-all duration-700 flex items-center justify-end pr-2', color)}
          style={{ width: `${Math.max(4, pct)}%` }}>
          {pct > 15 && <span className="text-[10px] font-bold text-white">{fmt(val)}€</span>}
        </div>
        {pct <= 15 && val > 0 && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-ds-text3">{fmt(val)}€</span>
        )}
      </div>
    </div>
  )
}

export default function GraphiquesPage() {
  const [data, setData] = useState<{
    caParMois: {label:string;val:number}[];
    caParClient: {label:string;val:number}[];
    missionsParStatut: {label:string;val:number;color:string}[];
    candsParStatut: {label:string;val:number;color:string}[];
    totalCA: number; nbFactures: number; nbMissions: number; nbCands: number;
  } | null>(null)

  useEffect(() => {
    document.title = 'Graphiques — DataSphere OS'
    const s = load<Record<string, unknown>>('datasphere_os_v1', {})
    const factures = (s.factures as {statut:string;montant:number;date:string;client:string}[]) || []
    const missions = (s.missions as {statut:string;titre?:string;client?:string}[]) || []
    const cands = ((s.agentRuns as {candidatures?:{statut:string}[]}[]) || []).flatMap(r => r.candidatures || [])

    // CA par mois (12 derniers mois)
    const caMap: Record<string, number> = {}
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      caMap[key] = 0
    }
    factures.filter(f => f.statut === 'Payée').forEach(f => {
      const key = (f.date || '').slice(0, 7)
      if (key in caMap) caMap[key] += Number(f.montant) || 0
    })
    const caParMois = Object.entries(caMap).map(([k, v]) => ({
      label: new Date(k + '-01').toLocaleDateString('fr-FR', { month:'short', year:'2-digit' }),
      val: v
    }))

    // CA par client (top 8)
    const clientMap: Record<string, number> = {}
    factures.filter(f => f.statut === 'Payée').forEach(f => {
      const c = f.client || 'Autre'
      clientMap[c] = (clientMap[c] || 0) + (Number(f.montant) || 0)
    })
    const caParClient = Object.entries(clientMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([label, val]) => ({ label, val }))

    // Missions par statut
    const mStatuts: Record<string, number> = {}
    missions.forEach(m => { const s = (m.statut || 'Autre'); mStatuts[s] = (mStatuts[s] || 0) + 1 })
    const statutColors: Record<string, string> = { 'En cours':'bg-ds-green', 'Terminée':'bg-ds-text3', 'A venir':'bg-ds-blue', 'En pause':'bg-ds-amber' }
    const missionsParStatut = Object.entries(mStatuts).map(([label, val]) => ({
      label, val, color: statutColors[label] || 'bg-ds-violet'
    }))

    // Candidatures par statut
    const cStatuts: Record<string, number> = {}
    cands.forEach(c => { const s = (c.statut || 'Autre'); cStatuts[s] = (cStatuts[s] || 0) + 1 })
    const cColors: Record<string, string> = { 'Envoyée':'bg-ds-blue', 'Ouverte':'bg-ds-teal', 'Reponse recue':'bg-ds-amber', 'Entretien':'bg-ds-green', 'Refus':'bg-ds-rose' }
    const candsParStatut = Object.entries(cStatuts).map(([label, val]) => ({
      label, val, color: cColors[label] || 'bg-ds-violet'
    }))

    const totalCA = factures.filter(f => f.statut === 'Payée').reduce((s, f) => s + (Number(f.montant) || 0), 0)

    setData({ caParMois, caParClient, missionsParStatut, candsParStatut, totalCA, nbFactures: factures.length, nbMissions: missions.length, nbCands: cands.length })
  }, [])

  if (!data) return <div className="animate-pulse space-y-4">{[...Array(4)].map((_,i) => <div key={i} className="h-40 rounded-ds bg-ds-bg2 border border-ds-border" />)}</div>

  const maxCA = Math.max(...data.caParMois.map(m => m.val), 1)
  const maxClient = Math.max(...data.caParClient.map(c => c.val), 1)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-ds-text tracking-tight">📊 Graphiques</h1>
        <p className="text-sm text-ds-text3 mt-0.5">Analyse visuelle de votre activite freelance</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'CA total', value: fmt(data.totalCA) + 'EUR', color: 'text-ds-teal' },
          { label: 'Factures', value: data.nbFactures, color: 'text-ds-blue2' },
          { label: 'Missions', value: data.nbMissions, color: 'text-ds-violet2' },
          { label: 'Candidatures', value: data.nbCands, color: 'text-ds-amber' },
        ].map(k => (
          <div key={k.label} className="card py-3 px-4">
            <div className="text-[10px] font-bold uppercase tracking-wide text-ds-text3 mb-1">{k.label}</div>
            <div className={cn('text-xl font-extrabold', k.color)}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* CA par mois */}
      <div className="card">
        <h2 className="text-sm font-bold text-ds-text mb-4">Chiffre d'affaires - 12 derniers mois</h2>
        {data.caParMois.every(m => m.val === 0) ? (
          <div className="text-center py-8 text-ds-text3 text-sm">Aucune facture payee pour le moment</div>
        ) : (
          <div className="space-y-2">
            {data.caParMois.filter(m => m.val > 0 || data.caParMois.indexOf(m) >= data.caParMois.length - 3).map(m => (
              <Bar key={m.label} label={m.label} val={m.val} max={maxCA} color="bg-gradient-to-r from-ds-blue to-ds-teal" />
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* CA par client */}
        <div className="card">
          <h2 className="text-sm font-bold text-ds-text mb-4">CA par client (top 8)</h2>
          {data.caParClient.length === 0 ? (
            <div className="text-center py-6 text-ds-text3 text-sm">Aucune donnee</div>
          ) : (
            <div className="space-y-2">
              {data.caParClient.map(c => (
                <Bar key={c.label} label={c.label} val={c.val} max={maxClient} color="bg-gradient-to-r from-ds-violet to-ds-blue" />
              ))}
            </div>
          )}
        </div>

        {/* Missions + Candidatures doughnuts (simulés avec barres) */}
        <div className="space-y-5">
          <div className="card">
            <h2 className="text-sm font-bold text-ds-text mb-4">Missions par statut</h2>
            {data.missionsParStatut.length === 0 ? (
              <div className="text-center py-4 text-ds-text3 text-sm">Aucune mission</div>
            ) : (
              <div className="space-y-2">
                {data.missionsParStatut.map(m => (
                  <div key={m.label} className="flex items-center gap-3">
                    <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', m.color)} />
                    <span className="flex-1 text-xs text-ds-text2">{m.label}</span>
                    <span className="text-xs font-bold text-ds-text">{m.val}</span>
                    <div className="w-24 h-2 bg-ds-bg4 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', m.color)}
                        style={{ width: `${Math.round(m.val / data.nbMissions * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-sm font-bold text-ds-text mb-4">Candidatures par statut</h2>
            {data.candsParStatut.length === 0 ? (
              <div className="text-center py-4 text-ds-text3 text-sm">Aucune candidature</div>
            ) : (
              <div className="space-y-2">
                {data.candsParStatut.map(c => (
                  <div key={c.label} className="flex items-center gap-3">
                    <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', c.color)} />
                    <span className="flex-1 text-xs text-ds-text2">{c.label}</span>
                    <span className="text-xs font-bold text-ds-text">{c.val}</span>
                    <div className="w-24 h-2 bg-ds-bg4 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', c.color)}
                        style={{ width: `${Math.round(c.val / data.nbCands * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Indicateur taux de conversion */}
      {data.nbCands > 0 && (
        <div className="card">
          <h2 className="text-sm font-bold text-ds-text mb-4">Entonnoir de conversion</h2>
          <div className="flex flex-wrap gap-3 items-center justify-center">
            {[
              { label: 'Candidatures', val: data.nbCands, color: 'bg-ds-blue' },
              { label: 'Reponses', val: data.candsParStatut.filter(c => ['Reponse recue','Entretien'].includes(c.label)).reduce((s,c)=>s+c.val,0), color: 'bg-ds-teal' },
              { label: 'Entretiens', val: data.candsParStatut.find(c=>c.label==='Entretien')?.val||0, color: 'bg-ds-green' },
            ].map((step, i) => (
              <div key={step.label} className="flex items-center gap-3">
                {i > 0 && <div className="text-ds-text3 text-lg">→</div>}
                <div className="text-center">
                  <div className={cn('w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-extrabold mx-auto mb-1', step.color)}>
                    {step.val}
                  </div>
                  <div className="text-[10px] text-ds-text3">{step.label}</div>
                  {i > 0 && data.nbCands > 0 && (
                    <div className="text-[10px] text-ds-text3">{Math.round(step.val/data.nbCands*100)}%</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
