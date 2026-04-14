import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Zap } from 'lucide-react'

/**
 * Handles the OAuth redirect back from Google / Facebook.
 * URL: /auth/callback?token=<jwt>  or  /auth/callback?error=<reason>
 */
export default function AuthCallback() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  useEffect(() => {
    const token = params.get('token')
    const error = params.get('error')

    if (token) {
      localStorage.setItem('token', token)
      navigate('/companies', { replace: true })
    } else {
      // OAuth was cancelled or failed — go back to login with message
      navigate(`/login?error=${error ?? 'oauth_failed'}`, { replace: true })
    }
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent shadow-lg shadow-accent/30">
          <Zap size={20} className="text-white" />
        </div>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="text-sm text-ink-muted">Signing you in…</p>
      </div>
    </div>
  )
}
