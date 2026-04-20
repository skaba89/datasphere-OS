'use client'
import { useEffect, useState } from 'react'
import { Save, Eye, EyeOff, Trash2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIConfig { provider: string; groqKey: string; openrouterKey: string; anthropicKey: string }
function load<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } }
function save(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

export default function SettingsPage() {
  const [aiConfig, setAiConfig] = useState<AIConfig>({ provider: 'groq', groqKey: '', openrouterKey: '', anthropicKey: '' })
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [saved, setSaved]       = useState(false)
  const [testMsg, setTestMsg]   = useState('')
  const [testing, setTesting]   = useState(false)
  const [cv, setCv]             = useState<Record<string, unknown>>({})

  useEffect(() => {
    const cfg = load<AIConfig>('datasphere_ai_config', { provider: 'groq', groqKey: '', openrouterKey: '', anthropicKey: '' })
    setAiConfig(cfg)
    const s = load<{ cv?: Record<string, unknown> }>('datasphere_os_v1', {})
    setCv(s.cv || {})
    document.title = 'Paramètres — DataSphere OS'
  }, [])

  function saveConfig() {
    save('datasphere_ai_config', aiConfig)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function testConnection() {
    const key = aiConfig.provider === 'groq' ? aiConfig.groqKey : aiConfig.provider === 'openrouter' ? aiConfig.openrouterKey : aiConfig.anthropicKey
    if (!key) { setTestMsg('❌ Aucune clé configurée pour ce provider'); return }
    setTesting(true); setTestMsg('')
    try {
      const url = aiConfig.provider === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions'
                : aiConfig.provider === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions'
                : 'https://api.anthropic.com/v1/messages'
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (aiConfig.provider === 'anthropic') { headers['x-api-key'] = key; headers['anthropic-version'] = '2023-06-01' }
      else headers['Authorization'] = 'Bearer ' + key
      const body = aiConfig.provider === 'anthropic'
        ? { model: 'claude-haiku-4-5-20251001', max_tokens: 10, messages: [{ role: 'user', content: 'Pong' }] }
        : { model: aiConfig.provider === 'groq' ? 'llama-3.3-70b-versatile' : 'meta-llama/llama-3.1-8b-instruct:free', max_tokens: 10, messages: [{ role: 'user', content: 'Pong' }] }
      const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
      if (r.ok) setTestMsg('✅ Connexion réussie !')
      else { const e = await r.json(); setTestMsg('❌ ' + (e.error?.message || `HTTP ${r.status}`)) }
    } catch (e) {
      setTestMsg('❌ Erreur réseau : ' + (e instanceof Error ? e.message : 'inconnue'))
    }
    setTesting(false)
  }

  function clearData() {
    if (!confirm('⚠️ Supprimer TOUTES les données (missions, factures, contacts...) ? Cette action est irréversible.')) return
    localStorage.removeItem('datasphere_os_v1')
    window.location.reload()
  }

  const f = (k: keyof AIConfig) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setAiConfig(v => ({ ...v, [k]: e.target.value }))

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-extrabold text-ds-text tracking-tight">Paramètres</h1>
        <p className="text-sm text-ds-text3 mt-0.5">Configuration de l'IA et gestion des données</p>
      </div>

      {/* Config IA */}
      <div className="card">
        <h2 className="text-sm font-bold text-ds-text mb-4">⚙️ Configuration IA</h2>
        <div className="space-y-4">
          <div>
            <label className="form-label">Provider IA</label>
            <select className="inp" value={aiConfig.provider} onChange={f('provider')}>
              <option value="groq">Groq (gratuit) — Llama 3.3 70B</option>
              <option value="openrouter">OpenRouter (gratuit) — 29 modèles</option>
              <option value="anthropic">Anthropic (payant) — Claude Sonnet</option>
            </select>
          </div>
          {[
            { key: 'groqKey' as keyof AIConfig, label: 'Groq API Key', placeholder: 'gsk_...', hint: 'console.groq.com → API Keys' },
            { key: 'openrouterKey' as keyof AIConfig, label: 'OpenRouter API Key', placeholder: 'sk-or-...', hint: 'openrouter.ai/keys' },
            { key: 'anthropicKey' as keyof AIConfig, label: 'Anthropic API Key', placeholder: 'sk-ant-...', hint: 'console.anthropic.com/settings/keys' },
          ].map(({ key, label, placeholder, hint }) => (
            <div key={key}>
              <label className="form-label">{label}</label>
              <div className="relative">
                <input type={showKeys[key] ? 'text' : 'password'} className="inp pr-10"
                  value={aiConfig[key]} onChange={f(key)} placeholder={placeholder} />
                <button type="button" onClick={() => setShowKeys(v => ({ ...v, [key]: !v[key] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ds-text3 hover:text-ds-text2">
                  {showKeys[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-[10px] text-ds-text3 mt-1">Obtenir : <a href={`https://${hint.split(' → ')[0]}`} target="_blank" rel="noopener noreferrer" className="text-ds-blue2 hover:underline">{hint}</a></p>
            </div>
          ))}
          {testMsg && (
            <div className={cn('px-3 py-2 rounded-ds-sm text-xs border', testMsg.startsWith('✅') ? 'bg-ds-green/8 border-ds-green/20 text-ds-green' : 'bg-ds-rose/8 border-ds-rose/20 text-ds-rose')}>
              {testMsg}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={testConnection} disabled={testing}
              className="btn-secondary flex-1">{testing ? '⟳ Test...' : '🔌 Tester la connexion'}</button>
            <button onClick={saveConfig}
              className={cn('flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-ds-sm text-sm font-semibold transition-all',
                saved ? 'bg-ds-green/10 text-ds-green border border-ds-green/20' : 'text-white bg-gradient-to-r from-ds-blue to-ds-violet hover:opacity-90')}>
              <Save size={13} />{saved ? 'Enregistré !' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>

      {/* Profil */}
      <div className="card">
        <h2 className="text-sm font-bold text-ds-text mb-4">👤 Profil CV</h2>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {[['Nom', String(cv.nom || '—')], ['Titre', String(cv.titre || '—')], ['Email', String(cv.email || '—')], ['TJM', String(cv.tjm || '—')]].map(([k, v]) => (
            <div key={k}>
              <div className="text-ds-text3 mb-0.5">{k}</div>
              <div className="text-ds-text font-medium">{v}</div>
            </div>
          ))}
        </div>
        <a href="/agent" className="mt-3 block text-xs text-ds-blue2 hover:underline">Modifier dans CV Editor →</a>
      </div>

      {/* Données */}
      <div className="card border-ds-rose/20">
        <h2 className="text-sm font-bold text-ds-rose mb-3 flex items-center gap-2"><AlertCircle size={14} /> Zone de danger</h2>
        <p className="text-xs text-ds-text3 mb-3">Supprime définitivement toutes vos données locales (missions, factures, contacts, candidatures). Les clés API sont conservées.</p>
        <button onClick={clearData} className="btn-danger flex items-center gap-1.5"><Trash2 size={13} /> Réinitialiser les données</button>
      </div>
    </div>
  )
}
