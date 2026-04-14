import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
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
