// middleware.ts
// ═══════════════════════════════════════════════════
// Middleware Next.js — Protection des routes
// Vérifie l'authentification Supabase sur chaque requête
// Routes publiques : /auth, /pricing, /api/stripe/webhook
// Routes protégées : tout le reste
// ═══════════════════════════════════════════════════
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Routes accessibles sans authentification
const PUBLIC_ROUTES = [
  '/auth',
  '/pricing',
  '/api/stripe/webhook',  // webhook Stripe doit être public
  '/api/offers',          // offres lisibles sans auth
  '/api/health',
  '/_next',
  '/favicon',
  '/manifest.json',
  '/icon-',
  '/screenshot-',
]

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Laisser passer les routes publiques
  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  try {
    // Créer le client Supabase côté serveur
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
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

    // Vérifier la session
    const { data: { user } } = await supabase.auth.getUser()

    // Si pas connecté → rediriger vers /auth
    if (!user && !pathname.startsWith('/auth')) {
      const redirectUrl = new URL('/auth', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Si connecté et sur /auth → rediriger vers dashboard
    if (user && pathname === '/auth') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return response

  } catch {
    // En cas d'erreur Supabase (ex: mauvaises clés env)
    // Laisser passer en mode dégradé (localStorage auth)
    return response
  }
}

export const config = {
  matcher: [
    // Appliquer sur toutes les routes sauf les assets statiques
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
