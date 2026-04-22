'use client'
import { useEffect, useState, useRef } from 'react'
import { Sparkles, Copy, RefreshCw, AlertCircle, CheckCircle, Settings, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAI } from '@/hooks/useAI'
import { useRouter } from 'next/navigation'

function load<T>(k: string, d: T): T {
  try { const v = typeof window !== 'undefined' && localStorage.getItem(k); return v ? JSON.parse(v) : d }
  catch { return d }
}

const MODES = [
  { id: 'linkedin',     label: '💼 Post LinkedIn',       desc: 'Post expert sur votre expertise data',      maxTk: 500, icon: '💼' },
  { id: 'email_b2b',   label: '📧 Email B2B DSI/CDO',   desc: 'Prospection accroche valeur ROI',           maxTk: 350, icon: '📧' },
  { id: 'pitch',       label: '🎤 Pitch mission',        desc: 'Présentation 2 min pour entretien',         maxTk: 400, icon: '🎤' },
  { id: 'cv_summary',  label: '📄 Résumé CV',            desc: 'Synthèse percutante de votre profil',       maxTk: 400, icon: '📄' },
  { id: 'relance',     label: '📮 Relance facture',      desc: 'Email poli mais ferme pour impayé',         maxTk: 300, icon: '📮' },
  { id: 'lettre',      label: '✍️ Lettre motivation',    desc: 'Lettre adaptée au secteur cible',           maxTk: 500, icon: '✍️' },
  { id: 'negociation', label: '💰 Négociation TJM',      desc: 'Argumentaire pour hausser votre tarif',     maxTk: 400, icon: '💰' },
  { id: 'audit',       label: '🔍 Audit mission',        desc: 'Points clés à négocier avant signature',    maxTk: 400, icon: '🔍' },
]

