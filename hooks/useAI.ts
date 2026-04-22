import { useState, useCallback } from 'react'

interface AIConfig {
  provider: string
  groqKey: string
  openrouterKey: string
  anthropicKey: string
}

function getConfig(): AIConfig {
  try {
    const v = typeof window !== 'undefined' && localStorage.getItem('datasphere_ai_config')
    return v ? JSON.parse(v) : { provider: 'groq', groqKey: '', openrouterKey: '', anthropicKey: '' }
  } catch {
    return { provider: 'groq', groqKey: '', openrouterKey: '', anthropicKey: '' }
  }
}

function hasKey(cfg: AIConfig): boolean {
  return !!(cfg.provider === 'groq'        ? cfg.groqKey
          : cfg.provider === 'openrouter'  ? cfg.openrouterKey
          : cfg.anthropicKey)
}

export function useAI() {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const generate = useCallback(async (prompt: string, maxTokens = 600): Promise<string> => {
    setLoading(true)
    setError(null)

    const cfg = getConfig()

    // ── 1. Proxy serveur (si clé GROQ_API_KEY configurée côté serveur) ──────
    // On tente sans token — le proxy utilisera la clé serveur si disponible
    try {
      const serverRes = await fetch('/api/ai-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, maxTokens, provider: cfg.provider }),
        signal: AbortSignal.timeout(15000),
      })
      if (serverRes.ok) {
        const data = await serverRes.json()
        const text = data.result || data.text || ''
        if (text) { setLoading(false); return text }
      }
    } catch { /* timeout ou erreur réseau → fallback client */ }

    // ── 2. Appel direct navigateur avec la clé utilisateur ───────────────────
    const key = cfg.provider === 'groq'       ? cfg.groqKey
              : cfg.provider === 'openrouter' ? cfg.openrouterKey
              : cfg.anthropicKey

    if (!key) {
      setError('Aucune clé IA configurée. Allez dans ⚙️ Paramètres pour ajouter votre clé Groq (gratuite).')
      setLoading(false)
      return ''
    }

    try {
      const url =
        cfg.provider === 'groq'       ? 'https://api.groq.com/openai/v1/chat/completions'
      : cfg.provider === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions'
      :                                 'https://api.anthropic.com/v1/messages'

      const model =
        cfg.provider === 'groq'       ? 'llama-3.3-70b-versatile'
      : cfg.provider === 'openrouter' ? 'meta-llama/llama-3.3-70b-instruct:free'
      :                                 'claude-haiku-4-5-20251001'

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (cfg.provider === 'anthropic') {
        headers['x-api-key'] = key
        headers['anthropic-version'] = '2023-06-01'
      } else {
        headers['Authorization'] = `Bearer ${key}`
        if (cfg.provider === 'openrouter') {
          headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : ''
          headers['X-Title'] = 'DataSphere OS'
        }
      }

      const bodyObj =
        cfg.provider === 'anthropic'
          ? { model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }
          : { model, max_tokens: maxTokens, temperature: 0.7, messages: [{ role: 'user', content: prompt }] }

      const doFetch = () =>
        fetch(url, { method: 'POST', headers, body: JSON.stringify(bodyObj), signal: AbortSignal.timeout(20000) })

      let r = await doFetch()

      // Rate limit → retry après 3s
      if (r.status === 429) {
        await new Promise(res => setTimeout(res, 3000))
        r = await doFetch()
      }

      if (!r.ok) {
        const errData = await r.json().catch(() => ({}))
        throw new Error(errData?.error?.message || `Erreur ${r.status} — vérifiez votre clé ${cfg.provider}`)
      }

      const data = await r.json()
      return cfg.provider === 'anthropic'
        ? (data.content?.[0]?.text || '')
        : (data.choices?.[0]?.message?.content || '')

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(msg)
      return ''
    } finally {
      setLoading(false)
    }
  }, [])

  const isConfigured = useCallback((): boolean => {
    return hasKey(getConfig())
  }, [])

  return { generate, loading, error, isConfigured }
}
