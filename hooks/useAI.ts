'use client'
// hooks/useAI.ts
// ═══════════════════════════════════════════════════
// Hook pour les appels IA via le proxy sécurisé
// Les clés API ne transitent JAMAIS côté client
// ═══════════════════════════════════════════════════
import { useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

interface UseAIOptions {
  provider?: 'groq' | 'openrouter' | 'anthropic'
  model?:    string
  onSuccess?: (result: string) => void
  onError?:   (error: string) => void
}

interface UseAIReturn {
  generate:  (prompt: string, maxTokens?: number) => Promise<string | null>
  loading:   boolean
  error:     string | null
  result:    string | null
  clear:     () => void
}

export function useAI(options: UseAIOptions = {}): UseAIReturn {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [result,  setResult]  = useState<string | null>(null)

  const generate = useCallback(async (
    prompt: string,
    maxTokens = 1000
  ): Promise<string | null> => {
    setLoading(true)
    setError(null)

    try {
      // Récupérer le token Supabase si l'utilisateur est connecté
      let token = ''
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data } = await supabase.auth.getSession()
        token = data.session?.access_token || ''
      } catch {}

      // Si pas de token, essayer en mode dégradé (localStorage keys)
      if (!token) {
        const aiResult = await callAIDirect(prompt, maxTokens, options)
        setResult(aiResult)
        options.onSuccess?.(aiResult)
        return aiResult
      }

      // Appel via le proxy sécurisé
      const res = await fetch('/api/ai-proxy', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt,
          maxTokens,
          provider: options.provider || 'groq',
          model:    options.model,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || `Erreur ${res.status}`)
      }

      const text = data.result || ''
      setResult(text)
      options.onSuccess?.(text)
      return text

    } catch (e) {
      const msg = (e as Error).message
      setError(msg)
      options.onError?.(msg)
      return null
    } finally {
      setLoading(false)
    }
  }, [options])

  return {
    generate,
    loading,
    error,
    result,
    clear: () => { setResult(null); setError(null) },
  }
}

// Fallback direct (clé côté client — mode dégradé sans auth)
async function callAIDirect(
  prompt: string,
  maxTokens: number,
  options: UseAIOptions
): Promise<string> {
  // Récupérer la clé depuis localStorage (ancienne méthode v21)
  let aiConfig: {groqKey?:string;anthropicKey?:string;openrouterKey?:string;provider?:string} = {}
  try {
    const stored = localStorage.getItem('dsos_ai_config')
    if (stored) aiConfig = JSON.parse(stored)
  } catch {}

  const provider = options.provider || aiConfig.provider || 'groq'

  if (provider === 'groq' && aiConfig.groqKey) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${aiConfig.groqKey}`,
      },
      body: JSON.stringify({
        model:      options.model || 'llama-3.3-70b-versatile',
        max_tokens: maxTokens,
        messages:   [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  }

  if (provider === 'anthropic' && aiConfig.anthropicKey) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         aiConfig.anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      options.model || 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        messages:   [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    return data.content?.[0]?.text || ''
  }

  throw new Error('Aucune clé API configurée. Connectez-vous ou configurez une clé IA.')
}
