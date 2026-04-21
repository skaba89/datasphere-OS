'use client'
import { useEffect, useState, useCallback } from 'react'
import { Bot, Play, RefreshCw, CheckCircle2, Clock, XCircle, MessageSquare, Sparkles, Filter } from 'lucide-react'
import { cn, fmt, today, uid } from '@/lib/utils'
import { useAI } from '@/hooks/useAI'

interface Candidature { id: string; offreId: string; titre: string; entreprise: string; statut: string; dateEnvoi: string; score: number; email: string; cvAdapte: string }
const OFFRES_MOCK = [
  { id: 'o1', titre: 'Data Architect Senior', entreprise: 'BNP Paribas', tjmMin: 800, tjmMax: 950, tech: ['Snowflake','DBT','Airflow'], score: 88 },
  { id: 'o2', titre: 'Lead Data Engineer', entreprise: 'Société Générale', tjmMin: 750, tjmMax: 900, tech: ['PySpark','Kafka','GCP'], score: 82 },
  { id: 'o3', titre: 'Data Engineer Snowflake', entreprise: 'Total Énergies', tjmMin: 700, tjmMax: 850, tech: ['Snowflake','Python','Terraform'], score: 79 },
  { id: 'o4', titre: 'Consultant Data Cloud', entreprise: 'Capgemini', tjmMin: 750, tjmMax: 900, tech: ['Azure','DBT','Power BI'], score: 74 },
  { id: 'o5', titre: 'Data Architect Azure', entreprise: 'Thales Group', tjmMin: 800, tjmMax: 1000, tech: ['Azure ADLS','Docker','Terraform'], score: 71 },
]

