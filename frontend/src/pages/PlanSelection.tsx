import { useNavigate } from 'react-router-dom'
import { Zap, Key, CheckCircle, Crown, Star } from 'lucide-react'
import { auth } from '../lib/api'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 'RM0',
    period: '/month',
    tagline: 'Try it out',
    description: 'Get started with your own Anthropic API key.',
    keyType: 'own',
    employees: '3 AI employees',
    tasks: '30 tasks / month',
    icon: Key,
    iconColor: 'text-slate-400',
    iconBg: 'rgba(255,255,255,0.06)',
    iconBorder: 'rgba(255,255,255,0.1)',
    badge: null,
    features: [
      '3 AI employees',
      '30 tasks per month',
      'All core features',
      'Bring your own API key',
    ],
    cta: 'Get Started Free',
    ctaStyle: 'border border-white/10 text-slate-300 hover:border-white/20 hover:text-white',
    popular: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 'RM59',
    period: '/month',
    tagline: 'Own key, no limits',
    description: 'Unlock everything. Bring your own key and pay Anthropic directly.',
    keyType: 'own',
    employees: 'Unlimited employees',
    tasks: 'Unlimited tasks',
    icon: Star,
    iconColor: 'text-blue-400',
    iconBg: 'rgba(59,130,246,0.12)',
    iconBorder: 'rgba(59,130,246,0.25)',
    badge: null,
    features: [
      'Unlimited AI employees',
      'Unlimited tasks',
      'All features unlocked',
      'Bring your own API key',
      'You pay Anthropic directly',
    ],
    cta: 'Choose Starter',
    ctaStyle: 'border border-blue-500/40 text-blue-300 hover:border-blue-400 hover:text-blue-200',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'RM129',
    period: '/month',
    tagline: 'Most popular',
    description: 'Use our managed platform key. No API setup needed.',
    keyType: 'platform',
    employees: '10 AI employees',
    tasks: '300 tasks / month',
    icon: Zap,
    iconColor: 'text-accent-light',
    iconBg: 'rgba(13,148,136,0.15)',
    iconBorder: 'rgba(13,148,136,0.3)',
    badge: 'Most Popular',
    features: [
      '10 AI employees',
      '300 tasks per month',
      'All features unlocked',
      '1nexio platform key included',
      'No API setup required',
    ],
    cta: 'Choose Pro',
    ctaStyle: 'bg-accent text-white hover:bg-accent-light',
    popular: true,
  },
  {
    id: 'max',
    name: 'Max',
    price: 'RM299',
    period: '/month',
    tagline: 'Unlimited power',
    description: 'Maximum usage with our platform key. No limits.',
    keyType: 'platform',
    employees: 'Unlimited employees',
    tasks: '1,000 tasks / month',
    icon: Crown,
    iconColor: 'text-amber-400',
    iconBg: 'rgba(245,158,11,0.12)',
    iconBorder: 'rgba(245,158,11,0.25)',
    badge: 'Best Value',
    features: [
      'Unlimited AI employees',
      '1,000 tasks per month',
      'All features unlocked',
      '1nexio platform key included',
      'Priority processing',
      'Early access to new features',
    ],
    cta: 'Choose Max',
    ctaStyle: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400',
    popular: false,
  },
]

export default function PlanSelection() {
  const navigate = useNavigate()

  async function choosePlan(planId: string) {
    localStorage.setItem('plan', planId)
    // Persist plan to backend (best-effort — don't block if it fails)
    try { await auth.updatePlan(planId) } catch {}
    navigate('/companies')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-5xl animate-slide-up">
        {/* Header */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent shadow-lg shadow-accent/30">
            <Zap size={22} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Choose Your Plan</h1>
            <p className="mt-1.5 text-sm text-slate-500">Start free or unlock more power. Upgrade anytime.</p>
          </div>
        </div>

        {/* Plan Grid */}
        <div className="grid grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const Icon = plan.icon
            return (
              <div key={plan.id} className="relative flex flex-col">
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                    <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold text-white ${plan.id === 'pro' ? 'bg-accent' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`}>
                      {plan.badge}
                    </span>
                  </div>
                )}

                <button
                  onClick={() => choosePlan(plan.id)}
                  className={`card group flex flex-col gap-4 p-5 text-left transition-all ${plan.popular ? 'hover:border-accent/50 hover:bg-accent/5' : 'hover:border-white/15 hover:bg-white/3'}`}
                  style={plan.popular ? { borderColor: 'rgba(13,148,136,0.3)' } : {}}
                >
                  {/* Icon + Tag */}
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl"
                         style={{ background: plan.iconBg, border: `1px solid ${plan.iconBorder}` }}>
                      <Icon size={16} className={plan.iconColor} />
                    </div>
                    <span className="text-xs font-medium"
                          style={{ color: plan.id === 'pro' ? '#14b8a6' : plan.id === 'max' ? '#f59e0b' : plan.id === 'starter' ? '#60a5fa' : '#71717a' }}>
                      {plan.keyType === 'platform' ? '🔑 Platform key' : '🔧 Own key'}
                    </span>
                  </div>

                  {/* Name + Price */}
                  <div>
                    <h2 className="text-sm font-semibold text-slate-400">{plan.name}</h2>
                    <div className="mt-0.5 flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-white">{plan.price}</span>
                      <span className="text-xs text-slate-500">{plan.period}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{plan.description}</p>
                  </div>

                  {/* Limits */}
                  <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <p className="text-xs font-medium text-slate-300">{plan.employees}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{plan.tasks}</p>
                  </div>

                  {/* Features */}
                  <ul className="flex flex-col gap-1.5">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs text-slate-400">
                        <CheckCircle size={11} className={`shrink-0 mt-0.5 ${plan.id === 'pro' ? 'text-accent-light' : plan.id === 'max' ? 'text-amber-400' : plan.id === 'starter' ? 'text-blue-400' : 'text-slate-500'}`} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className={`mt-auto rounded-xl py-2 text-center text-sm font-medium transition-all ${plan.ctaStyle}`}>
                    {plan.cta}
                  </div>
                </button>
              </div>
            )
          })}
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          You can change your plan anytime in Settings · All plans include a 7-day free trial
        </p>
      </div>
    </div>
  )
}
