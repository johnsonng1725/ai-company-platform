import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, Loader2, Eye, EyeOff, CheckCircle, Key, Crown, Zap, Star, RefreshCw, XCircle } from 'lucide-react'
import { companies as companiesApi, auth as authApi } from '../lib/api'
import type { Company, User } from '../lib/api'

const PLAN_CONFIG: Record<string, { label: string; sub: string; icon: any; iconColor: string; bg: string; border: string }> = {
  trial:   { label: 'Free Trial', sub: 'Pro features · 7 days',  icon: Zap,   iconColor: 'text-accent-light', bg: 'rgba(13,148,136,0.12)',  border: 'rgba(13,148,136,0.3)'  },
  builder: { label: 'Builder',    sub: 'RM59 / month',            icon: Key,   iconColor: 'text-blue-400',     bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.25)' },
  pro:     { label: 'Pro',        sub: 'RM129 / month',           icon: Zap,   iconColor: 'text-accent-light', bg: 'rgba(13,148,136,0.12)',  border: 'rgba(13,148,136,0.3)'  },
  max:     { label: 'Max',        sub: 'RM399 / month',           icon: Crown, iconColor: 'text-amber-400',    bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)' },
}

export default function Settings() {
  const { companyId } = useParams<{ companyId: string }>()
  const navigate = useNavigate()
  const cid = Number(companyId)

  const [comp, setComp]     = useState<Company | null>(null)
  const [user, setUser]     = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  const [name, setName]     = useState('')
  const [desc, setDesc]     = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [openaiKey, setOpenaiKey]       = useState('')
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [showOpenaiKey, setShowOpenaiKey]       = useState(false)

  useEffect(() => {
    Promise.all([
      companiesApi.list(),
      authApi.me(),
    ]).then(([list, me]) => {
      const c = list.find((x) => x.id === cid)
      if (c) { setComp(c); setName(c.name); setDesc(c.description) }
      setUser(me)
    }).finally(() => setLoading(false))
  }, [cid])

  async function save() {
    setSaving(true)
    try {
      const c = await companiesApi.update(cid, {
        name, description: desc,
        ...(anthropicKey ? { anthropic_api_key: anthropicKey } : {}),
        ...(openaiKey    ? { openai_api_key: openaiKey }       : {}),
      })
      setComp(c); setAnthropicKey(''); setOpenaiKey('')
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  )

  const plan = user?.plan ?? localStorage.getItem('plan') ?? 'trial'
  const planConf = PLAN_CONFIG[plan] ?? PLAN_CONFIG.trial
  const PlanIcon = planConf.icon
  const isBuilderPlan = plan === 'builder'

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your account and company</p>
      </div>

      {/* ── Account Details ── */}
      <div className="card p-6 flex flex-col gap-5">
        <h2 className="text-sm font-semibold text-slate-200">Account Details</h2>

        <div className="flex flex-col gap-3">
          {/* Name */}
          <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <span className="text-xs text-slate-500">Name</span>
            <span className="text-sm text-slate-200">{user?.full_name || '—'}</span>
          </div>
          {/* Email */}
          <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <span className="text-xs text-slate-500">Email</span>
            <span className="text-sm text-slate-200">{user?.email || '—'}</span>
          </div>
          {/* Plan */}
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-slate-500">Plan</span>
            <div className="flex items-center gap-2 rounded-lg px-3 py-1.5"
                 style={{ background: planConf.bg, border: `1px solid ${planConf.border}` }}>
              <PlanIcon size={13} className={planConf.iconColor} />
              <span className="text-xs font-semibold text-white">{planConf.label}</span>
              <span className="text-xs text-slate-400">{planConf.sub}</span>
            </div>
          </div>
        </div>

        {/* Plan actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => navigate('/select-plan')}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium text-slate-300 transition-all hover:border-white/20 hover:text-white"
            style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <RefreshCw size={12} />
            Change Plan
          </button>
          {plan !== 'trial' && (
            <button
              onClick={() => alert('To stop your plan, please contact support@1nexio.com')}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-2 text-xs font-medium text-red-400 transition-all hover:border-red-500/40 hover:text-red-300">
              <XCircle size={12} />
              Stop Plan
            </button>
          )}
        </div>
      </div>

      {/* ── Company Profile ── */}
      <div className="card p-6 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-slate-200">Company Profile</h2>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Company Name</label>
          <input className="input" placeholder="Acme AI Inc." value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Description</label>
          <textarea className="input resize-none" rows={2} placeholder="What does this company do?"
            value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
      </div>

      {/* ── API Keys — Builder plan only ── */}
      {isBuilderPlan && (
        <div className="card p-6 flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">API Keys</h2>
            <p className="mt-0.5 text-xs text-slate-500">Your AI employees use these keys to run.</p>
          </div>

          {/* Anthropic */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-400">
              🔶 Claude (Anthropic)
              {comp?.has_anthropic_key && (
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400">✓ Key set</span>
              )}
            </label>
            <div className="relative">
              <input className="input pr-10" type={showAnthropicKey ? 'text' : 'password'}
                placeholder={comp?.has_anthropic_key ? '••••••••••••••••' : 'sk-ant-...'}
                value={anthropicKey} onChange={(e) => setAnthropicKey(e.target.value)} />
              <button onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showAnthropicKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-accent-light hover:underline">console.anthropic.com</a>
            </p>
          </div>

          {/* OpenAI */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-400">
              🟢 OpenAI (ChatGPT)
              {comp?.has_openai_key && (
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400">✓ Key set</span>
              )}
            </label>
            <div className="relative">
              <input className="input pr-10" type={showOpenaiKey ? 'text' : 'password'}
                placeholder={comp?.has_openai_key ? '••••••••••••••••' : 'sk-...'}
                value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} />
              <button onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showOpenaiKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-accent-light hover:underline">platform.openai.com/api-keys</a>
            </p>
          </div>
        </div>
      )}

      {/* ── Save ── */}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving || !name.trim()} className="btn-primary">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Settings
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle size={14} /> Saved
          </span>
        )}
      </div>
    </div>
  )
}
