import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Save, Loader2, Eye, EyeOff, CheckCircle, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { companies as companiesApi } from '../lib/api'
import type { Company } from '../lib/api'

export default function Settings() {
  const { companyId } = useParams<{ companyId: string }>()
  const cid = Number(companyId)

  const [comp, setComp]               = useState<Company | null>(null)
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [platformKeys, setPlatformKeys] = useState<{ has_anthropic: boolean; has_openai: boolean } | null>(null)

  const [name, setName]               = useState('')
  const [desc, setDesc]               = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [openaiKey, setOpenaiKey]     = useState('')
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [showOpenaiKey, setShowOpenaiKey]       = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    Promise.all([
      companiesApi.list(),
      fetch('/api/platform-status', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([list, status]) => {
      const c = list.find((x) => x.id === cid)
      if (c) { setComp(c); setName(c.name); setDesc(c.description) }
      setPlatformKeys(status)
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

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Configure this company</p>
      </div>

      {platformKeys && (platformKeys.has_anthropic || platformKeys.has_openai) ? (
        <div className="flex items-start gap-3 rounded-xl px-4 py-3.5"
             style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
          <CheckCircle size={16} className="text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-300">Platform API keys are configured</p>
            <p className="mt-0.5 text-xs text-slate-400">
              {[platformKeys.has_anthropic && 'Claude (Anthropic)', platformKeys.has_openai && 'OpenAI'].filter(Boolean).join(' & ')} {' '}
              ready. Add your own keys below to use separate billing.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl px-4 py-3.5"
             style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
          <Info size={16} className="text-yellow-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-300">No platform API keys configured</p>
            <p className="mt-0.5 text-xs text-slate-400">
              Add your Anthropic or OpenAI key below so your AI employees can run.
            </p>
          </div>
        </div>
      )}

      <div className="card p-6 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-slate-200">Company Profile</h2>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Company Name</label>
          <input className="input" placeholder="Acme AI Inc." value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Description</label>
          <textarea className="input resize-none" rows={2} placeholder="What does this company do?" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <button onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-white/3">
          <div>
            <p className="text-sm font-medium text-slate-300">Advanced — Override API Keys</p>
            <p className="mt-0.5 text-xs text-slate-500">Use your own Anthropic / OpenAI billing instead of platform default</p>
          </div>
          {showAdvanced ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
        </button>

        {showAdvanced && (
          <div className="flex flex-col gap-4 border-t p-5" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 border border-blue-500/15" style={{ background: 'rgba(59,130,246,0.08)' }}>
              <Info size={13} className="text-blue-400 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-400">Leave blank to keep using the platform keys.</p>
            </div>
            {[
              { label: 'Anthropic (Claude)', key: anthropicKey, setKey: setAnthropicKey, show: showAnthropicKey, setShow: setShowAnthropicKey, placeholder: 'sk-ant-...', configured: comp?.has_anthropic_key },
              { label: 'OpenAI (ChatGPT)',   key: openaiKey,    setKey: setOpenaiKey,    show: showOpenaiKey,    setShow: setShowOpenaiKey,    placeholder: 'sk-...',     configured: comp?.has_openai_key    },
            ].map(({ label, key, setKey, show, setShow, placeholder, configured }) => (
              <div key={label}>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-400">
                  {label}
                  {configured && <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">✓ Custom key set</span>}
                </label>
                <div className="relative">
                  <input className="input pr-10" type={show ? 'text' : 'password'} placeholder={`${placeholder} (optional)`}
                         value={key} onChange={(e) => setKey(e.target.value)} />
                  <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {show ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            ))}
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
            <CheckCircle size={14} />Saved
          </span>
        )}
      </div>
    </div>
  )
}
