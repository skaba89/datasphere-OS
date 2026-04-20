'use client'
// app/auth/page.tsx
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

function AuthForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [mode,     setMode]     = useState<'login' | 'signup' | 'reset'>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')

  const redirect = searchParams.get('redirect') || '/dashboard'
  const urlError = searchParams.get('error')

  useEffect(() => {
    if (urlError) setError(decodeURIComponent(urlError))
  }, [urlError])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    const supabase = getSupabaseBrowser()

    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/api/auth/callback?next=/auth?mode=update_password`,
        })
        if (error) throw error
        setSuccess('Email envoyé ! Vérifiez votre boîte.')
        return
      }

      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
        })
        if (error) throw error
        setSuccess('Compte créé ! Vérifiez votre email pour confirmer.')
        return
      }

      // Login
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push(redirect)

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur'
      setError(
        msg.includes('Invalid login') ? 'Email ou mot de passe incorrect.' :
        msg.includes('Email not confirmed') ? 'Confirmez votre email avant de vous connecter.' :
        msg.includes('User already registered') ? 'Un compte existe déjà avec cet email.' :
        msg
      )
    } finally {
      setLoading(false)
    }
  }

  const titles = {
    login:  'Connexion',
    signup: 'Créer un compte',
    reset:  'Mot de passe oublié',
  }

  return (
    <div className="min-h-screen bg-ds-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-[14px] mb-4
            bg-gradient-to-br from-ds-blue to-ds-violet
            items-center justify-center text-white text-xl font-bold
            shadow-[0_8px_24px_rgba(91,127,255,.4)]">
            ◈
          </div>
          <h1 className="text-xl font-extrabold text-ds-text tracking-tight">
            Data<span className="bg-gradient-to-r from-ds-blue2 to-ds-violet
              bg-clip-text text-transparent">Sphere OS</span>
          </h1>
          <p className="text-sm text-ds-text3 mt-1">{titles[mode]}</p>
        </div>

        {/* Card */}
        <div className="bg-ds-bg2 border border-ds-border2 rounded-[20px] p-6
          shadow-[0_20px_60px_rgba(0,0,0,.5)]">

          {/* Erreur / Succès */}
          {error && (
            <div className="mb-4 px-3 py-2.5 bg-ds-rose/8 border border-ds-rose/25
              rounded-[10px] text-xs text-ds-rose">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 px-3 py-2.5 bg-ds-green/8 border border-ds-green/25
              rounded-[10px] text-xs text-ds-green">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Email */}
            <div>
              <label className="block text-[11px] font-semibold text-ds-text2 mb-1.5">
                Email
              </label>
              <input
                type="email" required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="inp"
                autoComplete="email"
              />
            </div>

            {/* Mot de passe */}
            {mode !== 'reset' && (
              <div>
                <label className="block text-[11px] font-semibold text-ds-text2 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'} required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={8}
                    className="inp pr-10"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2
                      text-ds-text3 hover:text-ds-text2 transition-colors"
                    aria-label={showPass ? 'Masquer' : 'Afficher'}
                  >
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {mode === 'signup' && (
                  <p className="text-[10px] text-ds-text3 mt-1">8 caractères minimum</p>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary mt-2 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {mode === 'login'  && 'Se connecter'}
              {mode === 'signup' && 'Créer mon compte'}
              {mode === 'reset'  && 'Envoyer le lien'}
            </button>
          </form>

          {/* Links */}
          <div className="mt-4 pt-4 border-t border-ds-border space-y-2 text-center">
            {mode === 'login' && (
              <>
                <button
                  onClick={() => { setMode('reset'); setError(''); setSuccess('') }}
                  className="block w-full text-xs text-ds-text3 hover:text-ds-blue2 transition-colors"
                >
                  Mot de passe oublié ?
                </button>
                <button
                  onClick={() => { setMode('signup'); setError(''); setSuccess('') }}
                  className="block w-full text-xs text-ds-text2 hover:text-ds-text transition-colors"
                >
                  Pas de compte ? <span className="text-ds-blue2 font-semibold">Créer un compte</span>
                </button>
              </>
            )}
            {(mode === 'signup' || mode === 'reset') && (
              <button
                onClick={() => { setMode('login'); setError(''); setSuccess('') }}
                className="text-xs text-ds-text3 hover:text-ds-text2 transition-colors"
              >
                ← Retour à la connexion
              </button>
            )}
          </div>
        </div>

        {/* Pricing link */}
        <p className="text-center text-xs text-ds-text3 mt-5">
          Pas encore convaincu ?{' '}
          <a href="/pricing" className="text-ds-blue2 hover:underline font-medium">
            Voir les plans →
          </a>
        </p>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}
