'use client'
import { useState, useCallback } from 'react'

interface UseAIOptions {
  provider?: 'groq' | 'openrouter' | 'anthropic'
  model?:    string
  onSuccess?: (result: string) => void
  onError?:   (error: string) => void
}

export function useAI(options: UseAIOptions = {}) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [result,  setResult]  = useState<string | null>(null)

  const generate = useCallback(async (prompt: string, maxTokens = 1000): Promise<string | null> => {
    setLoading(true); setError(null)

    try {
      // Essayer le proxy serveur d'abord
      let token = ''
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const sb = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data } = await sb.auth.getSession()
        token = data.session?.access_token || ''
      } catch {}

      if (token) {
        const res = await fetch('/api/ai-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ prompt, maxTokens, provider: options.provider || 'groq', model: options.model }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`)
        setResult(data.result); options.onSuccess?.(data.result); return data.result
      }

      // Fallback clé localStorage
      const aiConfig = JSON.parse(localStorage.getItem('dsos_ai_config') || '{}')
      if (aiConfig.groqKey) {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiConfig.groqKey}` },
          body: JSON.stringify({ model: options.model || 'llama-3.3-70b-versatile', max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
        })
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content || ''
        setResult(text); options.onSuccess?.(text); return text
      }

      throw new Error('Aucune clé API configurée')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur'
      setError(msg); options.onError?.(msg); return null
    } finally {
      setLoading(false)
    }
  }, [options])

  return { generate, loading, error, result, clear: () => { setResult(null); setError(null) } }
}
