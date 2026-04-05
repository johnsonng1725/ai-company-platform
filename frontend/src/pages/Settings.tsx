import { useEffect, useState } from 'react'
import { Save, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { company as companyApi } from '../lib/api'
import type { Company } from '../lib/api'

export default function Settings() {
  const [comp, setComp] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [creating, setCreating] = useState(false)

  // Company fields
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)

  useEffect(() => {
    companyApi.get()
      .then((c) => {
        setComp(c)
        setName(c.name)
        setDesc(c.description)
      })
      .catch(() => setCreating(true))
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
      if (creating) {
        const c = await companyApi.create(payload)
        setComp(c)
        setCreating(false)
      } else {
        const c = await companyApi.update(payload)
        setComp(c)
      }
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

  if (loading) return <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Configure your AI company</p>
      </div>

      {/* Company info */}
      <div className="card p-6 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-slate-200">Company Profile</h2>
        {creating && (
          <div className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent-light border border-accent/20">
            Create your company to get started.
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Company Name *</label>
          <input className="input" placeholder="Acme AI Inc." value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Description</label>
          <textarea className="input resize-none" rows={2} placeholder="What does your company do?" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
      </div>

      {/* API Keys */}
      <div className="card p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">API Keys</h2>
          <p className="mt-0.5 text-xs text-slate-500">Keys are stored securely and used by your AI employees.</p>
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-400">
            Anthropic (Claude)
            {comp?.has_anthropic_key && <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">✓ Configured</span>}
          </label>
          <div className="relative">
            <input
              className="input pr-10"
              type={showAnthropicKey ? 'text' : 'password'}
              placeholder={comp?.has_anthropic_key ? '••••••••••• (leave blank to keep current)' : 'sk-ant-...'}
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
            OpenAI (ChatGPT) — optional
            {comp?.has_openai_key && <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">✓ Configured</span>}
          </label>
          <div className="relative">
            <input
              className="input pr-10"
              type={showOpenaiKey ? 'text' : 'password'}
              placeholder={comp?.has_openai_key ? '••••••••••• (leave blank to keep current)' : 'sk-...'}
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

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving || !name.trim()} className="btn-primary">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {creating ? 'Create Company' : 'Save Settings'}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 animate-fade-in">
            <CheckCircle size={14} />
            Saved successfully
          </span>
        )}
      </div>
    </div>
  )
}