export default function IaPage() {
  const router = useRouter()
  const [mode,      setMode]      = useState('linkedin')
  const [context,   setContext]   = useState('')
  const [extra,     setExtra]     = useState('')
  const [output,    setOutput]    = useState('')
  const [copied,    setCopied]    = useState(false)
  const [aiReady,   setAiReady]   = useState(false)
  const [history,   setHistory]   = useState<{mode:string; output:string; ts:number}[]>([])
  const [showHist,  setShowHist]  = useState(false)
  const outputRef = useRef<HTMLDivElement>(null)
  const { generate, loading, error, isConfigured } = useAI()

  useEffect(() => {
    document.title = 'IA Studio — DataSphere OS'
    const s = load<{ cv?: { nom?: string; titre?: string; competences?: string[]; localisation?: string; disponibilite?: string } }>('datasphere_os_v1', {})
    const cv = s.cv || {}
    const cfg = load<{ groqKey?: string; openrouterKey?: string; anthropicKey?: string }>('datasphere_ai_config', {})
    setAiReady(!!(cfg.groqKey || cfg.openrouterKey || cfg.anthropicKey))
    setContext([
      cv.nom || 'Kaba Sekouna',
      cv.titre || 'Data Engineer Senior',
      cv.localisation ? `basé(e) à ${cv.localisation}` : '',
      cv.disponibilite ? `disponible ${cv.disponibilite}` : '',
      `TJM 800€/j`,
      `Stack : ${(cv.competences || ['Snowflake','DBT','Airflow','Python','PySpark']).slice(0,5).join(', ')}`,
    ].filter(Boolean).join(' · '))
    const saved = load<{mode:string;output:string;ts:number}[]>('datasphere_ia_history', [])
    setHistory(saved)
  }, [])

  const sel = MODES.find(m => m.id === mode) || MODES[0]

  function buildPrompt(modeId: string, ctx: string, xtra: string): string {
    const base = `Freelance data & tech : ${ctx}.${xtra ? '\nContexte additionnel : '+xtra : ''}`
    const map: Record<string, string> = {
      linkedin:     `Tu es expert LinkedIn B2B. Rédige un post LinkedIn professionnel et engageant (max 350 mots) pour ce freelance data.\n${base}\nObjectif : démontrer l'expertise, attirer des missions. Ton : expert, authentique, concret. Terminer par 3-4 hashtags data pertinents. PAS de "Je suis ravi de..." ni de clichés LinkedIn.`,
      email_b2b:    `Tu es expert cold email B2B. Rédige un email de prospection ultra-ciblé (max 150 mots) pour un DSI ou CDO.\n${base}\nStructure : accroche personnalisée (1 phrase) → douleur résolue → preuve concrète → call-to-action clair. Ton : direct, confiant, pas vendeur. Objet + corps.`,
      pitch:        `Tu es coach commercial freelance. Rédige un pitch verbal de 2 minutes (200-250 mots) pour un entretien de mission.\n${base}\nStructure : qui je suis → valeur unique → 2 preuves chiffrées → disponibilité et TJM → question ouverte finale. Ton : naturel, confiant, pas lu comme un script.`,
      cv_summary:   `Tu es expert RH tech. Rédige un résumé de profil percutant (120-150 mots) pour le haut d'un CV ou d'un profil Malt.\n${base}\nMettre en avant : expertise principale, technologies clés, type de missions, valeur ajoutée. Ton : professionnel, orienté impact, 3e personne.`,
      relance:      `Tu es juriste d'entreprise. Rédige un email de relance pour facture impayée (max 120 mots).\n${base}\nTon : poli, ferme, professionnel. Mentionner le numéro de facture [FAC-XXX], le montant [MONTANT], la date d'émission [DATE]. Rappeler les pénalités légales (articles L441-10 et suivants). Demander un accusé de réception.`,
      lettre:       `Tu es consultant en recrutement. Rédige une lettre de motivation freelance (250-300 mots) pour une mission data.\n${base}\nStructure : accroche contexte client → compétences alignées → mission similaire réussie → valeur ajoutée concrète → disponibilité. Ton : professionnel, concis, orienté valeur client.`,
      negociation:  `Tu es coach négociation commerciale. Génère un argumentaire complet pour négocier une hausse de TJM.\n${base}\nFournis : 1) Accroche orale (30 secondes) 2) 3 arguments béton avec données marché 3) Réponses aux 3 objections courantes (budget, junior dispo, délai court) 4) Phrase de closing. Ton : confiant, factuel, non-arrogant.`,
      audit:        `Tu es expert contrat freelance. Analyse les points critiques à vérifier avant de signer une mission.\n${base}\nFournis une checklist complète : 1) Clauses contractuelles à vérifier 2) Points financiers à clarifier 3) Questions à poser au client 4) Signaux d'alerte (red flags) 5) Éléments à négocier. Format clair avec emojis ✅ ⚠️ ❌.`,
    }
    return map[modeId] || map.linkedin
  }

  async function handleGenerate() {
    const result = await generate(buildPrompt(mode, context, extra), sel.maxTk)
    if (result) {
      setOutput(result)
      const newEntry = { mode: sel.label, output: result, ts: Date.now() }
      const newHistory = [newEntry, ...history].slice(0, 10)
      setHistory(newHistory)
      try { localStorage.setItem('datasphere_ia_history', JSON.stringify(newHistory)) } catch {}
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
  }

  function copyOutput() {
    navigator.clipboard.writeText(output).catch(() => {
      const el = document.createElement('textarea')
      el.value = output
      document.body.appendChild(el); el.select()
      document.execCommand('copy'); document.body.removeChild(el)
    })
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-ds-text tracking-tight flex items-center gap-2">
            <Sparkles size={20} className="text-ds-violet2" /> IA Studio
          </h1>
          <p className="text-sm text-ds-text3 mt-0.5">Génération de contenu pro en 5 secondes</p>
        </div>
        {history.length > 0 && (
          <button onClick={() => setShowHist(v => !v)}
            className="flex items-center gap-1.5 text-xs text-ds-text3 hover:text-ds-text2 transition-colors">
            Historique ({history.length}) <ChevronDown size={12} className={cn('transition-transform', showHist && 'rotate-180')} />
          </button>
        )}
      </div>

      {/* Alerte clé non configurée */}
      {!aiReady && (
        <div className="flex items-start gap-3 p-4 rounded-[12px] bg-ds-amber/8 border border-ds-amber/25">
          <AlertCircle size={16} className="text-ds-amber flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-ds-amber mb-1">Clé IA non configurée</div>
            <p className="text-xs text-ds-text3">Ajoutez une clé Groq (gratuite sur <strong className="text-ds-text2">console.groq.com</strong>) pour utiliser l'IA Studio.</p>
          </div>
          <button onClick={() => router.push('/settings')}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold text-white bg-ds-amber hover:opacity-90 transition-opacity">
            <Settings size={11} /> Configurer
          </button>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="flex items-start gap-3 p-3 rounded-[10px] bg-ds-rose/8 border border-ds-rose/20 text-xs text-ds-rose">
          <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Historique */}
      {showHist && history.length > 0 && (
        <div className="card space-y-2">
          <div className="text-xs font-bold text-ds-text3 uppercase tracking-wider mb-2">Historique récent</div>
          {history.map((h, i) => (
            <button key={i} onClick={() => { setOutput(h.output); setShowHist(false) }}
              className="w-full text-left px-3 py-2 rounded-[8px] bg-ds-bg3 hover:bg-ds-bg4 transition-colors">
              <div className="text-xs font-semibold text-ds-text2">{h.mode}</div>
              <div className="text-[10px] text-ds-text3 mt-0.5 line-clamp-1">{h.output.slice(0, 80)}…</div>
            </button>
          ))}
        </div>
      )}

      {/* Modes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {MODES.map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); setOutput('') }}
            className={cn(
              'text-left p-3 rounded-[10px] border transition-all',
              mode === m.id
                ? 'bg-ds-violet/12 border-ds-violet/40 text-ds-violet2 shadow-[0_0_0_2px_rgba(139,92,246,.15)]'
                : 'bg-ds-bg3 border-ds-border text-ds-text2 hover:border-ds-border2 hover:text-ds-text'
            )}>
            <div className="text-base mb-1">{m.icon}</div>
            <div className="text-xs font-bold leading-tight">{m.label.replace(/^[\S]+\s/, '')}</div>
            <div className="text-[10px] text-ds-text3 mt-0.5 leading-tight hidden sm:block">{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Contexte */}
      <div className="card space-y-3">
        <div>
          <label className="form-label">Votre profil (auto-rempli depuis votre CV)</label>
          <textarea className="inp text-xs" rows={2} value={context} onChange={e => setContext(e.target.value)} />
        </div>
        <div>
          <label className="form-label">Contexte additionnel <span className="text-ds-text3 font-normal normal-case">(optionnel — nom du client, secteur, urgence…)</span></label>
          <input className="inp text-xs" value={extra} onChange={e => setExtra(e.target.value)}
            placeholder="Ex: Mission chez AXA, migration Snowflake, démarrage sous 2 semaines" />
        </div>
      </div>

      {/* Bouton */}
      <button onClick={handleGenerate} disabled={loading || !context.trim()}
        className={cn(
          'w-full py-3.5 rounded-[12px] text-sm font-bold flex items-center justify-center gap-2 transition-all',
          loading || !context.trim()
            ? 'bg-ds-bg3 text-ds-text3 border border-ds-border cursor-not-allowed'
            : 'text-white bg-gradient-to-r from-[#8B5CF6] to-[#5B7FFF] shadow-[0_4px_20px_rgba(139,92,246,.4)] hover:opacity-90 hover:-translate-y-0.5'
        )}>
        {loading
          ? <><RefreshCw size={14} className="animate-spin" /> Génération en cours…</>
          : <><Sparkles size={14} /> Générer — {sel.label}</>
        }
      </button>

      {/* Output */}
      {output && (
        <div ref={outputRef} className="card animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-ds-green" />
              <h3 className="text-sm font-bold text-ds-text">{sel.label}</h3>
            </div>
            <div className="flex gap-2">
              <button onClick={handleGenerate} disabled={loading}
                className="flex items-center gap-1.5 btn-secondary text-xs">
                <RefreshCw size={11} className={cn(loading && 'animate-spin')} /> Régénérer
              </button>
              <button onClick={copyOutput}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold border transition-all',
                  copied
                    ? 'bg-ds-green/10 text-ds-green border-ds-green/20'
                    : 'bg-ds-bg3 text-ds-text2 border-ds-border hover:border-ds-border2'
                )}>
                <Copy size={11} /> {copied ? '✓ Copié !' : 'Copier'}
              </button>
            </div>
          </div>
          <div className="bg-ds-bg border border-ds-border rounded-[10px] p-4">
            <pre className="text-sm text-ds-text2 whitespace-pre-wrap leading-relaxed font-sans">{output}</pre>
          </div>
          <div className="mt-3 pt-3 border-t border-ds-border flex items-center gap-2 text-[11px] text-ds-text3">
            <Sparkles size={10} className="text-ds-violet" />
            Généré avec {load<{provider?:string}>('datasphere_ai_config', {}).provider || 'Groq'} — {output.split(' ').length} mots
          </div>
        </div>
      )}
    </div>
  )
}
