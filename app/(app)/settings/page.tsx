'use client'
import { useEffect, useState } from 'react'
import { Save, Eye, EyeOff, Trash2, AlertCircle, CheckCircle, RefreshCw, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface AIConfig { provider: string; groqKey: string; openrouterKey: string; anthropicKey: string }

function load<T>(k: string, d: T): T {
  try { const v = typeof window !== 'undefined' && localStorage.getItem(k); return v ? JSON.parse(v) : d }
  catch { return d }
}
function save(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

const PROVIDERS = [
  { id: 'groq',        label: 'Groq',        badge: 'Gratuit · Recommandé', color: 'text-ds-green',  keyField: 'groqKey',        prefix: 'gsk_',     url: 'https://console.groq.com/keys',          model: 'Llama 3.3 70B · Ultra-rapide' },
  { id: 'openrouter',  label: 'OpenRouter',  badge: 'Gratuit · 29 modèles', color: 'text-ds-blue2',  keyField: 'openrouterKey',  prefix: 'sk-or-',   url: 'https://openrouter.ai/keys',             model: 'Llama 3.3 70B Instruct Free' },
  { id: 'anthropic',   label: 'Anthropic',   badge: 'Payant · Meilleure qualité', color: 'text-ds-amber', keyField: 'anthropicKey', prefix: 'sk-ant-', url: 'https://console.anthropic.com/settings/keys', model: 'Claude Haiku 4.5' },
] as const

export default function SettingsPage() {
  const router = useRouter()
  const [cfg,     setCfg]     = useState<AIConfig>({ provider: 'groq', groqKey: '', openrouterKey: '', anthropicKey: '' })
  const [show,    setShow]    = useState<Record<string, boolean>>({})
  const [saved,   setSaved]   = useState(false)
  const [testing, setTesting] = useState(false)
  const [testMsg, setTestMsg] = useState<{ ok: boolean; msg: string } | null>(null)
  const [cv,      setCv]      = useState<Record<string, unknown>>({})

  useEffect(() => {
    document.title = 'Paramètres — DataSphere OS'
    setCfg(load<AIConfig>('datasphere_ai_config', { provider: 'groq', groqKey: '', openrouterKey: '', anthropicKey: '' }))
    const s = load<{ cv?: Record<string, unknown> }>('datasphere_os_v1', {})
    setCv(s.cv || {})
  }, [])

  function saveConfig() {
    save('datasphere_ai_config', cfg)
    setSaved(true); setTestMsg(null)
    setTimeout(() => setSaved(false), 2500)
  }

  async function testConnection() {
    const p = PROVIDERS.find(p => p.id === cfg.provider)!
    const key = cfg[p.keyField as keyof AIConfig]
    if (!key) { setTestMsg({ ok: false, msg: 'Aucune clé configurée pour ce provider.' }); return }

    setTesting(true); setTestMsg(null)
    try {
      const url = cfg.provider === 'groq'       ? 'https://api.groq.com/openai/v1/chat/completions'
                : cfg.provider === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions'
                :                                 'https://api.anthropic.com/v1/messages'
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (cfg.provider === 'anthropic') { headers['x-api-key'] = key; headers['anthropic-version'] = '2023-06-01' }
      else { headers['Authorization'] = 'Bearer ' + key }
      if (cfg.provider === 'openrouter') { headers['HTTP-Referer'] = window.location.origin; headers['X-Title'] = 'DataSphere OS' }
      const body = cfg.provider === 'anthropic'
        ? { model: 'claude-haiku-4-5-20251001', max_tokens: 5, messages: [{ role: 'user', content: 'Hi' }] }
        : { model: p.id === 'groq' ? 'llama-3.3-70b-versatile' : 'meta-llama/llama-3.3-70b-instruct:free', max_tokens: 5, messages: [{ role: 'user', content: 'Hi' }] }
      const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) })
      if (r.ok) setTestMsg({ ok: true, msg: `✅ Connexion ${cfg.provider} réussie — clé valide !` })
      else { const e = await r.json(); setTestMsg({ ok: false, msg: `❌ ${e.error?.message || 'HTTP ' + r.status}` }) }
    } catch (e) {
      setTestMsg({ ok: false, msg: `❌ ${e instanceof Error ? e.message : 'Erreur réseau'}` })
    }
    setTesting(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-extrabold text-ds-text tracking-tight">⚙️ Paramètres</h1>
        <p className="text-sm text-ds-text3 mt-0.5">Configuration IA et gestion des données</p>
      </div>

      {/* Config IA */}
      <div className="card space-y-4">
        <h2 className="text-sm font-bold text-ds-text">🤖 Configuration IA</h2>

        {/* Provider selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {PROVIDERS.map(p => (
            <button key={p.id} onClick={() => setCfg(v => ({ ...v, provider: p.id }))}
              className={cn(
                'text-left p-3 rounded-[10px] border transition-all',
                cfg.provider === p.id
                  ? 'bg-ds-blue/10 border-ds-blue/40 shadow-[0_0_0_2px_rgba(91,127,255,.15)]'
                  : 'bg-ds-bg3 border-ds-border hover:border-ds-border2'
              )}>
              <div className={cn('text-xs font-bold', cfg.provider === p.id ? 'text-ds-blue2' : 'text-ds-text2')}>{p.label}</div>
              <div className="text-[10px] text-ds-text3 mt-0.5">{p.model}</div>
              <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded mt-1 inline-block',
                p.badge.includes('Gratuit') ? 'bg-ds-green/10 text-ds-green' : 'bg-ds-amber/10 text-ds-amber'
              )}>{p.badge}</span>
            </button>
          ))}
        </div>

        {/* Keys */}
        {PROVIDERS.map(p => (
          <div key={p.id}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="form-label mb-0">{p.label} API Key</label>
              <a href={p.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-ds-blue2 hover:underline">
                Obtenir <ExternalLink size={9} />
              </a>
            </div>
            <div className="relative">
              <input
                type={show[p.keyField] ? 'text' : 'password'}
                className="inp pr-10 text-sm font-mono"
                value={cfg[p.keyField as keyof AIConfig]}
                onChange={e => setCfg(v => ({ ...v, [p.keyField]: e.target.value }))}
                placeholder={p.prefix + '…'}
              />
              <button type="button" onClick={() => setShow(v => ({ ...v, [p.keyField]: !v[p.keyField] }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ds-text3 hover:text-ds-text2">
                {show[p.keyField] ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        ))}

        {/* Feedback test */}
        {testMsg && (
          <div className={cn('flex items-center gap-2 px-3 py-2.5 rounded-[9px] text-xs border',
            testMsg.ok ? 'bg-ds-green/8 border-ds-green/20 text-ds-green' : 'bg-ds-rose/8 border-ds-rose/20 text-ds-rose')}>
            {testMsg.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
            {testMsg.msg}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={testConnection} disabled={testing}
            className="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-xs">
            {testing ? <><RefreshCw size={11} className="animate-spin" /> Test…</> : '🔌 Tester la connexion'}
          </button>
          <button onClick={saveConfig}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[9px] text-sm font-semibold transition-all',
              saved ? 'bg-ds-green/10 text-ds-green border border-ds-green/20' : 'text-white bg-gradient-to-r from-ds-blue to-ds-violet hover:opacity-90')}>
            {saved ? <><CheckCircle size={13} /> Enregistré !</> : <><Save size={13} /> Enregistrer</>}
          </button>
        </div>

        <div className="px-3 py-2.5 rounded-[9px] bg-ds-bg3 border border-ds-border text-[11px] text-ds-text3 leading-relaxed">
          💡 <strong className="text-ds-text2">Conseil :</strong> Groq est gratuit et ultra-rapide (Llama 3.3 70B). Créez un compte sur <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-ds-blue2 hover:underline">console.groq.com</a> et générez une clé API gratuitement en 2 minutes.
        </div>
      </div>

      {/* Profil CV */}
      {Object.keys(cv).length > 0 && (
        <div className="card">
          <h2 className="text-sm font-bold text-ds-text mb-4">👤 Profil CV</h2>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {([['Nom', 'nom'], ['Titre', 'titre'], ['Email', 'email'], ['TJM', 'tjm'], ['Localisation', 'localisation'], ['Disponibilité', 'disponibilite']] as [string, string][]).map(([label, key]) =>
              cv[key] ? (
                <div key={key}>
                  <div className="text-ds-text3 mb-0.5">{label}</div>
                  <div className="text-ds-text font-medium">{String(cv[key])}</div>
                </div>
              ) : null
            )}
          </div>
          <button onClick={() => router.push('/agent')} className="mt-3 text-xs text-ds-blue2 hover:underline">
            Modifier dans Agent IA → CV Editor
          </button>
        </div>
      )}

      {/* Danger zone */}
      <div className="card border-ds-rose/15">
        <h2 className="text-sm font-bold text-ds-rose mb-3 flex items-center gap-2"><AlertCircle size={14} /> Zone de danger</h2>
        <p className="text-xs text-ds-text3 mb-4">Supprime définitivement toutes vos données locales (missions, factures, contacts, candidatures). Les clés API sont conservées.</p>
        <button onClick={() => {
          if (!confirm('⚠️ Supprimer TOUTES les données ? Cette action est irréversible.')) return
          localStorage.removeItem('datasphere_os_v1')
          localStorage.removeItem('datasphere_ia_history')
          window.location.reload()
        }} className="btn-danger flex items-center gap-1.5 text-xs">
          <Trash2 size={12} /> Réinitialiser toutes les données
        </button>
      </div>
    </div>
  )
}
