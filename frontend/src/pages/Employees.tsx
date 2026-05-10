import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, X, Loader2 } from 'lucide-react'
import { employees as employeesApi, companies as companiesApi } from '../lib/api'
import type { Employee, Company } from '../lib/api'
import EmployeeCard from '../components/EmployeeCard'

const MODELS = [
  { id: 'claude-opus-4-6',           label: 'Claude Opus 4.6',   provider: 'Anthropic', tier: 'Most powerful', cost: '$$$$' },
  { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6', provider: 'Anthropic', tier: 'Balanced',      cost: '$$$'  },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5',  provider: 'Anthropic', tier: 'Fast & cheap', cost: '$'    },
  { id: 'gpt-4o',                    label: 'GPT-4o',            provider: 'OpenAI',    tier: 'Most powerful', cost: '$$$$' },
  { id: 'gpt-4o-mini',               label: 'GPT-4o Mini',       provider: 'OpenAI',    tier: 'Fast & cheap', cost: '$'    },
]
const PROVIDER_ICON: Record<string, string> = { Anthropic: '🔶', OpenAI: '🟢' }

const PRESET_ROLES = [
  { emoji: '🔬', role: 'Market Researcher',  desc: 'Scans market trends, identifies opportunities, and researches competitors.', caps: ['Web research', 'Market analysis', 'Opportunity scoring'] },
  { emoji: '💼', role: 'Sales Representative',desc: 'Crafts outreach messages, follows up with leads, and closes deals.',        caps: ['Cold outreach', 'Lead generation', 'Sales copy'] },
  { emoji: '📢', role: 'Marketing Manager',   desc: 'Creates content strategies, writes copy, and manages campaigns.',           caps: ['Content creation', 'SEO', 'Social media', 'Email campaigns'] },
  { emoji: '🎧', role: 'Customer Support',    desc: 'Handles customer inquiries, resolves issues, and maintains satisfaction.',   caps: ['Customer service', 'Issue resolution', 'FAQ management'] },
  { emoji: '📊', role: 'Financial Analyst',   desc: 'Tracks revenue, analyzes costs, and generates financial reports.',           caps: ['Financial reporting', 'Budget tracking', 'Revenue analysis'] },
  { emoji: '✍️', role: 'Content Writer',      desc: 'Writes blog posts, articles, product descriptions, and web copy.',           caps: ['Blog writing', 'Copywriting', 'SEO content'] },
  { emoji: '💻', role: 'Developer',           desc: 'Writes code, reviews PRs, debugs issues, and manages technical tasks.',      caps: ['Code generation', 'Code review', 'Bug fixing'] },
  { emoji: '📅', role: 'Secretary',           desc: 'Orchestrates other employees, manages schedules, and generates daily reports.', caps: ['Task orchestration', 'Scheduling', 'Daily briefings'] },
  { emoji: '⚙️', role: 'Custom Role',         desc: '', caps: [] },
]

const SCHEDULE_OPTIONS = [
  { value: '', label: 'Manual only' },
  { value: 'daily', label: 'Once daily (auto)' },
]

