import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, FileText, ArrowRight, Zap, Loader2, X, Building2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { companies as companiesApi } from '../lib/api'
import type { Company } from '../lib/api'

function NewCompanyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Company) => void }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const c = await companiesApi.create({ name, description: desc })
      onCreated(c)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="card w-full max-w-md animate-slide-up p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Create New Company</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Company Name *</label>
            <input
              className="input"
              placeholder="e.g. My E-commerce Store"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Description</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="What does this company do?"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 border border-red-500/20">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={loading || !name.trim()} className="btn-primary">
              {loading && <Loader2 size={14} className="animate-spin" />}
              Create Company
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Companies() {
  const navigate = useNavigate()
  const [list, setList] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  async function load() {
    try {
      const data = await companiesApi.list()
      setList(data)
    } catch (e: any) {
      if (e.message?.includes('401')) {
        localStorage.removeItem('token')
        navigate('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function enter(company: Company) {
    navigate(`/c/${company.id}/dashboard`)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-8 py-4"
              style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent">
            <Zap size={14} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-white">1nexio</span>
        </div>
        <button
          onClick={() => { localStorage.removeItem('token'); navigate('/login') }}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Sign out
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 py-12">
        <div className="w-full max-w-3xl">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Your Companies</h1>
              <p className="mt-1 text-sm text-slate-500">Select a company to manage, or create a new one.</p>
            </div>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus size={16} />
              New Company
            </button>
          </div>

          {list.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center gap-5 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl"
                   style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}>
                <Building2 size={28} className="text-accent-light" />
              </div>
              <div>
                <p className="text-base font-medium text-slate-200">No companies yet</p>
                <p className="mt-1 text-sm text-slate-500">Create your first AI-powered company to get started.</p>
              </div>
              <button onClick={() => setShowModal(true)} className="btn-primary mt-2">
                <Plus size={16} />
                Create Your First Company
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {list.map((company) => (
                <button
                  key={company.id}
                  onClick={() => enter(company)}
                  className="card group flex flex-col gap-4 p-5 text-left transition-all hover:border-accent/30 hover:bg-accent/5"
                >
                  {/* Company icon + name */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                           style={{ background: 'rgba(124,58,237,0.12)' }}>
                        🏢
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-100 group-hover:text-white transition-colors">
                          {company.name}
                        </h3>
                        {company.description && (
                          <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{company.description}</p>
                        )}
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-slate-600 group-hover:text-accent-light transition-colors mt-0.5" />
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Users size={11} />
                      {company.employee_count} employee{company.employee_count !== 1 ? 's' : ''}
                    </span>
                    {company.pending_proposals > 0 && (
                      <span className="badge bg-amber-500/15 text-amber-400">
                        {company.pending_proposals} pending
                      </span>
                    )}
                    <span className="ml-auto text-xs text-slate-600">
                      {formatDistanceToNow(new Date(company.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </button>
              ))}

              {/* Add new company card */}
              <button
                onClick={() => setShowModal(true)}
                className="card flex flex-col items-center justify-center gap-2 p-5 text-center transition-all hover:border-white/15 hover:bg-white/3"
                style={{ minHeight: '120px', borderStyle: 'dashed' }}
              >
                <Plus size={20} className="text-slate-600" />
                <span className="text-sm text-slate-500">New Company</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <NewCompanyModal
          onClose={() => setShowModal(false)}
          onCreated={(c) => { setShowModal(false); enter(c) }}
        />
      )}
    </div>
  )
}
