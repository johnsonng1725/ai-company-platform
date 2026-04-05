import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Users, Zap, FileText, CheckSquare, RefreshCw, Plus } from 'lucide-react'
import { employees as employeesApi, proposals as proposalsApi, activity as activityApi, stats as statsApi } from '../lib/api'
import type { Employee, Proposal, ActivityLog, Stats } from '../lib/api'
import EmployeeCard from '../components/EmployeeCard'
import ActivityFeed from '../components/ActivityFeed'

const STAT_CARDS = [
  { key: 'employees',         label: 'AI Employees',      icon: Users,       color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { key: 'active',            label: 'Working Now',        icon: Zap,         color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  { key: 'pending_proposals', label: 'Pending Approvals',  icon: FileText,    color: 'text-amber-400',  bg: 'bg-amber-500/10'  },
  { key: 'tasks_today',       label: 'Tasks Today',        icon: CheckSquare, color: 'text-emerald-400',bg: 'bg-emerald-500/10'},
] as const

export default function Dashboard() {
  const navigate = useNavigate()
  const { companyId } = useParams<{ companyId: string }>()
  const cid = Number(companyId)

  const [empList, setEmpList]             = useState<Employee[]>([])
  const [activityLogs, setActivityLogs]   = useState<ActivityLog[]>([])
  const [pendingProposals, setPending]    = useState<Proposal[]>([])
  const [statsData, setStats]             = useState<Stats>({ employees: 0, active: 0, pending_proposals: 0, tasks_today: 0 })
  const [loading, setLoading]             = useState(true)
  const [toast, setToast]                 = useState('')
  const eventSourceRef                    = useRef<EventSource | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const refresh = useCallback(async () => {
    if (!cid) return
    try {
      const [emps, logs, props, st] = await Promise.all([
        employeesApi.list(cid),
        activityApi.list(cid, 30),
        proposalsApi.list(cid, 'pending'),
        statsApi.get(cid),
      ])
      setEmpList(emps); setActivityLogs(logs); setPending(props); setStats(st)
    } catch (e: any) {
      if (e.message?.includes('401')) { localStorage.removeItem('token'); navigate('/login') }
    } finally { setLoading(false) }
  }, [cid, navigate])

  useEffect(() => {
    refresh()
    const token = localStorage.getItem('token')
    if (!token || !cid) return
    const es = new EventSource(`/api/activity/stream?company_id=${cid}&token=${token}`)
    eventSourceRef.current = es
    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'activity') {
        setActivityLogs((prev) => {
          if (prev.find((l) => l.id === data.id)) return prev
          const log: ActivityLog = { id: data.id, level: data.level, message: data.message, data: {}, employee_id: null, employee_name: data.employee_name, employee_emoji: data.employee_emoji, created_at: data.created_at }
          return [log, ...prev].slice(0, 50)
        })
        statsApi.get(cid).then(setStats).catch(() => {})
      }
      if (data.type === 'employee_status') {
        setEmpList((prev) => prev.map((emp) => {
          const u = data.employees.find((x: any) => x.id === emp.id)
          return u ? { ...emp, ...u } : emp
        }))
      }
    }
    return () => es.close()
  }, [refresh, cid])

  async function handleRun(id: number) {
    try { const res = await employeesApi.run(cid, id); showToast(res.message); refresh() }
    catch (e: any) { showToast(e.message) }
  }

  async function handleDelete(id: number) {
    if (!confirm('Remove this AI employee?')) return
    await employeesApi.delete(cid, id); refresh()
  }

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  )

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Your AI company at a glance</p>
        </div>
        <button onClick={refresh} className="btn-ghost text-xs"><RefreshCw size={14} />Refresh</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, color, bg }) => (
          <div key={key} className="card flex items-center gap-4 p-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{statsData[key]}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Employees */}
        <div className="col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">AI Employees</h2>
            <button onClick={() => navigate(`/c/${cid}/employees`)} className="btn-ghost text-xs py-1.5 px-3">
              <Plus size={13} />Add Employee
            </button>
          </div>
          {empList.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 py-12 text-center">
              <span className="text-4xl">🤖</span>
              <p className="text-sm text-slate-400">No AI employees yet</p>
              <button onClick={() => navigate(`/c/${cid}/employees`)} className="btn-primary text-xs">
                <Plus size={14} />Hire Your First Employee
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {empList.map((emp) => (
                <EmployeeCard key={emp.id} employee={emp} companyId={cid} onRun={handleRun} onDelete={handleDelete}
                              onChat={(e) => navigate(`/c/${cid}/employees/${e.id}/chat`)} />
              ))}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-4">
          {pendingProposals.length > 0 && (
            <div className="card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-200">Needs Approval</h2>
                <span className="badge bg-amber-500/15 text-amber-400">{pendingProposals.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {pendingProposals.slice(0, 3).map((p) => (
                  <button key={p.id} onClick={() => navigate(`/c/${cid}/proposals`)}
                    className="flex items-start gap-2 rounded-lg p-2.5 text-left transition-all hover:bg-white/5"
                    style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
                    <span className="text-base">{p.employee_emoji ?? '📋'}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-200 line-clamp-1">{p.title}</p>
                      <p className="text-xs text-slate-500">{p.employee_name ?? 'AI'}</p>
                    </div>
                  </button>
                ))}
                {pendingProposals.length > 3 && (
                  <button onClick={() => navigate(`/c/${cid}/proposals`)} className="text-xs text-accent-light hover:underline text-center pt-1">
                    View all {pendingProposals.length} →
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="card flex flex-1 flex-col p-4" style={{ maxHeight: '480px' }}>
            <h2 className="mb-3 text-sm font-semibold text-slate-200">Live Activity</h2>
            <div className="flex-1 overflow-y-auto">
              <ActivityFeed logs={activityLogs} compact />
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 animate-slide-up rounded-lg bg-surface-card px-4 py-3 text-sm text-slate-200 shadow-lg"
             style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
