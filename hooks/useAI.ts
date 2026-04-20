import { useState, useCallback } from 'react'

interface AIConfig { provider: string; groqKey: string; openrouterKey: string; anthropicKey: string }

function getConfig(): AIConfig {
  try {
    const v = localStorage.getItem('datasphere_ai_config')
    return v ? JSON.parse(v) : { provider: 'groq', groqKey: '', openrouterKey: '', anthropicKey: '' }
  } catch { return { provider: 'groq', groqKey: '', openrouterKey: '', anthropicKey: '' } }
}

export function useAI() {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const generate = useCallback(async (prompt: string, maxTokens = 500): Promise<string> => {
    setLoading(true); setError(null)

    try {
      // Essayer d'abord via le proxy serveur (Netlify function)
      const token = ''
      const serverRes = await fetch('/api/ai-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ prompt, maxTokens }),
      })
      if (serverRes.ok) {
        const data = await serverRes.json()
        return data.text || ''
      }
    } catch { /* fallback client */ }

    // Fallback : appel direct depuis le navigateur avec la clé locale
    try {
      const cfg = getConfig()
      const key = cfg.provider === 'groq' ? cfg.groqKey
                : cfg.provider === 'openrouter' ? cfg.openrouterKey
                : cfg.anthropicKey

      if (!key) {
        setError('Aucune clé IA configurée. Rendez-vous dans les Paramètres.')
        return ''
      }

      const url = cfg.provider === 'groq'        ? 'https://api.groq.com/openai/v1/chat/completions'
                : cfg.provider === 'openrouter'  ? 'https://openrouter.ai/api/v1/chat/completions'
                : 'https://api.anthropic.com/v1/messages'

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (cfg.provider === 'anthropic') {
        headers['x-api-key'] = key
        headers['anthropic-version'] = '2023-06-01'
      } else {
        headers['Authorization'] = `Bearer ${key}`
        if (cfg.provider === 'openrouter') {
          headers['HTTP-Referer'] = 'https://datasphere-os.netlify.app'
          headers['X-Title'] = 'DataSphere OS'
        }
      }

      const model = cfg.provider === 'groq'       ? 'llama-3.3-70b-versatile'
                  : cfg.provider === 'openrouter' ? 'meta-llama/llama-3.3-70b-instruct:free'
                  : 'claude-haiku-4-5-20251001'

      const body = cfg.provider === 'anthropic'
        ? { model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }
        : { model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }

      const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })

      // Gestion 429 — retry une fois
      if (r.status === 429) {
        await new Promise(res => setTimeout(res, 3000))
        const r2 = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
        if (!r2.ok) throw new Error(`HTTP ${r2.status}`)
        const d2 = await r2.json()
        return cfg.provider === 'anthropic'
          ? d2.content?.[0]?.text || ''
          : d2.choices?.[0]?.message?.content || ''
      }

      if (!r.ok) { const e = await r.json(); throw new Error(e.error?.message || `HTTP ${r.status}`) }

      const data = await r.json()
      return cfg.provider === 'anthropic'
        ? data.content?.[0]?.text || ''
        : data.choices?.[0]?.message?.content || ''

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(msg)
      return ''
    } finally {
      setLoading(false)
    }
  }, [])

  return { generate, loading, error }
}
