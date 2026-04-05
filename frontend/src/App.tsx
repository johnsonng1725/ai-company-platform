import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Companies from './pages/Companies'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Proposals from './pages/Proposals'
import Settings from './pages/Settings'
import Layout from './components/Layout'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

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
          <Route path="proposals" element={<Proposals />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/companies" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
