import { Outlet, NavLink, useNavigate, useParams } from 'react-router-dom'
import { LayoutDashboard, Users, FileText, Settings, LogOut, Zap, ChevronLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { companies as companiesApi } from '../lib/api'
import type { Company } from '../lib/api'

const NAV = [
  { to: 'dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: 'employees',  icon: Users,            label: 'AI Employees' },
  { to: 'proposals',  icon: FileText,         label: 'Proposals' },
  { to: 'settings',   icon: Settings,         label: 'Settings' },
]

export default function Layout() {
  const navigate = useNavigate()
  const { companyId } = useParams<{ companyId: string }>()
  const [company, setCompany] = useState<Company | null>(null)

  useEffect(() => {
    if (companyId) {
      companiesApi.list().then((list) => {
        const found = list.find((c) => c.id === Number(companyId))
        setCompany(found ?? null)
      }).catch(() => {})
    }
  }, [companyId])

  function logout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r py-5"
             style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#080810' }}>

        {/* Back to companies */}
        <button
          onClick={() => navigate('/companies')}
          className="mx-3 mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500 transition-all hover:bg-white/5 hover:text-slate-300"
        >
          <ChevronLeft size={14} />
          All Companies
        </button>

        {/* Current company */}
        <div className="mb-5 flex items-center gap-2.5 px-5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent">
            <Zap size={13} className="text-white" />
          </div>
          <span className="truncate text-xs font-semibold text-white" title={company?.name ?? ''}>
            {company?.name ?? 'Loading...'}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={`/c/${companyId}/${to}`}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-accent/15 text-accent-light'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition-all hover:bg-white/5 hover:text-slate-300"
          >
            <LogOut size={16} />
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
