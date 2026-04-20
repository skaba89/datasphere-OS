// app/api/health/route.ts
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET() {
  return NextResponse.json({
    status:    'ok',
    version:   '21',
    timestamp: new Date().toISOString(),
    env: {
      supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      stripe:   !!process.env.STRIPE_SECRET_KEY,
      groq:     !!process.env.GROQ_API_KEY,
    },
  })
}
