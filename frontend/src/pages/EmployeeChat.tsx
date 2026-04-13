import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Loader2, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { employees as employeesApi } from '../lib/api'
import type { Employee } from '../lib/api'

const BASE = '/api'

function getToken() { return localStorage.getItem('token') }

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...options.headers },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error' }))
    throw new Error(err.detail)
  }
  return res.json()
}

interface Task {
  id: number
  title: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result: string
  error: string
  created_at: string
  updated_at: string
}

const STATUS_ICON = {
  pending:   <Clock size={13} className="text-slate-500" />,
  running:   <Loader2 size={13} className="text-blue-400 animate-spin" />,
  completed: <CheckCircle size={13} className="text-emerald-400" />,
  failed:    <AlertCircle size={13} className="text-red-400" />,
}

function Message({ task, employee }: { task: Task; employee: Employee }) {
  const [expanded, setExpanded] = useState(true)
  const isLong = task.result?.length > 600

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      {/* User message */}
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-white"
             style={{ background: 'rgba(13,148,136,0.35)', border: '1px solid rgba(13,148,136,0.4)' }}>
          <p className="leading-relaxed whitespace-pre-wrap">{task.description}</p>
          <p className="mt-1 text-right text-xs opacity-50">
            {format(new Date(task.created_at), 'HH:mm')}
          </p>
        </div>
      </div>

      {/* Employee reply */}
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-lg"
             style={{ background: 'rgba(255,255,255,0.06)' }}>
          {employee.role_emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">{employee.name}</span>
            <span>{STATUS_ICON[task.status]}</span>
            {task.status === 'running' && <span className="text-xs text-blue-400">Working...</span>}
            {task.status === 'pending' && <span className="text-xs text-slate-500">Queued</span>}
          </div>

          {(task.status === 'pending' || task.status === 'running') && (
            <div className="flex gap-1.5 items-center rounded-xl px-4 py-3"
                 style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}

          {task.status === 'failed' && (
            <div className="rounded-xl px-4 py-3 text-sm text-red-400"
                 style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {task.error || 'An error occurred.'}
            </div>
          )}

          {task.status === 'completed' && task.result && (
            <div className="rounded-xl px-4 py-3"
                 style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className={`text-sm text-slate-200 leading-relaxed whitespace-pre-wrap ${!expanded && isLong ? 'line-clamp-6' : ''}`}>
                {task.result}
              </div>
              {isLong && (
                <button onClick={() => setExpanded(!expanded)}
                        className="mt-2 text-xs text-accent-light hover:underline">
                  {expanded ? 'Show less ↑' : 'Show more ↓'}
                </button>
              )}
              <p className="mt-2 text-xs text-slate-600">
                {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EmployeeChat() {
  const { companyId, employeeId } = useParams<{ companyId: string; employeeId: string }>()
  const navigate = useNavigate()
  const cid = Number(companyId)
  const eid = Number(employeeId)

  const [employee, setEmployee]   = useState<Employee | null>(null)
  const [tasks, setTasks]         = useState<Task[]>([])
  const [input, setInput]         = useState('')
  const [sending, setSending]     = useState(false)
  const [loading, setLoading]     = useState(true)
  const bottomRef                 = useRef<HTMLDivElement>(null)
  const textareaRef               = useRef<HTMLTextAreaElement>(null)
  const pollingRef                = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadTasks = useCallback(async () => {
    const data = await api<Task[]>(`/employees/${eid}/tasks?company_id=${cid}`)
    setTasks(data)
    return data
  }, [cid, eid])

  useEffect(() => {
    async function init() {
      try {
        const [emps] = await Promise.all([employeesApi.list(cid)])
        const emp = emps.find((e) => e.id === eid)
        setEmployee(emp ?? null)
        await loadTasks()
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [cid, eid, loadTasks])

  // Poll for updates when a task is pending/running
  useEffect(() => {
    const hasPending = tasks.some((t) => t.status === 'pending' || t.status === 'running')
    if (hasPending && !pollingRef.current) {
      pollingRef.current = setInterval(async () => {
        const updated = await loadTasks()
        const stillPending = updated.some((t) => t.status === 'pending' || t.status === 'running')
        if (!stillPending && pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
          // Refresh employee status too
          employeesApi.list(cid).then((emps) => {
            setEmployee(emps.find((e) => e.id === eid) ?? null)
          })
        }
      }, 3000)
    }
    return () => {}
  }, [tasks, cid, eid, loadTasks])

  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current) }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [tasks])

  async function send() {
    const msg = input.trim()
    if (!msg || sending) return
    setSending(true)
    try {
      await api(`/employees/${eid}/chat?company_id=${cid}`, {
        method: 'POST',
        body: JSON.stringify({ message: msg }),
      })
      setInput('')
      await loadTasks()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSending(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  // Auto-resize textarea
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }

  const isWorking = employee?.status === 'working' || tasks.some((t) => t.status === 'pending' || t.status === 'running')

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-surface">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  )

  if (!employee) return (
    <div className="flex h-screen items-center justify-center bg-surface text-slate-400">Employee not found.</div>
  )

  return (
    <div className="flex h-screen flex-col bg-surface">
      {/* Header */}
      <header className="flex items-center gap-4 border-b px-6 py-4 shrink-0"
              style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#080810' }}>
        <button onClick={() => navigate(`/c/${cid}/employees`)}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors">
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl text-xl"
               style={{ background: 'rgba(13,148,136,0.12)' }}>
            {employee.role_emoji}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{employee.name}</p>
            <p className="text-xs text-slate-500">{employee.role}</p>
          </div>
          {/* Status */}
          <div className={`ml-2 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            isWorking ? 'bg-blue-500/15 text-blue-400' : 'bg-slate-500/15 text-slate-400'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isWorking ? 'bg-blue-400 animate-pulse' : 'bg-slate-500'}`} />
            {isWorking ? 'Working...' : 'Ready'}
          </div>
        </div>
        <button onClick={loadTasks} className="ml-auto text-slate-500 hover:text-slate-300 transition-colors">
          <RefreshCw size={15} />
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-4xl"
                   style={{ background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.15)' }}>
                {employee.role_emoji}
              </div>
              <div>
                <p className="text-base font-medium text-slate-200">Start a conversation with {employee.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  Give them a task and they'll get to work immediately.
                </p>
              </div>
              {employee.capabilities.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-1">
                  {employee.capabilities.map((c) => (
                    <span key={c} className="rounded-lg px-3 py-1 text-xs text-slate-500"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            tasks.map((task) => (
              <Message key={task.id} task={task} employee={employee} />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t px-6 py-4"
           style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(8,8,16,0.8)', backdropFilter: 'blur(8px)' }}>
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-3 rounded-2xl px-4 py-3"
               style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <textarea
              ref={textareaRef}
              className="flex-1 resize-none bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
              style={{ minHeight: '24px', maxHeight: '160px' }}
              placeholder={isWorking ? `${employee.name} is working, please wait...` : `Message ${employee.name}... (Enter to send, Shift+Enter for new line)`}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKey}
              disabled={isWorking || sending}
              rows={1}
            />
            <button
              onClick={send}
              disabled={!input.trim() || isWorking || sending}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition-all hover:bg-accent-light disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-slate-600">
            {employee.name} uses <span className="text-slate-500">{(employee.config as any)?.model ?? 'claude-sonnet-4-6'}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
