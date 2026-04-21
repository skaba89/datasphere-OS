import { type NextRequest, NextResponse } from 'next/server'

// Routes toujours accessibles sans authentification
const PUBLIC_ROUTES = [
  '/auth',
  '/pricing',
  '/api/',
  '/_next',
  '/favicon',
  '/manifest.json',
  '/icon-',
]

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Routes publiques → toujours laisser passer
  if (isPublic(pathname)) return NextResponse.next()

  // Si Supabase n'est pas configuré (env vars absentes ou placeholder)
  // → on laisse passer sans vérification d'auth
  // L'app fonctionne en mode "local-only" avec localStorage
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const isSupabaseConfigured =
    supabaseUrl.includes('.supabase.co') &&
    !supabaseUrl.includes('placeholder')

  if (!isSupabaseConfigured) {
    return NextResponse.next()
  }

  // Supabase configuré → vérification auth
  try {
    const { createServerClient } = await import('@supabase/ssr')
    let response = NextResponse.next({ request })

    const supabase = createServerClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user && !pathname.startsWith('/auth')) {
      const redirectUrl = new URL('/auth', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    if (user && pathname === '/auth') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return response
  } catch {
    // Erreur Supabase → laisser passer (mode dégradé)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
