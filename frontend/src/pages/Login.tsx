import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Zap, Loader2 } from 'lucide-react'
import { auth } from '../lib/api'

const REGISTRATIONS_OPEN = true

/* ── Social button icons ── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.269h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
    </svg>
  )
}


export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [mode, setMode]       = useState<'login' | 'register'>('login')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]       = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  // Show error from OAuth redirect (e.g. ?error=google_cancelled)
  useEffect(() => {
    const oauthError = searchParams.get('error')
    if (oauthError === 'google_cancelled') setError('Google sign-in was cancelled.')
    else if (oauthError === 'facebook_cancelled') setError('Facebook sign-in was cancelled.')
    else if (oauthError) setError('Social sign-in failed. Please try again.')
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = mode === 'login'
        ? await auth.login(email, password)
        : await auth.register(email, password, name)
      localStorage.setItem('token', res.access_token)
      navigate('/companies')
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function oauthLogin(provider: 'google' | 'facebook') {
    window.location.href = `/api/auth/${provider}`
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent shadow-lg shadow-accent/30">
            <Zap size={22} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">1nexio</h1>
            <p className="mt-1 text-sm text-ink-faint">Your AI-powered business team</p>
          </div>
        </div>

        {/* Card */}
        <div className="card p-6">
          <h2 className="mb-5 text-base font-semibold text-white">
            {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </h2>

          {/* Social login buttons */}
          <div className="flex flex-col gap-2.5 mb-5">
            <button onClick={() => oauthLogin('google')}
              className="flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-200 transition-all hover:bg-white/[0.08] hover:border-white/20 active:scale-95">
              <GoogleIcon />
              Continue with Google
            </button>
            <button onClick={() => oauthLogin('facebook')}
              className="flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-200 transition-all hover:bg-white/[0.08] hover:border-white/20 active:scale-95">
              <FacebookIcon />
              Continue with Facebook
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.07]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-surface-card px-3 text-xs text-ink-faint">or continue with email</span>
            </div>
          </div>

          {/* Email / Password form */}
          <form onSubmit={submit} className="flex flex-col gap-3.5">
            {mode === 'register' && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-faint">Full Name</label>
                <input className="input" placeholder="Your name" value={name}
                  onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-faint">Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-faint">Password</label>
              <input className="input" type="password" placeholder="••••••••" value={password}
                onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>

            {error && (
              <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-400 border border-red-500/20">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary justify-center py-2.5 mt-0.5">
              {loading && <Loader2 size={15} className="animate-spin" />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {REGISTRATIONS_OPEN && (
            <p className="mt-4 text-center text-xs text-ink-faint">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
                className="text-accent-light hover:underline font-medium">
                {mode === 'login' ? 'Sign up free' : 'Sign in'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
