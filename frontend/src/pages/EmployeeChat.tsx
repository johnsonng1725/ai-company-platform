import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Send, Loader2, AlertCircle, CheckCircle, Clock,
  RefreshCw, Copy, Download, Lightbulb, ChevronDown, ChevronUp,
} from 'lucide-react'
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

interface WorkStep {
  type: 'init' | 'context' | 'thinking' | 'working' | 'parsing' | 'proposal' | 'done' | 'error'
  content: string
  ts: string
}

interface Task {
  id: number
  title: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result: string
  error: string
  steps: WorkStep[]
  created_at: string
  updated_at: string
}

// ── Task templates per role ──────────────────────────────────────────────────
const ROLE_TEMPLATES: Record<string, string[]> = {
  'Market Researcher': [
    'Research the top 5 competitors of [your product] and summarise their pricing, features, and weaknesses',
    'Identify the 3 biggest market trends in [your industry] right now and what they mean for my business',
    'Find 10 potential B2B customers for [your product] — include company name, size, and why they\'d be a good fit',
    'Write a SWOT analysis for [your product/business] based on the current market',
  ],
  'Sales Representative': [
    'Write a cold email introducing [your product] to [target customer type] — keep it under 150 words',
    'Create a 3-step follow-up email sequence for leads who haven\'t replied in 7 days',
    'Write a LinkedIn outreach message for a [target role] at a [company type]',
    'Write 5 objection-handling responses for the most common sales objections for [product type]',
  ],
  'Marketing Manager': [
    'Write a 7-day social media content calendar for [your product] targeting [your audience]',
    'Write 5 compelling email subject lines for a product launch announcement',
    'Create a content brief for a blog post about [topic] targeting [audience] for SEO',
    'Write a Google Ads headline and description for [your product] — focus on the main benefit',
  ],
  'Content Writer': [
    'Write a 600-word blog post about [topic] for [target audience]',
    'Write 3 product description variations for [your product] — each with a different tone',
    'Rewrite this text to be clearer, more engaging, and more persuasive: [paste your text here]',
    'Write a landing page headline and subheadline for [your product]',
  ],
  'Financial Analyst': [
    'Create a simple monthly P&L template for a [business type] with the key revenue and cost categories',
    'Write a financial summary report based on these figures: [paste your numbers]',
    'Analyse this revenue data and identify trends and anomalies: [paste data]',
    'Build a simple pricing model for [product/service] considering costs, margins, and competitor pricing',
  ],
  'Customer Support': [
    'Write answers to the 10 most common support questions for [your product]',
    'Draft a professional response to this customer complaint: [paste complaint]',
    'Write a refund and cancellation policy for [your business type]',
    'Create a customer onboarding email sequence (3 emails) for new users of [your product]',
  ],
  'Developer': [
    'Review this code and suggest improvements for readability and performance: [paste code]',
    'Write a Python script that [describe what you need it to do]',
    'Debug this error and explain the fix: [paste error message and relevant code]',
    'Write unit tests for this function: [paste function]',
  ],
  'Secretary': [
    'Write a weekly status report template for a [business type] team',
    'Draft an agenda for a team meeting about [topic] — include time slots and discussion points',
    'Summarise these meeting notes into clear action items: [paste notes]',
    'Create a daily briefing based on this information: [paste today\'s priorities]',
  ],
}

const GENERIC_TEMPLATES = [
  'Summarise the key information about [topic] in bullet points',
  'Write a professional email about [subject] to [recipient]',
  'Create a simple plan for [task or project]',
  'Research and list the best options for [decision I need to make]',
]

