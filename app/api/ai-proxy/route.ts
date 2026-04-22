// app/api/ai-proxy/route.ts
// Proxy IA côté serveur — utilise les clés serveur si présentes, sinon 503
import { NextRequest, NextResponse } from 'next/server'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRate(ip: string): boolean {
  const now = Date.now()
  const l = rateLimitMap.get(ip)
  if (!l || now > l.resetAt) { rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 }); return true }
  if (l.count >= 30) return false
  l.count++; return true
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

  if (!checkRate(ip)) {
    return NextResponse.json({ error: 'Trop de requêtes — attendez 1 minute' }, { status: 429 })
  }

  let body: { prompt?: string; maxTokens?: number; provider?: string; model?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 }) }

  const { prompt, maxTokens = 600, provider = 'groq', model } = body
  if (!prompt) return NextResponse.json({ error: 'prompt requis' }, { status: 400 })

  // ── Groq (clé serveur) ───────────────────────────────────────────
  if (provider === 'groq' || (!provider && process.env.GROQ_API_KEY)) {
    const key = process.env.GROQ_API_KEY
    if (key) {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({
            model: model || 'llama-3.3-70b-versatile',
            max_tokens: maxTokens,
            temperature: 0.7,
            messages: [{ role: 'user', content: String(prompt) }],
          }),
          signal: AbortSignal.timeout(18000),
        })
        const data = await r.json()
        if (!r.ok) throw new Error(data.error?.message || `Groq ${r.status}`)
        const result = data.choices?.[0]?.message?.content || ''
        return NextResponse.json({ result, provider: 'groq' })
      } catch (e) {
        // Groq a échoué → essayer OpenRouter
        console.error('[ai-proxy] Groq error:', e)
      }
    }
  }

  // ── OpenRouter (clé serveur) ─────────────────────────────────────
  if (process.env.OPENROUTER_API_KEY) {
    const key = process.env.OPENROUTER_API_KEY
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://datasphere-os.netlify.app',
          'X-Title': 'DataSphere OS',
        },
        body: JSON.stringify({
          model: model || 'meta-llama/llama-3.3-70b-instruct:free',
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: String(prompt) }],
        }),
        signal: AbortSignal.timeout(18000),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error?.message || `OpenRouter ${r.status}`)
      const result = data.choices?.[0]?.message?.content || ''
      return NextResponse.json({ result, provider: 'openrouter' })
    } catch (e) {
      console.error('[ai-proxy] OpenRouter error:', e)
    }
  }

  // ── Anthropic (clé serveur) ──────────────────────────────────────
  if (process.env.ANTHROPIC_API_KEY) {
    const key = process.env.ANTHROPIC_API_KEY
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model || 'claude-haiku-4-5-20251001',
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: String(prompt) }],
        }),
        signal: AbortSignal.timeout(18000),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error?.message || `Anthropic ${r.status}`)
      const result = data.content?.[0]?.text || ''
      return NextResponse.json({ result, provider: 'anthropic' })
    } catch (e) {
      console.error('[ai-proxy] Anthropic error:', e)
    }
  }

  // Aucune clé serveur disponible → le client utilisera sa propre clé
  return NextResponse.json(
    { error: 'Aucune clé IA côté serveur — utilisez votre clé dans les Paramètres' },
    { status: 503 }
  )
}
