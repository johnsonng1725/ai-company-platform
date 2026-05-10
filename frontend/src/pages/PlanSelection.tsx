import { useNavigate } from 'react-router-dom'
import { Zap, Key, CheckCircle } from 'lucide-react'

export default function PlanSelection() {
  const navigate = useNavigate()

  function choosePlan(plan: 'free' | 'pro') {
    localStorage.setItem('plan', plan)
    navigate('/companies')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl animate-slide-up">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent shadow-lg shadow-accent/30">
            <Zap size={22} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">Choose Your Plan</h1>
            <p className="mt-1 text-sm text-ink-faint">How would you like to power your AI employees?</p>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-2 gap-4">

          {/* Free Plan */}
          <button
            onClick={() => choosePlan('free')}
            className="card group flex flex-col gap-5 p-6 text-left transition-all hover:border-white/20 hover:bg-white/5"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                   style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Key size={18} className="text-slate-300" />
              </div>
              <span className="rounded-full px-2.5 py-1 text-xs font-medium text-slate-400"
                    style={{ background: 'rgba(255,255,255,0.06)' }}>Free</span>
            </div>

            <div>
              <h2 className="text-base font-semibold text-white">Use My Own API Key</h2>
              <p className="mt-1 text-sm text-slate-500">Bring your own Anthropic key. Pay Anthropic directly, no markup.</p>
            </div>

            <div className="text-2xl font-bold text-white">
              RM0<span className="text-sm font-normal text-slate-500">/month</span>
            </div>

            <ul className="flex flex-col gap-2">
              {[
                'Unlimited AI employees',
                'All platform features',
                'Pay Anthropic directly',
                'Full control over usage',
              ].map(f => (
                <li key={f} className="flex items-center gap-2 text-xs text-slate-400">
                  <CheckCircle size={13} className="shrink-0 text-slate-500" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-auto rounded-xl border border-white/10 py-2.5 text-center text-sm font-medium text-slate-300 transition-all group-hover:border-white/20 group-hover:text-white">
              Get Started Free
            </div>
          </button>

          {/* Pro Plan */}
          <button
            onClick={() => choosePlan('pro')}
            className="card group relative flex flex-col gap-5 p-6 text-left transition-all hover:border-accent/50 hover:bg-accent/5"
            style={{ borderColor: 'rgba(13,148,136,0.3)' }}
          >
            {/* Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}>
                Most Popular
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                   style={{ background: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.3)' }}>
                <Zap size={18} className="text-accent-light" />
              </div>
              <span className="rounded-full px-2.5 py-1 text-xs font-medium text-accent-light"
                    style={{ background: 'rgba(13,148,136,0.12)' }}>Pro</span>
            </div>

            <div>
              <h2 className="text-base font-semibold text-white">Use 1nexio Platform Key</h2>
              <p className="mt-1 text-sm text-slate-500">We manage everything. No API key needed — just start hiring AI employees.</p>
            </div>

            <div className="text-2xl font-bold text-white">
              RM129<span className="text-sm font-normal text-slate-500">/month</span>
            </div>

            <ul className="flex flex-col gap-2">
              {[
                'Unlimited AI employees',
                'All platform features',
                'No API key setup required',
                'Managed & always up to date',
              ].map(f => (
                <li key={f} className="flex items-center gap-2 text-xs text-slate-400">
                  <CheckCircle size={13} className="shrink-0 text-accent-light" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-auto rounded-xl py-2.5 text-center text-sm font-medium text-white transition-all"
                 style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}>
              Choose Pro
            </div>
          </button>
        </div>

        <p className="mt-5 text-center text-xs text-slate-600">
          You can change your plan anytime in Settings
        </p>
      </div>
    </div>
  )
}
