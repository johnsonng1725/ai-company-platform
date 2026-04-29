import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Landing from './pages/Landing'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import Companies from './pages/Companies'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Proposals from './pages/Proposals'
import Settings from './pages/Settings'
import EmployeeChat from './pages/EmployeeChat'
import MeetingRoom from './pages/MeetingRoom'
import Layout from './components/Layout'

const IS_DEV = import.meta.env.DEV

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      setAuthed(true)
      setReady(true)
      return
    }
    if (IS_DEV) {
      // Auto-login in local dev — no password needed
      fetch('/api/dev/token')
        .then(r => r.json())
        .then(data => {
          if (data.token) {
            localStorage.setItem('token', data.token)
            setAuthed(true)
          }
        })
        .catch(() => {})
        .finally(() => setReady(true))
    } else {
      setReady(true)
    }
  }, [])

  if (!ready) return (
    <div className="flex h-screen items-center justify-center bg-surface">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  )
  return authed ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing page — skip straight to app in local dev */}
        <Route path="/" element={IS_DEV ? <Navigate to="/companies" replace /> : <Landing />} />
        <Route path="/login" element={IS_DEV ? <Navigate to="/companies" replace /> : <Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Company selector — landing page after login */}
        <Route
          path="/companies"
          element={<ProtectedRoute><Companies /></ProtectedRoute>}
        />

        {/* Company workspace routes */}
        <Route
          path="/c/:companyId"
          element={<ProtectedRoute><Layout /></ProtectedRoute>}
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="employees" element={<Employees />} />
          <Route path="employees/:employeeId/chat" element={<EmployeeChat />} />
          <Route path="meetings/:meetingId" element={<MeetingRoom />} />
          <Route path="proposals" element={<Proposals />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