function EmployeeModal({ companyId, editing, company, onClose, onSaved }: {
  companyId: number; editing: Employee | null; company: Company | null; onClose: () => void; onSaved: () => void
}) {
  const [selectedPreset, setSelectedPreset] = useState<typeof PRESET_ROLES[0] | null>(null)
  const [name, setName]       = useState(editing?.name ?? '')
  const [role, setRole]       = useState(editing?.role ?? '')
  const [emoji, setEmoji]     = useState(editing?.role_emoji ?? '🤖')
  const [desc, setDesc]       = useState(editing?.description ?? '')
  const [caps, setCaps]       = useState<string[]>(editing?.capabilities ?? [])
  const [capInput, setCapInput] = useState('')
  const [schedule, setSchedule] = useState(editing?.schedule_cron ?? '')
  const [model, setModel]     = useState<string>((editing?.config as any)?.model ?? 'claude-sonnet-4-6')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  function applyPreset(p: typeof PRESET_ROLES[0]) {
    setSelectedPreset(p)
    setRole(p.role === 'Custom Role' ? '' : p.role)
    setEmoji(p.emoji); setDesc(p.desc); setCaps([...p.caps])
  }
  function addCap() {
    const t = capInput.trim()
    if (t && !caps.includes(t)) { setCaps([...caps, t]); setCapInput('') }
  }
  async function save() {
    if (!name.trim() || !role.trim()) return setError('Name and role are required.')
    setLoading(true); setError('')
    try {
      const payload = { name, role, role_emoji: emoji, description: desc, capabilities: caps, schedule_cron: schedule, config: { model } }
      if (editing) await employeesApi.update(companyId, editing.id, payload)
      else await employeesApi.create(companyId, payload)
      onSaved()
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="card w-full max-w-2xl animate-slide-up overflow-y-auto" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between border-b p-5" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <h2 className="text-base font-semibold text-white">{editing ? 'Edit Employee' : 'Hire New AI Employee'}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:text-slate-300 transition-colors"><X size={18} /></button>
        </div>
        <div className="p-5 flex flex-col gap-5">
          {!editing && (
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-400">Choose a Role Template</label>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_ROLES.map((p) => (
                  <button key={p.role} onClick={() => applyPreset(p)}
                    className={`flex items-center gap-2 rounded-lg p-2.5 text-left text-xs transition-all border ${selectedPreset?.role === p.role ? 'border-accent/50 bg-accent/10 text-white' : 'text-slate-400 hover:border-white/15 hover:text-slate-200'}`}
                    style={{ borderColor: selectedPreset?.role === p.role ? undefined : 'rgba(255,255,255,0.07)' }}>
                    <span className="text-base">{p.emoji}</span>
                    <span className="font-medium leading-tight">{p.role}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Employee Name *</label>
              <input className="input" placeholder="e.g. Alex" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Role *</label>
              <div className="flex gap-2">
                <input className="input" style={{ width: 44, flexShrink: 0, textAlign: 'center', padding: '0.5rem' }} value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2} />
                <input className="input flex-1" placeholder="e.g. Market Researcher" value={role} onChange={(e) => setRole(e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Description</label>
            <textarea className="input resize-none" rows={2} placeholder="What does this employee do?" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Capabilities</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {caps.map((c) => (
                <span key={c} className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-slate-300"
                      style={{ background: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.3)' }}>
                  {c}<button onClick={() => setCaps(caps.filter((x) => x !== c))} className="hover:text-red-400 ml-0.5"><X size={10} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Add a capability" value={capInput}
                     onChange={(e) => setCapInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCap())} />
              <button onClick={addCap} className="btn-ghost px-3">Add</button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Schedule</label>
            <select className="input" value={schedule} onChange={(e) => setSchedule(e.target.value)}>
              {SCHEDULE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-slate-400">AI Model</label>
            {(() => {
              const available = ['Anthropic', 'OpenAI'].filter(p =>
                p === 'Anthropic' ? (company?.has_anthropic_key ?? true) : (company?.has_openai_key ?? false)
              )
              if (available.length === 0) return (
                <p className="text-xs text-amber-500/70">No API keys added yet — go to Settings to add them.</p>
              )
              return (
                <div className="flex flex-col gap-1.5">
                  {available.map((provider) => (
                    <div key={provider}>
                      <p className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
                        {PROVIDER_ICON[provider]} {provider}
                      </p>
                      <div className="flex flex-col gap-1">
                        {MODELS.filter((m) => m.provider === provider).map((m) => (
                          <button key={m.id} type="button" onClick={() => setModel(m.id)}
                            className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-all border ${model === m.id ? 'border-accent/50 bg-accent/10 text-white' : 'text-slate-400 hover:border-white/15 hover:text-slate-200'}`}
                            style={{ borderColor: model === m.id ? undefined : 'rgba(255,255,255,0.07)' }}>
                            <span className="font-medium">{m.label}</span>
                            <span className="flex items-center gap-3 text-slate-500">
                              <span>{m.tier}</span>
                              <span className="font-mono tracking-wide">{m.cost}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {available.length < 2 && (
                    <p className="mt-1 text-xs text-slate-600">Add more keys in Settings to unlock other providers.</p>
                  )}
                </div>
              )
            })()}
          </div>

          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 border border-red-500/20">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t p-5" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={save} disabled={loading} className="btn-primary">
            {loading && <Loader2 size={14} className="animate-spin" />}
            {editing ? 'Save Changes' : 'Hire Employee'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Employees() {
  const { companyId } = useParams<{ companyId: string }>()
  const navigate = useNavigate()
  const cid = Number(companyId)
  const [list, setList]           = useState<Employee[]>([])
  const [company, setCompany]     = useState<Company | null>(null)
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<Employee | null>(null)
  const [toast, setToast]         = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function load() {
    try {
      const [emps, companies] = await Promise.all([
        employeesApi.list(cid),
        companiesApi.list(),
      ])
      setList(emps)
      setCompany(companies.find(c => c.id === cid) ?? null)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [cid])

  async function handleRun(id: number) {
    try { const res = await employeesApi.run(cid, id); showToast(res.message); load() }
    catch (e: any) { showToast(e.message) }
  }
  async function handleDelete(id: number) {
    if (!confirm('Remove this AI employee?')) return
    await employeesApi.delete(cid, id); load()
  }

  if (loading) return <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Employees</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your team of AI workers</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true) }} className="btn-primary">
          <Plus size={16} />Hire Employee
        </button>
      </div>

      {list.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 py-20 text-center">
          <span className="text-5xl">🤖</span>
          <div>
            <p className="text-base font-medium text-slate-300">No employees yet</p>
            <p className="mt-1 text-sm text-slate-500">Hire your first AI employee to get started</p>
          </div>
          <button onClick={() => { setEditing(null); setShowModal(true) }} className="btn-primary mt-2">
            <Plus size={16} />Hire Your First Employee
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {list.map((emp) => (
            <EmployeeCard key={emp.id} employee={emp} companyId={cid} onRun={handleRun} onDelete={handleDelete}
                          onChat={(e) => navigate(`/c/${cid}/employees/${e.id}/chat`)} />
          ))}
        </div>
      )}

      {showModal && (
        <EmployeeModal companyId={cid} editing={editing} company={company}
                       onClose={() => setShowModal(false)}
                       onSaved={() => { setShowModal(false); load() }} />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 animate-slide-up rounded-lg bg-surface-card px-4 py-3 text-sm text-slate-200 shadow-lg"
             style={{ border: '1px solid rgba(255,255,255,0.1)' }}>{toast}</div>
      )}
    </div>
  )
}
