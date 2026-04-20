// app/api/ai-proxy/route.ts
// ═══════════════════════════════════════════════════
// Proxy sécurisé pour les appels IA
// Les clés API ne sont JAMAIS exposées au client
// ═══════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Rate limiting simple (en production : utiliser Upstash Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now   = Date.now()
  const limit = rateLimitMap.get(userId)
  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (limit.count >= 20) return false // 20 req/min max
  limit.count++
  return true
}

export async function POST(req: NextRequest) {
  try {
    // 1. Vérifier l'auth Supabase
    const authHeader = req.headers.get('authorization')
    const token      = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    // 2. Rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Attendez 1 minute.' },
        { status: 429 }
      )
    }

    // 3. Récupérer le plan utilisateur
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('plan')
      .eq('user_id', user.id)
      .single()
    const plan = profile?.plan || 'free'

    // 4. Vérifier les limites du plan
    const body = await req.json()
    const { prompt, maxTokens = 1000, provider = 'groq', model } = body

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt requis' }, { status: 400 })
    }

    // Limite tokens selon le plan
    const tokenLimit = plan === 'free' ? 500 : plan === 'pro' ? 2000 : 4000
    const safeTokens = Math.min(maxTokens, tokenLimit)

    // 5. Appeler le provider IA côté serveur (clés sécurisées)
    let response: Response
    let result: string

    if (provider === 'groq') {
      const groqModel = model || 'llama-3.3-70b-versatile'
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model:      groqModel,
          max_tokens: safeTokens,
          messages:   [{ role: 'user', content: String(prompt) }],
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Erreur Groq')
      result = data.choices?.[0]?.message?.content || ''

    } else if (provider === 'anthropic') {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      model || 'claude-sonnet-4-20250514',
          max_tokens: safeTokens,
          messages:   [{ role: 'user', content: String(prompt) }],
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Erreur Anthropic')
      result = data.content?.[0]?.text || ''

    } else if (provider === 'openrouter') {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer':  process.env.NEXT_PUBLIC_APP_URL || 'https://datasphere-os.fr',
          'X-Title':       'DataSphere OS',
        },
        body: JSON.stringify({
          model:      model || 'meta-llama/llama-3.3-70b-instruct:free',
          max_tokens: safeTokens,
          messages:   [{ role: 'user', content: String(prompt) }],
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Erreur OpenRouter')
      result = data.choices?.[0]?.message?.content || ''

    } else {
      return NextResponse.json({ error: 'Provider non supporté' }, { status: 400 })
    }

    // 6. Logger l'usage (optionnel)
    await supabase.from('ai_usage').insert({
      user_id:  user.id,
      provider,
      tokens:   safeTokens,
      plan,
      created_at: new Date().toISOString(),
    }).then(() => {}) // fire-and-forget

    return NextResponse.json({ result, provider, plan })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur'
    console.error('[AI Proxy Error]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
