'use client'
import { useEffect, useState, useRef } from 'react'
import { Bot, RefreshCw, Sparkles, Filter, ExternalLink, Eye, ChevronDown, ChevronUp, Settings } from 'lucide-react'
import { cn, fmt, today, uid } from '@/lib/utils'
import { useAI } from '@/hooks/useAI'
import { useOffers } from '@/hooks/useOffers'
import { useRouter } from 'next/navigation'
import type { LiveOffer } from '@/types'

interface Candidature {
  id: string; offreId: string; titre: string; entreprise: string
  statut: string; dateEnvoi: string; score: number; email: string; url?: string
}

function load<T>(k: string, d: T): T {
  try { const v = typeof window !== 'undefined' && localStorage.getItem(k); return v ? JSON.parse(v) : d }
  catch { return d }
}
function save(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

const STATUT_STYLES: Record<string, string> = {
  'Envoyee':       'bg-ds-blue/10 text-ds-blue2 border-ds-blue/20',
  'Ouverte':       'bg-ds-teal/10 text-ds-teal border-ds-teal/20',
  'Reponse recue': 'bg-ds-amber/10 text-ds-amber border-ds-amber/20',
  'Entretien':     'bg-ds-green/10 text-ds-green border-ds-green/20',
  'Refus':         'bg-ds-rose/10 text-ds-rose border-ds-rose/20',
}

export default function AgentPage() {
  const router = useRouter()
  const [cands,      setCands]      = useState<Candidature[]>([])
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [running,    setRunning]     = useState(false)
  const [step,       setStep]        = useState('')
  const [scoreMin,   setScoreMin]    = useState(60)
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null)
  const [skills,     setSkills]      = useState<string[]>([])
  const [aiReady,    setAiReady]     = useState(false)
  const [tab,        setTab]         = useState<'offres'|'kanban'>('offres')
  const runRef = useRef(false)
  const { generate } = useAI()
  const { filtered: liveOffers, loading: offresLoading, refresh } = useOffers(skills)

  useEffect(() => {
    document.title = 'Agent IA — DataSphere OS'
    const s = load<Record<string, unknown>>('datasphere_os_v1', {})
    const cv = (s.cv as {competences?:string[]}) || {}
    setSkills((cv.competences || ['data','python','snowflake','sql']).slice(0, 6))
    const cfg = load<{groqKey?:string;openrouterKey?:string;anthropicKey?:string}>('datasphere_ai_config', {})
    setAiReady(!!(cfg.groqKey || cfg.openrouterKey || cfg.anthropicKey))
    const all = ((s.agentRuns as {candidatures?:Candidature[]}[]) || []).flatMap(r => r.candidatures || [])
    setCands(all)
    // Pre-selectionner les 3 meilleures offres une fois chargées
  }, [])

  // Pre-selectionner quand les offres arrivent
  useEffect(() => {
    if (liveOffers.length > 0 && selected.size === 0) {
      const top3 = liveOffers.filter(o => (o.score||0) >= scoreMin).slice(0, 3).map(o => o.id)
      setSelected(new Set(top3))
    }
  }, [liveOffers.length])

  const eligibles = liveOffers.filter(o => (o.score||0) >= scoreMin)

  async function runAgent() {
    if (selected.size === 0 || runRef.current) return
    runRef.current = true
    setRunning(true)
    const offres = eligibles.filter(o => selected.has(o.id))
    const cv = load<{cv?:{nom?:string;titre?:string;competences?:string[]}}>('datasphere_os_v1', {}).cv || {}
    const newCands: Candidature[] = []

    for (const o of offres) {
      if (!runRef.current) break
      setStep(`Analyse ATS — ${o.entreprise}...`)
      const prompt = `Redige un email de candidature freelance professionnel et personnalise (max 150 mots).\n\nOffre: ${o.titre} chez ${o.entreprise}\nTech requises: ${(o.tech||[]).slice(0,5).join(', ')}\nTJM: ${o.tjmMin}-${o.tjmMax} EUR/j\nCandidat: ${cv.nom||'Kaba Sekouna'}, ${cv.titre||'Data Engineer Senior'}\nStack: ${(cv.competences||['Snowflake','DBT','Python']).slice(0,4).join(', ')}\n\nStructure: Objet percutant + corps concis (3 phrases max). Ton professionnel, pas commercial. Mettre en avant 1 competence cle matchant l'offre.`
      const email = await generate(prompt, 350)
      newCands.push({
        id: uid(), offreId: o.id, titre: o.titre, entreprise: o.entreprise,
        statut: 'Envoyee', dateEnvoi: today(), score: o.score || 0,
        email: email || `Objet: Candidature ${o.titre}\n\nBonjour,\n\nJe suis ${cv.nom||'Kaba Sekouna'}, ${cv.titre||'Data Engineer Senior'} avec expertise ${(cv.competences||[]).slice(0,2).join(' et ')}. Votre mission ${o.titre} correspond exactement a mon profil.\n\nDisponible rapidement, je serais ravi d'echanger.\n\nCordialement`,
        url: o.url
      })
      setStep(`${o.entreprise} — email genere`)
      await new Promise(r => setTimeout(r, 200))
    }

    const s = load<Record<string, unknown>>('datasphere_os_v1', {})
    const runs = [...((s.agentRuns as {candidatures?:Candidature[]}[]) || []), { id: uid(), date: today(), candidatures: newCands }]
    save('datasphere_os_v1', { ...s, agentRuns: runs })
    setCands(prev => [...prev, ...newCands])
    setStep('')
    setRunning(false)
    runRef.current = false
    setTab('kanban')
  }

  function updateStatut(id: string, statut: string) {
    const s = load<Record<string, unknown>>('datasphere_os_v1', {})
    const runs = ((s.agentRuns as {candidatures?:Candidature[]}[]) || []).map(r => ({
      ...r, candidatures: (r.candidatures||[]).map(c => c.id===id ? {...c, statut} : c)
    }))
    save('datasphere_os_v1', { ...s, agentRuns: runs })
    setCands(prev => prev.map(c => c.id===id ? {...c, statut} : c))
  }

  const byStatut = (s: string) => cands.filter(c => c.statut === s)
  const reponses = byStatut('Reponse recue').length + byStatut('Entretien').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ds-text tracking-tight flex items-center gap-2">
            <Bot size={20} className="text-ds-violet2" /> Agent IA
          </h1>
          <p className="text-sm text-ds-text3 mt-0.5">
            {offresLoading ? 'Chargement des offres live...' : `${eligibles.length} offres eligibles · ${cands.length} candidatures`}
          </p>
        </div>
        <button onClick={refresh} disabled={offresLoading} className="btn-secondary flex items-center gap-1.5 text-xs">
          <RefreshCw size={12} className={cn(offresLoading && 'animate-spin')} /> Actualiser offres
        </button>
      </div>

      {/* Alerte IA */}
      {!aiReady && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-ds-amber/8 border border-ds-amber/25 rounded-[12px]">
          <span className="text-sm text-ds-amber">Configurez une cle IA pour generer les emails</span>
          <button onClick={() => router.push('/settings')}
            className="flex items-center gap-1 text-xs font-semibold text-ds-amber hover:underline whitespace-nowrap">
            <Settings size={11} /> Config
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Candidatures', value: cands.length,              color: 'text-ds-blue2' },
          { label: 'Reponses',     value: reponses,                  color: 'text-ds-teal' },
          { label: 'Entretiens',   value: byStatut('Entretien').length, color: 'text-ds-green' },
          { label: 'Taux reponse', value: cands.length ? Math.round(reponses/cands.length*100)+'%' : '—', color: 'text-ds-amber' },
        ].map(k => (
          <div key={k.label} className="card py-3 px-4">
            <div className="text-[10px] font-bold uppercase tracking-wide text-ds-text3 mb-1">{k.label}</div>
            <div className={cn('text-xl font-extrabold', k.color)}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-ds-border">
        {[{id:'offres',label:'Offres & Selection'},{id:'kanban',label:'Kanban candidatures'}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as 'offres'|'kanban')}
            className={cn('px-4 py-2 text-sm font-semibold border-b-2 transition-all -mb-px',
              tab === t.id ? 'border-ds-blue text-ds-blue2' : 'border-transparent text-ds-text3 hover:text-ds-text2')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Onglet offres */}
      {tab === 'offres' && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-ds-text flex items-center gap-2"><Filter size={13} /> Selectionner les offres</h2>
              <div className="flex items-center gap-2 text-xs text-ds-text3">
                Score min:
                <select value={scoreMin} onChange={e => setScoreMin(Number(e.target.value))} className="inp w-20 text-xs py-1">
                  {[40,50,60,70,80,90].map(v => <option key={v} value={v}>{v}+%</option>)}
                </select>
              </div>
            </div>

            {offresLoading ? (
              <div className="flex items-center gap-2 py-8 justify-center text-ds-text3">
                <RefreshCw size={14} className="animate-spin" />
                <span className="text-sm">Chargement des offres live...</span>
              </div>
            ) : eligibles.length === 0 ? (
              <div className="text-center py-8 text-ds-text3">
                <p className="text-sm mb-2">Aucune offre avec un score >= {scoreMin}%</p>
                <button onClick={() => setScoreMin(40)} className="text-xs text-ds-blue2 hover:underline">Abaisser le seuil</button>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {eligibles.slice(0, 20).map(o => (
                  <OfferSelectRow key={o.id} offer={o}
                    selected={selected.has(o.id)}
                    onToggle={() => {
                      const s = new Set(selected)
                      s.has(o.id) ? s.delete(o.id) : s.add(o.id)
                      setSelected(s)
                    }} />
                ))}
              </div>
            )}

            {step && (
              <div className="mt-3 flex items-center gap-2 text-xs text-ds-text2 px-3 py-2 bg-ds-bg3 rounded-[9px] border border-ds-border">
                <RefreshCw size={11} className="animate-spin text-ds-blue2 flex-shrink-0" />
                {step}
              </div>
            )}

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-ds-border">
              <span className="text-xs text-ds-text3">
                {selected.size} offre{selected.size !== 1 ? 's' : ''} selectionnee{selected.size !== 1 ? 's' : ''}
              </span>
              <button onClick={runAgent} disabled={running || selected.size === 0 || !aiReady}
                className={cn('flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-bold transition-all',
                  running || selected.size === 0 || !aiReady
                    ? 'bg-ds-bg3 text-ds-text3 border border-ds-border cursor-not-allowed'
                    : 'text-white bg-gradient-to-r from-ds-blue to-ds-violet shadow-[0_4px_16px_rgba(91,127,255,.3)] hover:opacity-90')}>
                {running
                  ? <><RefreshCw size={13} className="animate-spin" /> Generation...</>
                  : <><Sparkles size={13} /> Generer {selected.size} email{selected.size !== 1 ? 's' : ''}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onglet kanban */}
      {tab === 'kanban' && (
        <div>
          {cands.length === 0 ? (
            <div className="text-center py-12 text-ds-text3">
              <Bot size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm mb-2">Aucune candidature generee</p>
              <button onClick={() => setTab('offres')} className="text-xs text-ds-blue2 hover:underline">
                Selectionner des offres →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {['Envoyee','Ouverte','Reponse recue','Entretien','Refus'].map(statut => (
                <div key={statut}>
                  <div className={cn('flex items-center justify-between px-2.5 py-2 rounded-[9px] mb-2 border text-[10px] font-bold', STATUT_STYLES[statut] || 'bg-ds-bg3 text-ds-text3 border-ds-border')}>
                    <span>{statut}</span><span>{byStatut(statut).length}</span>
                  </div>
                  <div className="space-y-2">
                    {byStatut(statut).map(c => (
                      <div key={c.id} className="card p-3">
                        <div className="text-[11px] font-bold text-ds-text mb-1 leading-tight">{c.titre}</div>
                        <div className="text-[10px] text-ds-text3 mb-2">{c.entreprise}</div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={cn('text-[10px] font-bold', c.score >= 75 ? 'text-ds-green' : 'text-ds-amber')}>{c.score}%</span>
                          {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-ds-text3 hover:text-ds-blue2"><ExternalLink size={10} /></a>}
                        </div>
                        <select value={c.statut} onChange={e => updateStatut(c.id, e.target.value)}
                          className="w-full text-[9px] bg-ds-bg border border-ds-border rounded px-1.5 py-1 text-ds-text3 cursor-pointer outline-none">
                          {['Envoyee','Ouverte','Reponse recue','Entretien','Refus'].map(s => <option key={s}>{s}</option>)}
                        </select>
                        {c.email && (
                          <button onClick={() => setExpandedEmail(expandedEmail === c.id ? null : c.id)}
                            className="flex items-center gap-1 mt-2 text-[9px] text-ds-text3 hover:text-ds-blue2 transition-colors">
                            <Eye size={9} /> Email
                            {expandedEmail === c.id ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
                          </button>
                        )}
                        {expandedEmail === c.id && c.email && (
                          <div className="mt-2 p-2 bg-ds-bg rounded border border-ds-border text-[10px] text-ds-text2 whitespace-pre-wrap leading-relaxed">{c.email}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function OfferSelectRow({ offer: o, selected, onToggle }: { offer: LiveOffer; selected: boolean; onToggle: () => void }) {
  return (
    <label className={cn('flex items-center gap-3 p-3 rounded-[10px] border cursor-pointer transition-all',
      selected ? 'bg-ds-blue/8 border-ds-blue/30' : 'bg-ds-bg3 border-ds-border hover:border-ds-border2')}>
      <input type="checkbox" checked={selected} onChange={onToggle} className="w-4 h-4 accent-blue-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-ds-text truncate">{o.titre}</div>
        <div className="text-[10px] text-ds-text3">{o.entreprise} · {o.ville} · {(o.tech||[]).slice(0,3).join(', ')}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className={cn('text-sm font-extrabold', (o.score||0) >= 75 ? 'text-ds-green' : 'text-ds-teal')}>{o.score}%</div>
        <div className="text-[10px] text-ds-text3">{o.tjmMin}–{o.tjmMax}EUR</div>
      </div>
      {o.url && (
        <a href={o.url} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="text-ds-text3 hover:text-ds-blue2 flex-shrink-0">
          <ExternalLink size={11} />
        </a>
      )}
    </label>
  )
}
