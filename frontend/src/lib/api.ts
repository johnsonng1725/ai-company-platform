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

function qs(params: Record<string, string | number | undefined>) {
  const p = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  return p ? `?${p}` : ''
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const auth = {
  register: (email: string, password: string, full_name: string) =>
    request<{ access_token: string; user: User }>('/auth/register', {
      method: 'POST', body: JSON.stringify({ email, password, full_name }),
    }),
  login: (email: string, password: string) =>
    request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
  me: () => request<User>('/auth/me'),
  updatePlan: (plan: string) =>
    request<User>('/auth/plan', { method: 'PUT', body: JSON.stringify({ plan }) }),
}

// ── Companies ─────────────────────────────────────────────────────────────────
export const companies = {
  list: () => request<Company[]>('/companies'),
  create: (data: { name: string; description?: string }) =>
    request<Company>('/companies', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Company> & { anthropic_api_key?: string; openai_api_key?: string }) =>
    request<Company>(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<{ ok: boolean }>(`/companies/${id}`, { method: 'DELETE' }),
}

// ── Employees ─────────────────────────────────────────────────────────────────
export const employees = {
  list: (companyId: number) =>
    request<Employee[]>(`/employees${qs({ company_id: companyId })}`),
  create: (companyId: number, data: Partial<Employee> & { name: string; role: string }) =>
    request<Employee>(`/employees${qs({ company_id: companyId })}`, {
      method: 'POST', body: JSON.stringify(data),
    }),
  update: (companyId: number, id: number, data: Partial<Employee>) =>
    request<Employee>(`/employees/${id}${qs({ company_id: companyId })}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),
  delete: (companyId: number, id: number) =>
    request<{ ok: boolean }>(`/employees/${id}${qs({ company_id: companyId })}`, { method: 'DELETE' }),
  run: (companyId: number, id: number) =>
    request<{ ok: boolean; message: string }>(`/employees/${id}/run${qs({ company_id: companyId })}`, { method: 'POST' }),
}

// ── Proposals ─────────────────────────────────────────────────────────────────
export const proposals = {
  list: (companyId: number, status?: string) =>
    request<Proposal[]>(`/proposals${qs({ company_id: companyId, status })}`),
  approve: (companyId: number, id: number, feedback = '') =>
    request<Proposal>(`/proposals/${id}/approve${qs({ company_id: companyId })}`, {
      method: 'POST', body: JSON.stringify({ feedback }),
    }),
  reject: (companyId: number, id: number, feedback: string) =>
    request<Proposal>(`/proposals/${id}/reject${qs({ company_id: companyId })}`, {
      method: 'POST', body: JSON.stringify({ feedback }),
    }),
  revise: (companyId: number, id: number, feedback: string) =>
    request<Proposal>(`/proposals/${id}/revise${qs({ company_id: companyId })}`, {
      method: 'POST', body: JSON.stringify({ feedback }),
    }),
}

// ── Activity ──────────────────────────────────────────────────────────────────
export const activity = {
  list: (companyId: number, limit = 50) =>
    request<ActivityLog[]>(`/activity${qs({ company_id: companyId, limit })}`),
}

export const stats = {
  get: (companyId: number) =>
    request<Stats>(`/stats${qs({ company_id: companyId })}`),
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface User {
  id: number
  email: string
  full_name: string
  plan: string
  created_at: string
}

export interface Company {
  id: number
  name: string
  description: string
  has_anthropic_key: boolean
  has_openai_key: boolean
  employee_count: number
  pending_proposals: number
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
  tasks_this_week: number
  tasks_completed_total: number
  hours_saved: number
  proposals_approved: number
}
