import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Users, Zap, FileText, CheckSquare, RefreshCw, Plus,
  Clock, TrendingUp, ArrowRight, CheckCircle, Circle, AlertTriangle,
} from 'lucide-react'
import { employees as employeesApi, proposals as proposalsApi, activity as activityApi, stats as statsApi } from '../lib/api'
import type { Employee, Proposal, ActivityLog, Stats } from '../lib/api'
import EmployeeCard from '../components/EmployeeCard'
import ActivityFeed from '../components/ActivityFeed'

/* ── Plan / Trial banner ───────────────────────────────────────────── */
function PlanBanner({ stats, navigate }: { stats: Stats; navigate: (p: string) => void }) {
  const { plan, plan_task_limit, tasks_this_month, trial_started_at } = stats

  // ── Trial countdown ──
  if (plan === 'trial' && trial_started_at) {
    const trialEnd = new Date(new Date(trial_started_at).getTime() + 7 * 24 * 60 * 60 * 1000)
    const msLeft = trialEnd.getTime() - Date.now()
    const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24))
    const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const expired = msLeft <= 0
    const urgent = !expired && daysLeft < 2

    const bg = expired || urgent ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)'
    const border = expired || urgent ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'
    const textColor = expired || urgent ? 'text-red-300' : 'text-amber-300'
    const subColor = expired || urgent ? 'text-red-400/70' : 'text-amber-400/70'

    return (
      <div className="flex items-center justify-between rounded-xl px-4 py-3"
           style={{ background: bg, border: `1px solid ${border}` }}>
        <div className="flex items-center gap-3">
          <AlertTriangle size={15} className={urgent || expired ? 'text-red-400' : 'text-amber-400'} />
          <div>
            <p className={`text-sm font-medium ${textColor}`}>
              {expired ? 'Your free trial has ended' : `Free trial: ${daysLeft}d ${hoursLeft}h remaining`}
            </p>
            <p className={`text-xs ${subColor}`}>
              {expired ? 'Choose a plan to keep using 1nexio' : 'Currently on Pro features — upgrade to keep access'}
            </p>
          </div>
        </div>
        <button onClick={() => navigate('/select-plan')}
          className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all hover:opacity-90"
          style={{ background: urgent || expired ? '#ef4444' : 'linear-gradient(to right, #f59e0b, #f97316)' }}>
          Choose Plan →
        </button>
      </div>
    )
  }

  // ── Usage bar for paid/builder plans ──
  if (!plan_task_limit) return null   // unlimited (builder / max unlimited tasks)

  const used = tasks_this_month
  const pct = Math.min(100, Math.round((used / plan_task_limit) * 100))
  const almostFull = pct >= 80
  const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#14b8a6'

  return (
    <div className="flex items-center gap-4 rounded-xl px-4 py-3"
         style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-medium text-slate-400">
            Tasks this month
          </p>
          <p className={`text-xs font-semibold ${almostFull ? 'text-amber-400' : 'text-slate-300'}`}>
            {used} / {plan_task_limit}
          </p>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/10">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
        </div>
      </div>
      {almostFull && (
        <button onClick={() => navigate('/select-plan')}
          className="whitespace-nowrap rounded-lg border border-amber-500/30 px-3 py-1.5 text-xs font-medium text-amber-400 hover:border-amber-400 transition-all">
          Upgrade
        </button>
      )}
    </div>
  )
}