function getTemplates(role: string): string[] {
  return ROLE_TEMPLATES[role] ?? GENERIC_TEMPLATES
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function downloadMarkdown(task: Task, employee: Employee) {
  const date = format(new Date(task.updated_at), 'PPP')
  const safeName = employee.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const content = [
    `# ${task.description}`,
    '',
    `**Employee:** ${employee.role_emoji} ${employee.name} (${employee.role})`,
    `**Date:** ${date}`,
    '',
    '---',
    '',
    task.result,
    '',
    '---',
    `*Generated by 1nexio — ${employee.name}*`,
  ].join('\n')
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeName}-${format(new Date(task.updated_at), 'yyyy-MM-dd')}.md`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Step icons & colours ──────────────────────────────────────────────────────
const STEP_META: Record<string, { icon: string; color: string }> = {
  init:     { icon: '📋', color: 'text-slate-400' },
  context:  { icon: '🧠', color: 'text-purple-400' },
  thinking: { icon: '💭', color: 'text-blue-400' },
  working:  { icon: '⚡', color: 'text-amber-400' },
  parsing:  { icon: '📊', color: 'text-cyan-400' },
  proposal: { icon: '📬', color: 'text-orange-400' },
  done:     { icon: '✅', color: 'text-emerald-400' },
  error:    { icon: '❌', color: 'text-red-400' },
}

// ── Live Work View ────────────────────────────────────────────────────────────
function LiveWorkView({ steps, status, employeeName }: {
  steps: WorkStep[]; status: Task['status']; employeeName: string
}) {
  const isLive = status === 'pending' || status === 'running'
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [steps])

  return (
    <div className="rounded-xl overflow-hidden"
         style={{ background: '#0a0a12', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b"
           style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/50" />
        </div>
        <span className="flex-1 text-center text-xs text-slate-600 font-mono">
          {employeeName}'s workspace
        </span>
        {isLive && (
          <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {/* Steps output */}
      <div className="p-4 font-mono text-xs min-h-[100px] max-h-[200px] overflow-y-auto flex flex-col gap-2">
        {steps.length === 0 ? (
          <div className="flex items-center gap-2 text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-600 animate-pulse" />
            Initialising...
          </div>
        ) : (
          steps.map((step, i) => {
            const meta = STEP_META[step.type] ?? STEP_META.init
            const isLast = i === steps.length - 1
            return (
              <div key={i}
                   className={`flex items-start gap-2 transition-opacity ${isLast && isLive ? 'opacity-100' : 'opacity-70'}`}>
                <span>{meta.icon}</span>
                <span className={`${meta.color} leading-relaxed`}>{step.content}</span>
                {isLast && isLive && (
                  <span className="ml-1 inline-block h-3 w-0.5 bg-current animate-pulse" />
                )}
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// ── Status icons ─────────────────────────────────────────────────────────────
const STATUS_ICON = {
  pending:   <Clock size={13} className="text-slate-500" />,
  running:   <Loader2 size={13} className="text-blue-400 animate-spin" />,
  completed: <CheckCircle size={13} className="text-emerald-400" />,
  failed:    <AlertCircle size={13} className="text-red-400" />,
}

// ── Message component ─────────────────────────────────────────────────────────
function Message({
  task, employee, onCopied,
}: {
  task: Task; employee: Employee; onCopied: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const isLong = task.result?.length > 600

  function handleCopy() {
    navigator.clipboard.writeText(task.result)
    onCopied()
  }

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      {/* User message bubble */}
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
            <LiveWorkView
              steps={task.steps ?? []}
              status={task.status}
              employeeName={employee.name}
            />
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
                        className="mt-2 flex items-center gap-1 text-xs text-accent-light hover:underline">
                  {expanded ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Show more</>}
                </button>
              )}
              {/* Action bar */}
              <div className="mt-3 flex items-center justify-between border-t pt-2.5"
                   style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <p className="text-xs text-slate-600">
                  {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopy}
                    title="Copy result"
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-slate-400 transition-all hover:bg-white/5 hover:text-slate-200">
                    <Copy size={12} /> Copy
                  </button>
                  <button
                    onClick={() => downloadMarkdown(task, employee)}
                    title="Download as Markdown"
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-slate-400 transition-all hover:bg-white/5 hover:text-slate-200">
                    <Download size={12} /> Download
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EmployeeChat() {
  const { companyId, employeeId } = useParams<{ companyId: string; employeeId: string }>()
  const navigate = useNavigate()
  const cid = Number(companyId)
  const eid = Number(employeeId)

  const [employee, setEmployee]           = useState<Employee | null>(null)
  const [tasks, setTasks]                 = useState<Task[]>([])
  const [input, setInput]                 = useState('')
  const [sending, setSending]             = useState(false)
  const [loading, setLoading]             = useState(true)
  const [showTemplates, setShowTemplates] = useState(false)
  const [copyToast, setCopyToast]         = useState(false)
  const bottomRef                         = useRef<HTMLDivElement>(null)
  const textareaRef                       = useRef<HTMLTextAreaElement>(null)
  const pollingRef                        = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadTasks = useCallback(async () => {
    const data = await api<Task[]>(`/employees/${eid}/tasks?company_id=${cid}`)
    setTasks(data)
    return data
  }, [cid, eid])

  useEffect(() => {
    async function init() {
      try {
        const emps = await employeesApi.list(cid)
        const emp = emps.find((e) => e.id === eid)
        setEmployee(emp ?? null)
        await loadTasks()
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [cid, eid, loadTasks])

  // Poll while tasks are running
  useEffect(() => {
    const hasPending = tasks.some((t) => t.status === 'pending' || t.status === 'running')
    if (hasPending && !pollingRef.current) {
      pollingRef.current = setInterval(async () => {
        const updated = await loadTasks()
        const stillPending = updated.some((t) => t.status === 'pending' || t.status === 'running')
        if (!stillPending && pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
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
    setShowTemplates(false)
    try {
      await api(`/employees/${eid}/chat?company_id=${cid}`, {
        method: 'POST',
        body: JSON.stringify({ message: msg }),
      })
      setInput('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
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

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }

  function useTemplate(tpl: string) {
    setInput(tpl)
    setShowTemplates(false)
    setTimeout(() => {
      textareaRef.current?.focus()
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px'
      }
    }, 50)
  }

  function handleCopied() {
    setCopyToast(true)
    setTimeout(() => setCopyToast(false), 2000)
  }

  const isWorking = employee?.status === 'working' || tasks.some((t) => t.status === 'pending' || t.status === 'running')
  const templates = employee ? getTemplates(employee.role) : GENERIC_TEMPLATES

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
            /* ── Empty state with template suggestions ── */
            <div className="flex flex-col items-center gap-5 py-16 text-center">
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

              {/* Template chips in empty state */}
              <div className="w-full max-w-xl">
                <p className="mb-3 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500">
                  <Lightbulb size={12} className="text-amber-400" />
                  Try one of these
                </p>
                <div className="flex flex-col gap-2">
                  {templates.slice(0, 4).map((tpl) => (
                    <button
                      key={tpl}
                      onClick={() => useTemplate(tpl)}
                      className="rounded-xl px-4 py-3 text-left text-sm text-slate-300 transition-all hover:text-white"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(13,148,136,0.35)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}>
                      {tpl}
                    </button>
                  ))}
                </div>
              </div>

              {employee.capabilities.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
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
              <Message key={task.id} task={task} employee={employee} onCopied={handleCopied} />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Template suggestions panel (when chat has messages) */}
      {showTemplates && tasks.length > 0 && (
        <div className="shrink-0 border-t px-6 pt-3 pb-1"
             style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(8,8,16,0.95)' }}>
          <div className="mx-auto max-w-3xl">
            <p className="mb-2 text-xs text-slate-600">Suggested tasks for {employee.name}</p>
            <div className="flex flex-col gap-1.5 pb-2">
              {templates.map((tpl) => (
                <button
                  key={tpl}
                  onClick={() => useTemplate(tpl)}
                  className="rounded-lg px-3 py-2 text-left text-xs text-slate-400 transition-all hover:bg-white/5 hover:text-slate-200">
                  {tpl}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="shrink-0 border-t px-6 py-4"
           style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(8,8,16,0.8)', backdropFilter: 'blur(8px)' }}>
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-3 rounded-2xl px-4 py-3"
               style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {/* Suggestions toggle */}
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              title="Show task suggestions"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all ${showTemplates ? 'bg-amber-500/20 text-amber-400' : 'text-slate-600 hover:text-slate-400 hover:bg-white/5'}`}>
              <Lightbulb size={15} />
            </button>

            <textarea
              ref={textareaRef}
              className="flex-1 resize-none bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
              style={{ minHeight: '24px', maxHeight: '160px' }}
              placeholder={isWorking
                ? `${employee.name} is working, please wait...`
                : `Message ${employee.name}... (Enter to send, Shift+Enter for new line)`}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKey}
              disabled={isWorking || sending}
              rows={1}
            />
            <button
              onClick={send}
              disabled={!input.trim() || isWorking || sending}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition-all hover:bg-accent-light disabled:opacity-30 disabled:cursor-not-allowed active:scale-95">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-slate-600">
            {employee.name} uses <span className="text-slate-500">{(employee.config as any)?.model ?? 'claude-sonnet-4-6'}</span>
          </p>
        </div>
      </div>

      {/* Copy toast */}
      {copyToast && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 -translate-x-1/2 rounded-lg px-4 py-2 text-xs font-medium text-white shadow-lg animate-fade-in"
             style={{ background: 'rgba(13,148,136,0.9)', border: '1px solid rgba(13,148,136,0.5)' }}>
          ✓ Copied to clipboard
        </div>
      )}
    </div>
  )
}
