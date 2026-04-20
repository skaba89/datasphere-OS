'use client'
import { useEffect, useState } from 'react'
import { Sparkles, Copy, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAI } from '@/hooks/useAI'

const MODES = [
  { id: 'linkedin',   label: '💼 Post LinkedIn',    desc: 'Post professionnel sur votre expertise data', maxTk: 400 },
  { id: 'email',      label: '📧 Email B2B',         desc: 'Prospection DSI/CDO, accroche sur la valeur ROI', maxTk: 300 },
  { id: 'kpis',       label: '📊 Analyse KPIs',      desc: 'Rapport complet activité avec recommandations', maxTk: 500 },
  { id: 'pitch',      label: '🎤 Pitch mission',     desc: 'Présentation 2 minutes entretien commercial', maxTk: 350 },
  { id: 'relance',    label: '📮 Relance facture',   desc: 'Email de relance poli mais ferme', maxTk: 250 },
  { id: 'motivation', label: '✍️ Lettre motivation', desc: 'Lettre adaptée au secteur cible', maxTk: 450 },
]

function load<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } }

export default function IaPage() {
  const [mode,    setMode]    = useState('linkedin')
  const [context, setContext] = useState('')
  const [output,  setOutput]  = useState('')
  const [copied,  setCopied]  = useState(false)
  const { generate, loading } = useAI()

  useEffect(() => {
    const s = load<{ cv?: { nom?: string; titre?: string; competences?: string[] } }>('datasphere_os_v1', {})
    const cv = s.cv || {}
    setContext(`${cv.nom || 'Kaba Sekouna'}, ${cv.titre || 'Data Engineer Senior'}, TJM 800€/j, stack: ${(cv.competences || ['Snowflake','DBT','Airflow']).slice(0,4).join(', ')}`)
    document.title = 'IA Studio — DataSphere OS'
  }, [])

  const selectedMode = MODES.find(m => m.id === mode) || MODES[0]

  const prompts: Record<string, string> = {
    linkedin:   `Rédige un post LinkedIn professionnel (350 mots max) pour un freelance data. Sujet : expertise et positionnement sur le marché. Contexte : ${context}. Ton : expert, authentique, pas commercial. Inclure 3-4 hashtags pertinents.`,
    email:      `Rédige un email de prospection B2B (150 mots max) pour un DSI ou CDO. Contexte : ${context}. Accroche sur la valeur ROI. Ton : professionnel, direct, pas vendeur.`,
    kpis:       `Analyse ces KPIs freelance et donne des recommandations concrètes (400 mots max) : ${context}. Structure : situation actuelle → 3 points forts → 3 axes d'amélioration → actions prioritaires.`,
    pitch:      `Rédige un pitch de 2 minutes (250 mots) pour un entretien commercial. Contexte : ${context}. Structure : présentation → valeur unique → preuves concrètes → disponibilité et TJM.`,
    relance:    `Rédige un email de relance facture impayée (120 mots max). Expéditeur : ${context}. Ton : poli mais ferme. Mentionner le délai sans être agressif.`,
    motivation: `Rédige une lettre de motivation (300 mots) pour une mission freelance data. Candidat : ${context}. Ton : professionnel, concis, orienté valeur.`,
  }

  async function handleGenerate() {
    const result = await generate(prompts[mode], selectedMode.maxTk)
    setOutput(result || '')
  }

  function copyOutput() {
    navigator.clipboard.writeText(output).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-ds-text tracking-tight flex items-center gap-2"><Sparkles size={20} className="text-ds-violet2" /> IA Studio</h1>
        <p className="text-sm text-ds-text3 mt-0.5">Génération de contenu professionnel alimenté par votre profil</p>
      </div>

      {/* Modes */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        {MODES.map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); setOutput('') }}
            className={cn('text-left p-3 rounded-ds-sm border transition-all',
              mode === m.id ? 'bg-ds-violet/10 border-ds-violet/40 text-ds-violet2' : 'bg-ds-bg3 border-ds-border text-ds-text2 hover:border-ds-border2')}>
            <div className="text-sm font-bold mb-0.5">{m.label}</div>
            <div className="text-[10px] opacity-70">{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Contexte */}
      <div>
        <label className="form-label">Contexte (votre profil, personnalisez si besoin)</label>
        <textarea className="inp" rows={2} value={context} onChange={e => setContext(e.target.value)} />
      </div>

      {/* Générer */}
      <button onClick={handleGenerate} disabled={loading}
        className={cn('w-full py-3 rounded-ds-sm text-sm font-bold flex items-center justify-center gap-2 transition-all',
          loading ? 'bg-ds-bg3 text-ds-text3 border border-ds-border cursor-not-allowed'
                  : 'text-white bg-gradient-to-r from-ds-violet to-ds-blue shadow-[0_4px_16px_rgba(139,92,246,.35)] hover:opacity-90')}>
        {loading ? <><RefreshCw size={14} className="animate-spin" /> Génération…</> : <><Sparkles size={14} /> Générer — {selectedMode.label}</>}
      </button>

      {/* Output */}
      {output && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-ds-text">{selectedMode.label}</h3>
            <button onClick={copyOutput}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-ds-sm text-xs font-semibold border transition-all',
                copied ? 'bg-ds-green/10 text-ds-green border-ds-green/20' : 'bg-ds-bg3 text-ds-text2 border-ds-border hover:border-ds-border2')}>
              <Copy size={12} /> {copied ? 'Copié !' : 'Copier'}
            </button>
          </div>
          <div className="bg-ds-bg border border-ds-border rounded-ds-sm p-4">
            <pre className="text-sm text-ds-text2 whitespace-pre-wrap leading-relaxed font-sans">{output}</pre>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleGenerate} className="btn-secondary flex items-center gap-1.5 text-xs">
              <RefreshCw size={11} /> Régénérer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
