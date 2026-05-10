import { useNavigate } from 'react-router-dom'
import { Zap, Key, CheckCircle, Crown, Star, Gift } from 'lucide-react'
import { auth } from '../lib/api'

const PLANS = [
  {
    id: 'builder',
    name: 'Builder',
    price: 'RM59',
    period: '/month',
    tagline: 'Own key, no limits',
    description: 'Unlimited everything. Bring your own Anthropic key and pay them directly.',
    keyType: 'own',
    employees: 'Unlimited employees',
    tasks: 'Unlimited tasks',
    icon: Key,
    iconColor: 'text-blue-400',
    iconBg: 'rgba(59,130,246,0.12)',
    iconBorder: 'rgba(59,130,246,0.25)',
    badge: null,
    trial: false,
    features: [
      'Unlimited AI employees',
      'Unlimited tasks',
      'All features unlocked',
      'Bring your own API key',
      'You pay Anthropic directly',
    ],
    cta: 'Get Started',
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
    trial: false,
    features: [
      '10 AI employees',
      '300 tasks per month',
      'All features unlocked',
      '1nexio platform key included',
      'No API setup required',
    ],
    cta: 'Get Started',
    ctaStyle: 'bg-accent text-white hover:bg-accent-light',
    popular: true,
  },
  {
    id: 'max',
    name: 'Max',
    price: 'RM399',
    period: '/month',
    tagline: 'Best value',
    description: 'Maximum usage with our platform key. Built for power users.',
    keyType: 'platform',
    employees: 'Unlimited employees',
    tasks: '1,000 tasks / month',
    icon: Crown,
    iconColor: 'text-amber-400',
    iconBg: 'rgba(245,158,11,0.12)',
    iconBorder: 'rgba(245,158,11,0.25)',
    badge: 'Free Trial',
    trial: true,
    features: [
      'Unlimited AI employees',
      '1,000 tasks per month',
      'All features unlocked',
      '1nexio platform key included',
      'Priority processing',
      'Early access to new features',
    ],
    cta: 'Start Free Trial',
    ctaStyle: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400',
    popular: false,
  },
]

export default function PlanSelection() {
  const navigate = useNavigate()

  async function choosePlan(planId: string) {
    localStorage.setItem('plan', planId)
    // Max gets a 7-day trial; others go straight in (payment flow TBD)
    const backendPlan = planId === 'max' ? 'trial' : planId === 'builder' ? 'starter' : planId
    try { await auth.updatePlan(backendPlan) } catch {}
    navigate('/companies')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-4xl animate-slide-up">
        {/* Header */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent shadow-lg shadow-accent/30">
            <Zap size={22} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Choose Your Plan</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Max plan includes a 7-day free trial — no credit card needed.
            </p>
          </div>

          {/* Trial badge — Max only */}
          <div className="flex items-center gap-2 rounded-full px-4 py-2"
               style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <Gift size={13} className="text-amber-400" />
            <span className="text-xs font-medium text-amber-300">
              Max free trial includes Pro limits — 10 employees & 300 tasks for 7 days
            </span>
          </div>
        </div>

        {/* Plan Grid */}
        <div className="grid grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const Icon = plan.icon
            return (
              <div key={plan.id} className="relative flex flex-col">
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                    <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold text-white ${
                      plan.id === 'pro' ? 'bg-accent' : 'bg-gradient-to-r from-amber-500 to-orange-500'
                    }`}>
                      {plan.badge}
                    </span>
                  </div>
                )}

                <button
                  onClick={() => choosePlan(plan.id)}
                  className={`card group flex flex-col gap-4 p-5 text-left transition-all ${
                    plan.popular
                      ? 'hover:border-accent/50 hover:bg-accent/5'
                      : plan.id === 'max'
                      ? 'hover:border-amber-500/30 hover:bg-amber-500/5'
                      : 'hover:border-white/15 hover:bg-white/3'
                  }`}
                  style={
                    plan.popular
                      ? { borderColor: 'rgba(13,148,136,0.3)' }
                      : plan.id === 'max'
                      ? { borderColor: 'rgba(245,158,11,0.2)' }
                      : {}
                  }
                >
                  {/* Icon + key type */}
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl"
                         style={{ background: plan.iconBg, border: `1px solid ${plan.iconBorder}` }}>
                      <Icon size={16} className={plan.iconColor} />
                    </div>
                    <span className="text-xs font-medium"
                          style={{
                            color: plan.id === 'pro' ? '#14b8a6'
                                 : plan.id === 'max' ? '#f59e0b'
                                 : '#60a5fa'
                          }}>
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
                    {plan.trial && (
                      <p className="mt-1 text-xs text-amber-500/80">Trial: 10 employees · 300 tasks</p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="flex flex-col gap-1.5">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs text-slate-400">
                        <CheckCircle size={11} className={`shrink-0 mt-0.5 ${
                          plan.id === 'pro' ? 'text-accent-light'
                          : plan.id === 'max' ? 'text-amber-400'
                          : 'text-blue-400'
                        }`} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className={`mt-auto rounded-xl py-2 text-center text-sm font-medium transition-all ${plan.ctaStyle}`}>
                    {plan.cta}
                  </div>

                  {/* Payment note for non-trial plans */}
                  {!plan.trial && (
                    <p className="text-center text-xs text-slate-600 -mt-2">Payment required to activate</p>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          Upgrade or cancel anytime · No credit card required for Max trial
        </p>
      </div>
    </div>
  )
}
