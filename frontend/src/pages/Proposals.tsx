import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { proposals as proposalsApi } from '../lib/api'
import type { Proposal } from '../lib/api'

const TABS = [
  { key: 'pending',            label: 'Pending'  },
  { key: 'approved',           label: 'Approved' },
  { key: 'rejected',           label: 'Rejected' },
  { key: 'revision_requested', label: 'Revision' },
]
const STATUS_STYLE: Record<string, string> = {
  pending:            'bg-amber-500/10 text-amber-400 border-amber-500/20',
  approved:           'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  rejected:           'bg-red-500/10 text-red-400 border-red-500/20',
  revision_requested: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

function ProposalCard({ proposal, companyId, onAction }: { proposal: Proposal; companyId: number; onAction: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [action, setAction]     = useState<'approve' | 'reject' | 'revise' | null>(null)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading]   = useState(false)

  async function submit() {
    if (!action) return
    if (action !== 'approve' && !feedback.trim()) return
    setLoading(true)
    try {
      if (action === 'approve') await proposalsApi.approve(companyId, proposal.id, feedback)
      if (action === 'reject')  await proposalsApi.reject(companyId, proposal.id, feedback)
      if (action === 'revise')  await proposalsApi.revise(companyId, proposal.id, feedback)
      onAction()
    } catch (e: any) { alert(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className={`card flex flex-col overflow-hidden transition-all ${expanded ? 'ring-1 ring-accent/30' : ''}`}>
      <div className="p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">{proposal.employee_emoji ?? '📋'}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-100 leading-snug">{proposal.title}</h3>
              <span className={`badge border shrink-0 ${STATUS_STYLE[proposal.status]}`}>{proposal.status.replace('_', ' ')}</span>
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
              <span>{proposal.employee_name ?? 'AI'}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Clock size={10} />{formatDistanceToNow(new Date(proposal.created_at), { addSuffix: true })}</span>
            </div>
          </div>
        </div>

        <p className={`mt-3 text-xs text-slate-400 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
          {proposal.summary || proposal.content}
        </p>

        {proposal.ceo_feedback && (
          <div className="mt-3 rounded-lg border border-white/5 bg-white/3 p-3">
            <p className="text-xs text-slate-500"><span className="text-slate-400 font-medium">Your feedback:</span> {proposal.ceo_feedback}</p>
          </div>
        )}

        <button onClick={() => setExpanded(!expanded)}
                className="mt-3 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Show less' : 'Read full proposal'}
        </button>

        {expanded && (
          <div className="mt-3 rounded-lg bg-white/3 p-4 border border-white/5">
            <pre className="whitespace-pre-wrap text-xs text-slate-300 leading-relaxed font-sans">{proposal.content}</pre>
          </div>
        )}
      </div>

      {proposal.status === 'pending' && (
        <div className="border-t p-4 flex flex-col gap-3" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          {!action ? (
            <div className="flex gap-2">
              {[
                { key: 'approve', label: 'Approve',          icon: CheckCircle, cls: 'text-emerald-400 hover:bg-emerald-500/15', border: 'rgba(52,211,153,0.2)' },
                { key: 'revise',  label: 'Request Revision',  icon: RefreshCw,   cls: 'text-blue-400 hover:bg-blue-500/15',     border: 'rgba(96,165,250,0.2)'  },
                { key: 'reject',  label: 'Reject',            icon: XCircle,     cls: 'text-red-400 hover:bg-red-500/15',       border: 'rgba(248,113,113,0.2)' },
              ].map(({ key, label, icon: Icon, cls, border }) => (
                <button key={key} onClick={() => setAction(key as any)}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition-all ${cls}`}
                  style={{ border: `1px solid ${border}` }}>
                  <Icon size={14} />{label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300 capitalize">{action}ing proposal</span>
                <button onClick={() => { setAction(null); setFeedback('') }} className="text-xs text-slate-500 hover:text-slate-300 ml-auto">Cancel</button>
              </div>
              {action !== 'approve' && (
                <textarea className="input resize-none text-xs" rows={2}
                  placeholder={action === 'reject' ? 'Reason for rejection...' : 'What needs to be revised?'}
                  value={feedback} onChange={(e) => setFeedback(e.target.value)} />
              )}
              <button onClick={submit} disabled={loading || (action !== 'approve' && !feedback.trim())}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition-all disabled:opacity-50 ${
                  action === 'approve' ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' :
                  action === 'reject'  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' :
                                         'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'}`}>
                {loading && <RefreshCw size={12} className="animate-spin" />}
                Confirm {action.charAt(0).toUpperCase() + action.slice(1)}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Proposals() {
  const { companyId } = useParams<{ companyId: string }>()
  const cid = Number(companyId)
  const [tab, setTab]     = useState('pending')
  const [list, setList]   = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try { setList(await proposalsApi.list(cid, tab)) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [tab, cid])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Proposals</h1>
        <p className="mt-1 text-sm text-slate-500">Review and act on AI-generated proposals</p>
      </div>

      <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', width: 'fit-content' }}>
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${tab === key ? 'bg-surface-card text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
      ) : list.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-20 text-center">
          <span className="text-4xl">📭</span>
          <p className="text-sm text-slate-400">No {tab} proposals</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 max-w-3xl">
          {list.map((p) => <ProposalCard key={p.id} proposal={p} companyId={cid} onAction={load} />)}
        </div>
      )}
    </div>
  )
}
