import { useEffect, useState } from 'react'
import { Save, Loader2, Eye, EyeOff, CheckCircle, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { company as companyApi } from '../lib/api'
import type { Company } from '../lib/api'

export default function Settings() {
  const [comp, setComp] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)

  useEffect(() => {
    companyApi.get()
      .then((c) => { setComp(c); setName(c.name); setDesc(c.description) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    try {
      const payload = {
        name,
        description: desc,
        ...(anthropicKey ? { anthropic_api_key: anthropicKey } : {}),
        ...(openaiKey ? { openai_api_key: openaiKey } : {}),
      }
      const c = comp
        ? await companyApi.update(payload)
        : await companyApi.create(payload)
      setComp(c)
      setAnthropicKey('')
      setOpenaiKey('')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  )

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Configure your AI company</p>
      </div>

      {/* Platform key status banner */}
      <div className="flex items-start gap-3 rounded-xl px-4 py-3.5"
           style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
        <CheckCircle size={16} className="text-emerald-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-300">Platform API keys are configured</p>
          <p className="mt-0.5 text-xs text-slate-400">
            Your AI employees are already able to run — the platform provides Anthropic &amp; OpenAI access.
            You only need to add your own keys if you want to use a separate billing account.
          </p>
        </div>
      </div>

      {/* Company info */}
      <div className="card p-6 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-slate-200">Company Profile</h2>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Company Name</label>
          <input className="input" placeholder="Acme AI Inc." value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Description</label>
          <textarea
            className="input resize-none"
            rows={2}
            placeholder="What does your company do?"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>
      </div>

      {/* Advanced: Override API keys */}
      <div className="card overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-white/3"
        >
          <div>
            <p className="text-sm font-medium text-slate-300">Advanced — Override API Keys</p>
            <p className="mt-0.5 text-xs text-slate-500">Use your own Anthropic / OpenAI billing account instead of the platform default</p>
          </div>
          {showAdvanced ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
        </button>

        {showAdvanced && (
          <div className="flex flex-col gap-4 border-t p-5" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="flex items-start gap-2 rounded-lg bg-blue-500/8 px-3 py-2.5 border border-blue-500/15">
              <Info size={13} className="text-blue-400 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-400">
                Leave blank to keep using the platform keys. Filling these in will override the default for your company only.
              </p>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-400">
                Anthropic (Claude)
                {comp?.has_anthropic_key && (
                  <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">✓ Custom key set</span>
                )}
              </label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showAnthropicKey ? 'text' : 'password'}
                  placeholder="sk-ant-... (optional)"
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                />
                <button
                  onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showAnthropicKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-400">
                OpenAI (ChatGPT)
                {comp?.has_openai_key && (
                  <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">✓ Custom key set</span>
                )}
              </label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showOpenaiKey ? 'text' : 'password'}
                  placeholder="sk-... (optional)"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                />
                <button
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showOpenaiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving || !name.trim()} className="btn-primary">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Settings
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 animate-fade-in">
            <CheckCircle size={14} />
            Saved
          </span>
        )}
      </div>
    </div>
  )
}