/* ── Onboarding checklist ──────────────────────────────────────────── */
function OnboardingGuide({ empCount, hasProposals, companyId }: {
  empCount: number; hasProposals: boolean; companyId: number
}) {
  const navigate = useNavigate()
  const steps = [
    { done: true,           label: 'Create your company',         desc: 'Your AI company is live' },
    { done: empCount > 0,   label: 'Hire your first AI employee', desc: 'Go to AI Employees → Hire', action: () => navigate(`/c/${companyId}/employees`) },
    { done: empCount > 0,   label: 'Chat with an employee',       desc: 'Click a workspace in the sidebar', action: () => navigate(`/c/${companyId}/employees`) },
    { done: hasProposals,   label: 'Review a proposal',           desc: 'Employees submit decisions for you to approve', action: () => navigate(`/c/${companyId}/proposals`) },
  ]
  const doneCount = steps.filter(s => s.done).length
  const pct = Math.round((doneCount / steps.length) * 100)

  return (
    <div className="card p-5" style={{ background: 'rgba(13,148,136,0.05)', borderColor: 'rgba(13,148,136,0.2)' }}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Get started</h2>
          <p className="mt-0.5 text-xs text-slate-500">{doneCount} of {steps.length} steps complete</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 rounded-full bg-white/10">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-slate-500">{pct}%</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {steps.map((s) => (
          <div key={s.label}
            onClick={s.action && !s.done ? s.action : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${s.action && !s.done ? 'cursor-pointer hover:bg-white/5' : ''}`}>
            {s.done
              ? <CheckCircle size={16} className="shrink-0 text-emerald-400" />
              : <Circle size={16} className="shrink-0 text-slate-600" />}
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${s.done ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{s.label}</p>
              {!s.done && <p className="text-xs text-slate-600">{s.desc}</p>}
            </div>
            {s.action && !s.done && <ArrowRight size={13} className="shrink-0 text-slate-600" />}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Main Dashboard ────────────────────────────────────────────────── */
const STAT_CARDS = [
  { key: 'employees',            label: 'AI Employees',       icon: Users,       color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { key: 'tasks_this_week',      label: 'Tasks This Week',    icon: TrendingUp,  color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  { key: 'tasks_completed_total',label: 'Tasks Completed',    icon: CheckSquare, color: 'text-emerald-400',bg: 'bg-emerald-500/10'},
  { key: 'hours_saved',          label: 'Est. Hours Saved',   icon: Clock,       color: 'text-amber-400',  bg: 'bg-amber-500/10'  },
] as const

export default function Dashboard() {
  const navigate = useNavigate()
  const { companyId } = useParams<{ companyId: string }>()
  const cid = Number(companyId)

  const [empList, setEmpList]           = useState<Employee[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [pendingProposals, setPending]  = useState<Proposal[]>([])
  const [statsData, setStats]           = useState<Stats>({
    employees: 0, active: 0, pending_proposals: 0, tasks_today: 0,
    tasks_this_week: 0, tasks_this_month: 0, tasks_completed_total: 0,
    hours_saved: 0, proposals_approved: 0,
    plan: 'trial', plan_task_limit: 300, plan_employee_limit: 10, trial_started_at: null,
  })
  const [loading, setLoading]   = useState(true)
  const [toast, setToast]       = useState('')
  const eventSourceRef          = useRef<EventSource | null>(null)

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

  const isNewUser = empList.length === 0 && statsData.tasks_completed_total === 0

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Your AI company at a glance</p>
        </div>
        <button onClick={refresh} className="btn-ghost text-xs"><RefreshCw size={14} />Refresh</button>
      </div>

      {/* Plan / trial banner */}
      <PlanBanner stats={statsData} navigate={navigate} />

      {/* Onboarding for new users */}
      {isNewUser && (
        <OnboardingGuide
          empCount={empList.length}
          hasProposals={statsData.proposals_approved > 0}
          companyId={cid}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, color, bg }) => (
          <div key={key} className="card flex items-center gap-4 p-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {key === 'hours_saved'
                  ? `${(statsData as any)[key]}h`
                  : (statsData as any)[key]}
              </p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Active employees banner */}
      {statsData.active > 0 && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3"
             style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500" />
          </span>
          <p className="text-sm text-blue-300 font-medium">
            {statsData.active} employee{statsData.active !== 1 ? 's' : ''} working right now
          </p>
          {statsData.pending_proposals > 0 && (
            <button onClick={() => navigate(`/c/${cid}/proposals`)}
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all">
              <FileText size={12} />
              {statsData.pending_proposals} awaiting approval
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Employees */}
        <div className="col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">AI Employees</h2>
            <button onClick={() => navigate(`/c/${cid}/employees`)} className="btn-ghost text-xs py-1.5 px-3">
              <Plus size={13} />Hire Employee
            </button>
          </div>

          {empList.length === 0 ? (
            <div className="card flex flex-col items-center gap-4 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl"
                   style={{ background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.2)' }}>
                🤖
              </div>
              <div>
                <p className="text-sm font-medium text-slate-300">No AI employees yet</p>
                <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
                  Hire your first AI employee — choose a role like Market Researcher, Content Writer, or Sales Rep.
                </p>
              </div>
              <button onClick={() => navigate(`/c/${cid}/employees`)} className="btn-primary text-xs mt-1">
                <Plus size={14} />Hire Your First Employee
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {empList.slice(0, 6).map((emp) => (
                <EmployeeCard key={emp.id} employee={emp} companyId={cid}
                  onRun={handleRun} onDelete={handleDelete}
                  onChat={(e) => navigate(`/c/${cid}/employees/${e.id}/chat`)} />
              ))}
              {empList.length > 6 && (
                <button onClick={() => navigate(`/c/${cid}/employees`)}
                  className="card flex items-center justify-center gap-2 p-4 text-sm text-slate-500 hover:text-slate-300 hover:border-white/15 transition-all">
                  <Users size={16} />+{empList.length - 6} more
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-4">
          {/* Pending proposals */}
          {pendingProposals.length > 0 && (
            <div className="card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-200">Needs Your Approval</h2>
                <span className="badge bg-amber-500/15 text-amber-400 border border-amber-500/20">
                  {pendingProposals.length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {pendingProposals.slice(0, 3).map((p) => (
                  <button key={p.id} onClick={() => navigate(`/c/${cid}/proposals`)}
                    className="flex items-start gap-2.5 rounded-lg p-2.5 text-left transition-all hover:bg-white/5"
                    style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.12)' }}>
                    <span className="text-base shrink-0">{p.employee_emoji ?? '📋'}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-200 line-clamp-1">{p.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{p.employee_name ?? 'AI Employee'}</p>
                    </div>
                  </button>
                ))}
                {pendingProposals.length > 3 && (
                  <button onClick={() => navigate(`/c/${cid}/proposals`)}
                    className="text-xs text-accent-light hover:underline text-center pt-1">
                    View all {pendingProposals.length} →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Live activity */}
          <div className="card flex flex-1 flex-col p-4" style={{ maxHeight: '500px' }}>
            <h2 className="mb-3 text-sm font-semibold text-slate-200">Live Activity</h2>
            {activityLogs.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center py-8">
                <Zap size={20} className="text-slate-700" />
                <p className="text-xs text-slate-600">Activity will appear here as your employees work</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <ActivityFeed logs={activityLogs} compact />
              </div>
            )}
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
