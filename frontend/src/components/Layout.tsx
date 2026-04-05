import { Outlet, NavLink, useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, Settings,
  LogOut, Zap, ChevronLeft, MessageSquare,
  Video, Plus, ChevronDown, ChevronRight,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { companies as companiesApi, employees as employeesApi } from '../lib/api'
import type { Company, Employee } from '../lib/api'

const BASE_NAV = [
  { to: 'dashboard',  icon: LayoutDashboard, label: 'Dashboard'    },
  { to: 'employees',  icon: Users,            label: 'AI Employees' },
  { to: 'proposals',  icon: FileText,         label: 'Proposals'    },
  { to: 'settings',   icon: Settings,         label: 'Settings'     },
]

const STATUS_DOT: Record<string, string> = {
  idle:             'bg-slate-500',
  working:          'bg-blue-400 animate-pulse',
  waiting_approval: 'bg-amber-400 animate-pulse',
  error:            'bg-red-400',
}

interface Meeting { id: number; name: string; participant_ids: number[] }

async function fetchMeetings(companyId: number): Promise<Meeting[]> {
  const token = localStorage.getItem('token')
  const res = await fetch(`/api/meetings?company_id=${companyId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  return res.json()
}

export default function Layout() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { companyId } = useParams<{ companyId: string }>()
  const cid = Number(companyId)

  const [company,   setCompany]   = useState<Company | null>(null)
  const [empList,   setEmpList]   = useState<Employee[]>([])
  const [meetings,  setMeetings]  = useState<Meeting[]>([])
  const [chatOpen,  setChatOpen]  = useState(true)

  useEffect(() => {
    if (!cid) return
    companiesApi.list().then((list) => setCompany(list.find((c) => c.id === cid) ?? null))
    employeesApi.list(cid).then(setEmpList)
    fetchMeetings(cid).then(setMeetings)

    // Refresh employee statuses every 8s
    const interval = setInterval(() => {
      employeesApi.list(cid).then(setEmpList).catch(() => {})
    }, 8000)
    return () => clearInterval(interval)
  }, [cid])

  async function createMeeting() {
    const name = prompt('Meeting name (e.g. "Weekly Strategy", "All Hands"):')
    if (!name?.trim()) return
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/meetings?company_id=${cid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: name.trim(), participant_ids: empList.map((e) => e.id) }),
    })
    if (res.ok) {
      const m = await res.json()
      setMeetings((prev) => [m, ...prev])
      navigate(`/c/${cid}/meetings/${m.id}`)
    }
  }

  const isInChat = location.pathname.includes('/chat') || location.pathname.includes('/meetings/')

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r overflow-y-auto"
             style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#080810' }}>

        {/* Back + Company name */}
        <div className="sticky top-0 z-10 pt-4 pb-2 px-3" style={{ background: '#080810' }}>
          <button
            onClick={() => navigate('/companies')}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500 transition-all hover:bg-white/5 hover:text-slate-300 w-full"
          >
            <ChevronLeft size={14} />
            All Companies
          </button>
          <div className="mt-3 flex items-center gap-2.5 px-3 pb-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent">
              <Zap size={13} className="text-white" />
            </div>
            <span className="truncate text-xs font-semibold text-white" title={company?.name ?? ''}>
              {company?.name ?? '...'}
            </span>
          </div>
        </div>

        {/* Main Nav */}
        <nav className="flex flex-col gap-0.5 px-3 pb-2">
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">Main</p>
          {BASE_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={`/c/${cid}/${to}`}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  isActive ? 'bg-accent/15 text-accent-light' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-4 my-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />

        {/* Office / Chat section */}
        <div className="flex flex-col gap-0.5 px-3 flex-1">
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="mb-1 flex items-center gap-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600 hover:text-slate-400 transition-colors"
          >
            {chatOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            Office
          </button>

          {chatOpen && (
            <>
              {/* Employee Workspaces */}
              <p className="mb-0.5 mt-1 px-3 text-[10px] text-slate-700 uppercase tracking-wider">Workspaces</p>
              {empList.length === 0 ? (
                <p className="px-3 py-1 text-xs text-slate-700 italic">No employees yet</p>
              ) : (
                empList.map((emp) => {
                  const chatPath = `/c/${cid}/employees/${emp.id}/chat`
                  const isActive = location.pathname === chatPath
                  return (
                    <button
                      key={emp.id}
                      onClick={() => navigate(chatPath)}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all w-full ${
                        isActive ? 'bg-accent/15 text-accent-light' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-base leading-none">{emp.role_emoji}</span>
                      <span className="flex-1 truncate text-xs font-medium">{emp.name}</span>
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[emp.status] ?? 'bg-slate-500'}`} />
                    </button>
                  )
                })
              )}

              {/* Meeting Rooms */}
              <div className="mt-3 flex items-center justify-between px-3">
                <p className="text-[10px] text-slate-700 uppercase tracking-wider">Meeting Rooms</p>
                <button
                  onClick={createMeeting}
                  title="New meeting"
                  className="text-slate-600 hover:text-slate-400 transition-colors"
                >
                  <Plus size={12} />
                </button>
              </div>

              {meetings.map((m) => {
                const mPath = `/c/${cid}/meetings/${m.id}`
                const isActive = location.pathname === mPath
                return (
                  <button
                    key={m.id}
                    onClick={() => navigate(mPath)}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all w-full ${
                      isActive ? 'bg-accent/15 text-accent-light' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <Video size={13} className="shrink-0" />
                    <span className="flex-1 truncate text-xs font-medium">{m.name}</span>
                    {m.participant_ids.length > 0 && (
                      <span className="text-[10px] text-slate-600">{m.participant_ids.length}p</span>
                    )}
                  </button>
                )
              })}

              <button
                onClick={createMeeting}
                className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-600 hover:bg-white/5 hover:text-slate-400 transition-all w-full"
              >
                <Plus size={12} />
                New Meeting
              </button>
            </>
          )}
        </div>

        {/* Logout */}
        <div className="sticky bottom-0 border-t px-3 py-3" style={{ background: '#080810', borderColor: 'rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => { localStorage.removeItem('token'); navigate('/login') }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-all hover:bg-white/5 hover:text-slate-300"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