function load<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } }
function save(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

const STATUT_COLS: Record<string, string> = {
  'Envoyée':       'bg-ds-blue/10 text-ds-blue2 border-ds-blue/20',
  'Ouverte':       'bg-ds-teal/10 text-ds-teal border-ds-teal/20',
  'Réponse reçue': 'bg-ds-amber/10 text-ds-amber border-ds-amber/20',
  'Entretien':     'bg-ds-green/10 text-ds-green border-ds-green/20',
  'Refus':         'bg-ds-rose/10 text-ds-rose border-ds-rose/20',
}

export default function AgentPage() {
  const [cands,    setCands]    = useState<Candidature[]>([])
  const [running,  setRunning]  = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set(['o1','o2','o3']))
  const [scoreMin, setScoreMin] = useState(70)
  const [step,     setStep]     = useState('')
  const { generate } = useAI()

  useEffect(() => {
    const s = load<{ agentRuns?: { candidatures?: Candidature[] }[] }>('datasphere_os_v1', {})
    const all = (s.agentRuns || []).flatMap(r => r.candidatures || [])
    setCands(all)
    document.title = 'Agent IA — DataSphere OS'
  }, [])

  const filtered = OFFRES_MOCK.filter(o => o.score >= scoreMin)

  async function runAgent() {
    if (selected.size === 0) return
    setRunning(true)
    const offres = filtered.filter(o => selected.has(o.id))
    const newCands: Candidature[] = []

    for (const o of offres) {
      setStep(`📊 Analyse ATS — ${o.entreprise}...`)
      const cv = load<{ cv?: { nom?: string; titre?: string; competences?: string[] } }>('datasphere_os_v1', {}).cv || {}
      const email = await generate(`Rédige un email de candidature professionnel (150 mots max) pour:\nOffre: ${o.titre} @ ${o.entreprise}\nCandidat: ${cv.nom || 'Kaba Sekouna'}, ${cv.titre || 'Data Engineer Senior'}\nTech: ${o.tech.join(', ')}\nTon: professionnel, accrocheur, pas commercial. Objet + corps seulement.`, 400)
      newCands.push({
        id: uid(), offreId: o.id, titre: o.titre, entreprise: o.entreprise,
        statut: 'Envoyée', dateEnvoi: today(), score: o.score,
        email: email || `Objet: Candidature ${o.titre}\n\nBonjour,\n\nJe suis ${cv.nom || 'Kaba Sekouna'}, ${cv.titre || 'Data Engineer Senior'}...`, cvAdapte: ''
      })
      setStep(`✅ ${o.entreprise} — candidature générée`)
      await new Promise(r => setTimeout(r, 300))
    }

    const s = load<Record<string, unknown>>('datasphere_os_v1', {})
    const runs = [...(s.agentRuns as {candidatures?: Candidature[]}[] || []), { id: uid(), date: today(), candidatures: newCands }]
    save('datasphere_os_v1', { ...s, agentRuns: runs })
    setCands(prev => [...prev, ...newCands])
    setStep('')
    setRunning(false)
  }

  const updateStatut = (id: string, statut: string) => {
    const s = load<Record<string, unknown>>('datasphere_os_v1', {})
    const runs = ((s.agentRuns as {candidatures?: Candidature[]}[]) || []).map(r => ({
      ...r, candidatures: (r.candidatures || []).map(c => c.id === id ? { ...c, statut } : c)
    }))
    save('datasphere_os_v1', { ...s, agentRuns: runs })
    setCands(prev => prev.map(c => c.id === id ? { ...c, statut } : c))
  }

  const byStatut = (s: string) => cands.filter(c => c.statut === s)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ds-text tracking-tight flex items-center gap-2"><Bot size={20} className="text-ds-violet2" /> Agent IA</h1>
          <p className="text-sm text-ds-text3 mt-0.5">{cands.length} candidature{cands.length !== 1 ? 's' : ''} générée{cands.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Envoyées', value: cands.length, color: 'text-ds-blue2' },
          { label: 'Réponses', value: byStatut('Réponse reçue').length + byStatut('Entretien').length, color: 'text-ds-teal' },
          { label: 'Entretiens', value: byStatut('Entretien').length, color: 'text-ds-green' },
          { label: 'Taux réponse', value: cands.length ? Math.round((byStatut('Réponse reçue').length + byStatut('Entretien').length) / cands.length * 100) + '%' : '—', color: 'text-ds-amber' },
        ].map(k => (
          <div key={k.label} className="card py-3 px-4">
            <div className="text-[10px] font-bold uppercase tracking-wide text-ds-text3 mb-1">{k.label}</div>
            <div className={cn('text-xl font-extrabold', k.color)}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Config agent */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-ds-text flex items-center gap-2"><Filter size={14} /> Configuration</h2>
          <div className="flex items-center gap-2 text-xs text-ds-text3">
            Score ATS min :
            <select value={scoreMin} onChange={e => setScoreMin(Number(e.target.value))} className="inp w-20 text-xs py-1">
              {[50,60,70,80,90].map(v => <option key={v} value={v}>≥ {v}%</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          {filtered.map(o => (
            <label key={o.id} className={cn('flex items-center gap-3 p-3 rounded-ds-sm border cursor-pointer transition-all',
              selected.has(o.id) ? 'bg-ds-blue/8 border-ds-blue/30' : 'bg-ds-bg3 border-ds-border hover:border-ds-border2')}>
              <input type="checkbox" checked={selected.has(o.id)} onChange={e => {
                const s = new Set(selected)
                e.target.checked ? s.add(o.id) : s.delete(o.id)
                setSelected(s)
              }} className="w-4 h-4 accent-blue-500" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-ds-text truncate">{o.titre}</div>
                <div className="text-[10px] text-ds-text3">{o.entreprise} · {o.tech.slice(0,3).join(', ')}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-extrabold text-ds-teal">{o.score}%</div>
                <div className="text-[10px] text-ds-text3">{o.tjmMin}–{o.tjmMax}€</div>
              </div>
            </label>
          ))}
        </div>
        {step && (
          <div className="mt-3 flex items-center gap-2 text-xs text-ds-text2 px-3 py-2 bg-ds-bg3 rounded-ds-sm border border-ds-border">
            <RefreshCw size={12} className="animate-spin text-ds-blue2" /> {step}
          </div>
        )}
        <button onClick={runAgent} disabled={running || selected.size === 0}
          className={cn('w-full mt-4 py-3 rounded-ds-sm text-sm font-bold flex items-center justify-center gap-2 transition-all',
            running || selected.size === 0
              ? 'bg-ds-bg3 text-ds-text3 border border-ds-border cursor-not-allowed'
              : 'text-white bg-gradient-to-r from-ds-blue to-ds-violet shadow-[0_4px_16px_rgba(91,127,255,.35)] hover:opacity-90')}>
          {running ? <><RefreshCw size={14} className="animate-spin" /> Génération en cours…</> : <><Sparkles size={14} /> Lancer pour {selected.size} offre{selected.size > 1 ? 's' : ''}</>}
        </button>
      </div>

      {/* Kanban */}
      {cands.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-ds-text mb-3">📋 Suivi des candidatures</h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {(['Envoyée','Ouverte','Réponse reçue','Entretien','Refus']).map(statut => (
              <div key={statut}>
                <div className={cn('flex items-center justify-between px-2.5 py-2 rounded-ds-sm mb-2 border text-[10px] font-bold', STATUT_COLS[statut] || 'bg-ds-bg3 text-ds-text3 border-ds-border')}>
                  <span>{statut}</span><span>{byStatut(statut).length}</span>
                </div>
                <div className="space-y-1.5">
                  {byStatut(statut).map(c => (
                    <div key={c.id} className="card p-2.5">
                      <div className="text-[11px] font-bold text-ds-text mb-1 truncate">{c.titre}</div>
                      <div className="text-[10px] text-ds-text3 mb-2">{c.entreprise}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-ds-teal font-semibold">{c.score}%</span>
                        <select value={c.statut} onChange={e => updateStatut(c.id, e.target.value)}
                          className="text-[9px] bg-transparent text-ds-text3 border-none cursor-pointer outline-none">
                          {['Envoyée','Ouverte','Réponse reçue','Entretien','Refus'].map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
