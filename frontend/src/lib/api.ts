const BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Network error' }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const auth = {
  register: (email: string, password: string, full_name: string) =>
    request<{ access_token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name }),
    }),
  login: (email: string, password: string) =>
    request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<User>('/auth/me'),
}

// ── Company ───────────────────────────────────────────────────────────────────
export const company = {
  get: () => request<Company>('/company'),
  create: (data: Partial<Company> & { name: string }) =>
    request<Company>('/company', { method: 'POST', body: JSON.stringify(data) }),
  update: (data: Partial<Company>) =>
    request<Company>('/company', { method: 'PUT', body: JSON.stringify(data) }),
}

// ── Employees ─────────────────────────────────────────────────────────────────
export const employees = {
  list: () => request<Employee[]>('/employees'),
  create: (data: Partial<Employee> & { name: string; role: string }) =>
    request<Employee>('/employees', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Employee>) =>
    request<Employee>(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<{ ok: boolean }>(`/employees/${id}`, { method: 'DELETE' }),
  run: (id: number) =>
    request<{ ok: boolean; message: string }>(`/employees/${id}/run`, { method: 'POST' }),
}

// ── Proposals ─────────────────────────────────────────────────────────────────
export const proposals = {
  list: (status?: string) =>
    request<Proposal[]>(`/proposals${status ? `?status=${status}` : ''}`),
  approve: (id: number, feedback = '') =>
    request<Proposal>(`/proposals/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    }),
  reject: (id: number, feedback: string) =>
    request<Proposal>(`/proposals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    }),
  revise: (id: number, feedback: string) =>
    request<Proposal>(`/proposals/${id}/revise`, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    }),
}

// ── Activity ──────────────────────────────────────────────────────────────────
export const activity = {
  list: (limit = 50) => request<ActivityLog[]>(`/activity?limit=${limit}`),
}

export const stats = {
  get: () => request<Stats>('/stats'),
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface User {
  id: number
  email: string
  full_name: string
  created_at: string
}

export interface Company {
  id: number
  name: string
  description: string
  has_anthropic_key: boolean
  has_openai_key: boolean
  created_at: string
}

export interface Employee {
  id: number
  name: string
  role: string
  role_emoji: string
  description: string
  capabilities: string[]
  schedule_cron: string
  status: 'idle' | 'working' | 'waiting_approval' | 'error'
  current_task: string
  is_active: boolean
  last_active: string | null
  config: Record<string, unknown>
  created_at: string
}

export interface Proposal {
  id: number
  title: string
  content: string
  summary: string
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested'
  ceo_feedback: string
  employee_id: number | null
  employee_name: string | null
  employee_emoji: string | null
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: number
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
  data: Record<string, unknown>
  employee_id: number | null
  employee_name: string | null
  employee_emoji: string | null
  created_at: string
}

export interface Stats {
  employees: number
  active: number
  pending_proposals: number
  tasks_today: number
}
