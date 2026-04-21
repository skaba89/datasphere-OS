import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code      = searchParams.get('code')
  const next      = searchParams.get('next') ?? '/dashboard'
  const error     = searchParams.get('error')
  const errorDesc = searchParams.get('error_description')

  if (error) {
    console.error('[Auth Callback] OAuth error:', error, errorDesc)
    return NextResponse.redirect(
      `${origin}/auth?error=${encodeURIComponent(errorDesc || error)}`
    )
  }

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (!exchangeError) return response
    console.error('[Auth Callback] Exchange error:', exchangeError)
  }

  return NextResponse.redirect(`${origin}/auth?error=callback_error`)
}
