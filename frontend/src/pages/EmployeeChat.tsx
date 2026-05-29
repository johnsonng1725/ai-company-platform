import ReactMarkdown from 'react-markdown'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Send, Loader2, AlertCircle, CheckCircle, Clock,
  RefreshCw, Copy, Download, Lightbulb, ChevronDown, ChevronUp,
  FileText, Calendar, Building2, DollarSign, TrendingUp,
  PenLine, Users, BarChart3, Plus, Printer, X, Receipt,
  Briefcase, ShieldCheck, Megaphone, Search,
} from 'lucide-react'
import { formatDistanceToNow, format, addDays, addMonths } from 'date-fns'
import { employees as employeesApi } from '../lib/api'
import type { Employee } from '../lib/api'
import { useTaskSocket } from '../lib/useTaskSocket'
import type { TaskPatch, EmployeePatch } from '../lib/useTaskSocket'

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

// ── Types ─────────────────────────────────────────────────────────────────────
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

interface InvoiceItem { description: string; qty: number; rate: number }
interface Invoice {
  number: string; date: string; dueDate: string; currency: string
  from: { name: string; address: string; email: string }
  to: { name: string; address: string; email: string }
  items: InvoiceItem[]
  notes: string
}

// ── Role Templates ────────────────────────────────────────────────────────────
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
  'Company Secretary': [
    'How do I register a Sdn Bhd in Malaysia? Give me the full step-by-step guide.',
    'Draft a board resolution to open a corporate bank account for [company name]',
    'What are the annual compliance deadlines for my Sdn Bhd this year?',
    'Prepare a directors\' resolution approving the appointment of [name] as a new director',
    'Explain the Beneficial Owner (BO) reporting requirements for a Malaysian Sdn Bhd',
    'Draft a Secretary Confirmation Letter for [company name]',
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
}
const GENERIC_TEMPLATES = [
  'Summarise the key information about [topic] in bullet points',
  'Write a professional email about [subject] to [recipient]',
  'Create a simple plan for [task or project]',
  'Research and list the best options for [decision I need to make]',
]
function getTemplates(role: string) { return ROLE_TEMPLATES[role] ?? GENERIC_TEMPLATES }

// ── Invoice helpers ───────────────────────────────────────────────────────────
function calcTotal(items: InvoiceItem[]) {
  return items.reduce((s, i) => s + i.qty * i.rate, 0)
}
function printInvoice(inv: Invoice) {
  const subtotal = calcTotal(inv.items)
  const taxRate = 0.06
  const tax = subtotal * taxRate
  const total = subtotal + tax
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Invoice ${inv.number}</title>
<style>
  body{font-family:Arial,sans-serif;color:#111;max-width:800px;margin:40px auto;padding:0 20px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px}
  .logo{font-size:24px;font-weight:900;color:#0d9488}
  h1{font-size:32px;color:#0d9488;margin:0}
  .meta{text-align:right;color:#555;font-size:13px;line-height:1.8}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-bottom:30px}
  .party h3{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:6px}
  .party p{margin:2px 0;font-size:13px}
  table{width:100%;border-collapse:collapse;margin-bottom:20px}
  th{text-align:left;padding:10px 12px;background:#f5f5f5;font-size:12px;text-transform:uppercase;letter-spacing:.5px}
  td{padding:10px 12px;border-bottom:1px solid #eee;font-size:13px}
  .totals{text-align:right;font-size:13px;line-height:2}
  .grand{font-size:18px;font-weight:bold;color:#0d9488}
  .notes{margin-top:30px;padding:16px;background:#f9f9f9;border-radius:8px;font-size:13px;color:#555}
  @media print{body{margin:0}}
</style></head><body>
<div class="header">
  <div><div class="logo">1nexio</div><p style="font-size:12px;color:#888;margin-top:4px">Powered by AI</p></div>
  <div><h1>INVOICE</h1>
    <div class="meta">
      <div><b>Invoice #:</b> ${inv.number}</div>
      <div><b>Date:</b> ${inv.date}</div>
      <div><b>Due:</b> ${inv.dueDate}</div>
    </div>
  </div>
</div>
<div class="parties">
  <div class="party"><h3>From</h3><p><b>${inv.from.name}</b></p><p>${inv.from.address.replace(/\n/g,'<br>')}</p><p>${inv.from.email}</p></div>
  <div class="party"><h3>Bill To</h3><p><b>${inv.to.name}</b></p><p>${inv.to.address.replace(/\n/g,'<br>')}</p><p>${inv.to.email}</p></div>
</div>
<table>
  <thead><tr><th>Description</th><th>Qty</th><th>Rate (${inv.currency})</th><th>Amount (${inv.currency})</th></tr></thead>
  <tbody>${inv.items.map(it=>`<tr><td>${it.description}</td><td>${it.qty}</td><td>${it.rate.toFixed(2)}</td><td>${(it.qty*it.rate).toFixed(2)}</td></tr>`).join('')}</tbody>
</table>
<div class="totals">
  <div>Subtotal: ${inv.currency} ${subtotal.toFixed(2)}</div>
  <div>SST (6%): ${inv.currency} ${tax.toFixed(2)}</div>
  <div class="grand">Total: ${inv.currency} ${total.toFixed(2)}</div>
</div>
${inv.notes ? `<div class="notes"><b>Notes:</b> ${inv.notes}</div>` : ''}
<p style="margin-top:40px;font-size:11px;color:#aaa;text-align:center">Generated by 1nexio AI • ${inv.from.name}</p>
</body></html>`
  const w = window.open('', '_blank')!
  w.document.write(html)
  w.document.close()
  setTimeout(() => w.print(), 500)
}

// ── Malaysian compliance calendar ─────────────────────────────────────────────
const today = new Date()
const COMPLIANCE_ITEMS = [
  { label: 'SSM Annual Return', date: addDays(today, 22), urgency: 'high', desc: 'File within 30 days of AGM' },
  { label: 'Corporate Tax (Form C)', date: addMonths(today, 2), urgency: 'medium', desc: '7 months after financial year end' },
  { label: 'PCB Monthly Submission', date: addDays(today, 13), urgency: 'high', desc: 'Submit before 15th of each month' },
  { label: 'SST Bi-monthly Filing', date: addDays(today, 35), urgency: 'low', desc: 'Every 2 months for SST-registered companies' },
  { label: 'Audit Report Submission', date: addMonths(today, 4), urgency: 'low', desc: 'Within 6 months of financial year end' },
  { label: 'EPF Contribution', date: addDays(today, 13), urgency: 'medium', desc: 'Monthly — before 15th' },
]
const URGENCY_COLORS: Record<string, string> = {
  high: 'text-red-400 bg-red-500/10 border-red-500/20',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
}

// ── Step meta ─────────────────────────────────────────────────────────────────
const STEP_META: Record<string, { icon: string; color: string }> = {
  init: { icon: '📋', color: 'text-slate-400' }, context: { icon: '🧠', color: 'text-purple-400' },
  thinking: { icon: '💭', color: 'text-blue-400' }, working: { icon: '⚡', color: 'text-amber-400' },
  parsing: { icon: '📊', color: 'text-cyan-400' }, proposal: { icon: '📬', color: 'text-orange-400' },
  done: { icon: '✅', color: 'text-emerald-400' }, error: { icon: '❌', color: 'text-red-400' },
}
const STATUS_ICON = {
  pending: <Clock size={13} className="text-slate-500" />,
  running: <Loader2 size={13} className="text-blue-400 animate-spin" />,
  completed: <CheckCircle size={13} className="text-emerald-400" />,
  failed: <AlertCircle size={13} className="text-red-400" />,
}

function downloadMarkdown(task: Task, employee: Employee) {
  const date = format(new Date(task.updated_at), 'PPP')
  const safeName = employee.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const content = [`# ${task.description}`, '', `**Employee:** ${employee.role_emoji} ${employee.name} (${employee.role})`, `**Date:** ${date}`, '', '---', '', task.result, '', '---', `*Generated by 1nexio — ${employee.name}*`].join('\n')
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `${safeName}-${format(new Date(task.updated_at), 'yyyy-MM-dd')}.md`; a.click()
  URL.revokeObjectURL(url)
}

// ── Live Work View ────────────────────────────────────────────────────────────
function LiveWorkView({ steps, status, employeeName }: { steps: WorkStep[]; status: Task['status']; employeeName: string }) {
  const isLive = status === 'pending' || status === 'running'
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [steps])
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#0a0a12', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
        <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500/50" /><span className="h-2.5 w-2.5 rounded-full bg-amber-500/50" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-500/50" /></div>
        <span className="flex-1 text-center text-xs text-slate-600 font-mono">{employeeName}'s workspace</span>
        {isLive && <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />LIVE</span>}
      </div>
      <div className="p-4 font-mono text-xs min-h-[80px] max-h-[160px] overflow-y-auto flex flex-col gap-2">
        {steps.length === 0 ? <div className="flex items-center gap-2 text-slate-600"><span className="h-1.5 w-1.5 rounded-full bg-slate-600 animate-pulse" />Initialising...</div>
          : steps.map((step, i) => { const meta = STEP_META[step.type] ?? STEP_META.init; const isLast = i === steps.length - 1; return (<div key={i} className={`flex items-start gap-2 transition-opacity ${isLast && isLive ? 'opacity-100' : 'opacity-70'}`}><span>{meta.icon}</span><span className={`${meta.color} leading-relaxed`}>{step.content}</span>{isLast && isLive && <span className="ml-1 inline-block h-3 w-0.5 bg-current animate-pulse" />}</div>) })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// ── Message ───────────────────────────────────────────────────────────────────
function Message({ task, employee, onCopied }: { task: Task; employee: Employee; onCopied: () => void }) {
  const [expanded, setExpanded] = useState(true)
  const isLong = task.result?.length > 600
  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-white" style={{ background: 'rgba(13,148,136,0.35)', border: '1px solid rgba(13,148,136,0.4)' }}>
          <p className="leading-relaxed whitespace-pre-wrap">{task.description}</p>
          <p className="mt-1 text-right text-xs opacity-50">{format(new Date(task.created_at), 'HH:mm')}</p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-lg" style={{ background: 'rgba(255,255,255,0.06)' }}>{employee.role_emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">{employee.name}</span>
            <span>{STATUS_ICON[task.status]}</span>
            {task.status === 'running' && <span className="text-xs text-blue-400">Working...</span>}
            {task.status === 'pending' && <span className="text-xs text-slate-500">Queued</span>}
          </div>
          {(task.status === 'pending' || task.status === 'running') && <LiveWorkView steps={task.steps ?? []} status={task.status} employeeName={employee.name} />}
          {task.status === 'failed' && <div className="rounded-xl px-4 py-3 text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>{task.error || 'An error occurred.'}</div>}
          {task.status === 'completed' && task.result && (
            <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className={`prose prose-invert prose-sm max-w-none text-slate-200 ${!expanded && isLong ? 'line-clamp-6' : ''}`}>
                <ReactMarkdown>{(task.result || '').replace(/\\n/g, '\n')}</ReactMarkdown>
              </div>
              {isLong && <button onClick={() => setExpanded(!expanded)} className="mt-2 flex items-center gap-1 text-xs text-accent-light hover:underline">{expanded ? <><ChevronUp size={12} />Show less</> : <><ChevronDown size={12} />Show more</>}</button>}
              <div className="mt-3 flex items-center justify-between border-t pt-2.5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <p className="text-xs text-slate-600">{formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}</p>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => { navigator.clipboard.writeText(task.result); onCopied() }} className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-slate-400 hover:bg-white/5 hover:text-slate-200"><Copy size={12} />Copy</button>
                  <button onClick={() => downloadMarkdown(task, employee)} className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-slate-400 hover:bg-white/5 hover:text-slate-200"><Download size={12} />Download</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Quick action button ───────────────────────────────────────────────────────
function QuickBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 w-full rounded-xl px-3 py-2.5 text-left text-sm text-slate-300 transition-all hover:text-white"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(13,148,136,0.4)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}>
      <span className="text-accent shrink-0">{icon}</span>
      <span className="text-xs leading-snug">{label}</span>
    </button>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// DEPARTMENT PANELS
// ══════════════════════════════════════════════════════════════════════════════

// ── Company Secretary Panel ───────────────────────────────────────────────────
function SecSection({ title, icon, children, defaultOpen = false }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-white/5 transition-colors">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">{icon}{title}</span>
        {open ? <ChevronUp size={12} className="text-slate-500" /> : <ChevronDown size={12} className="text-slate-500" />}
      </button>
      {open && <div className="px-3 pb-3 flex flex-col gap-1.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}><div className="pt-2 flex flex-col gap-1.5">{children}</div></div>}
    </div>
  )
}

function SecretaryPanel({ onTask }: { onTask: (msg: string) => void }) {
  return (
    <div className="flex flex-col gap-2">

      {/* 1. Company Incorporation */}
      <SecSection title="Company Incorporation" icon={<Building2 size={11} />} defaultOpen>
        <QuickBtn icon={<FileText size={13} />} label="Full Sdn Bhd registration guide" onClick={() => onTask('Give me a complete A-to-Z guide to registering a Sdn Bhd in Malaysia through SSM — company name search, required documents, government fees, timeline, and what happens after incorporation.')} />
        <QuickBtn icon={<FileText size={13} />} label="Company name search — is my name available?" onClick={() => onTask('Explain how to do a company name search on SSM MyData or e-Lodgement, the naming rules for Sdn Bhd, what names are rejected, and how to reserve an approved name.')} />
        <QuickBtn icon={<FileText size={13} />} label="Certificate of Incorporation (Section 17) explained" onClick={() => onTask('Explain what the SSM Certificate of Incorporation (Section 17) is, what information it contains, and how to use it for bank account opening and legal purposes in Malaysia.')} />
        <QuickBtn icon={<FileText size={13} />} label="First Board of Directors' Resolution" onClick={() => onTask('Draft the First Board of Directors\' Resolution for a newly incorporated Malaysian Sdn Bhd. Include resolutions for company seal, bank account authorisation, and appointment of officers.')} />
        <QuickBtn icon={<ShieldCheck size={13} />} label="Registered address & next of kin requirements" onClick={() => onTask('Explain the registered office address requirements for a Malaysian Sdn Bhd and when a single-director company needs to appoint a Next of Kin under the Companies Act 2016.')} />
        <QuickBtn icon={<FileText size={13} />} label="What is a company constitution (M&A)?" onClick={() => onTask('Explain the difference between a customised company constitution and the standard Companies Act 2016 default rules for a Sdn Bhd. When should a startup draft a custom constitution and what key clauses should it include?')} />
      </SecSection>

      {/* 2. Board Resolutions */}
      <SecSection title="Board Resolutions" icon={<FileText size={11} />}>
        <QuickBtn icon={<FileText size={13} />} label="Open corporate bank account" onClick={() => onTask('Draft a directors\' board resolution for a Malaysian Sdn Bhd to open a corporate bank account. Include authorised signatories clause and proper Companies Act 2016 format.')} />
        <QuickBtn icon={<FileText size={13} />} label="Accept banking / loan facility" onClick={() => onTask('Draft a directors\' board resolution for a Malaysian Sdn Bhd to accept a banking facility or loan from a financial institution. Include terms acceptance and authorised signatories.')} />
        <QuickBtn icon={<Users size={13} />} label="Appoint new director" onClick={() => onTask('Draft a directors\' resolution to appoint a new director for a Malaysian Sdn Bhd under the Companies Act 2016. Include the statutory consent statement and effective date.')} />
        <QuickBtn icon={<Users size={13} />} label="Resign / remove director" onClick={() => onTask('Draft a board resolution to formalise the resignation or removal of a director from a Malaysian Sdn Bhd. Include SSM Form 49 filing obligations and effective date.')} />
        <QuickBtn icon={<ShieldCheck size={13} />} label="Appoint / change auditor" onClick={() => onTask('Draft a resolution to appoint or change the company auditor for a Malaysian Sdn Bhd. Include the MIA-registered auditor appointment wording under the Companies Act 2016.')} />
        <QuickBtn icon={<ShieldCheck size={13} />} label="Appoint / change tax agent" onClick={() => onTask('Draft a resolution to appoint or change the company tax agent for a Malaysian Sdn Bhd. Include LHDN authorisation wording.')} />
        <QuickBtn icon={<Calendar size={13} />} label="Change financial year-end" onClick={() => onTask('Draft a resolution to change the financial year-end of a Malaysian Sdn Bhd. Explain the SSM notification requirement and any impact on audit and tax deadlines.')} />
        <QuickBtn icon={<Building2 size={13} />} label="Change business address" onClick={() => onTask('Draft a resolution to change the registered or principal business address of a Malaysian Sdn Bhd. Include SSM Form 44 / MyCoID update steps.')} />
        <QuickBtn icon={<FileText size={13} />} label="Change business nature (MSIC code)" onClick={() => onTask('Draft a resolution to change the principal business activity of a Malaysian Sdn Bhd and explain how to update the MSIC code in SSM records.')} />
      </SecSection>

      {/* 3. Annual Compliance */}
      <SecSection title="Annual Compliance" icon={<ShieldCheck size={11} />}>
        <QuickBtn icon={<ShieldCheck size={13} />} label="Annual Return (AR) — full guide" onClick={() => onTask('Explain the Annual Return requirements for a Malaysian Sdn Bhd — what information is required, the filing deadline (30 days after AGM), how to file via e-Lodgement, and penalties for late submission.')} />
        <QuickBtn icon={<FileText size={13} />} label="Audited Financial Statements (AFS) guide" onClick={() => onTask('Explain when a Malaysian Sdn Bhd must submit Audited Financial Statements to SSM, the timeline, how to file via MBRS, and the exemptions for dormant or small companies.')} />
        <QuickBtn icon={<FileText size={13} />} label="Unaudited Financial Statements (UFS) — am I eligible?" onClick={() => onTask('Explain the criteria for a Malaysian Sdn Bhd to qualify for submitting Unaudited Financial Statements (UFS) instead of audited accounts under the Companies Act 2016.')} />
        <QuickBtn icon={<ShieldCheck size={13} />} label="Beneficial Owner (BO) reporting explained" onClick={() => onTask('Explain the Beneficial Owner (BO) reporting requirements for Malaysian companies under the Companies Act 2016 — who qualifies as a BO, the SSM register obligations, and penalties for non-compliance.')} />
        <QuickBtn icon={<FileText size={13} />} label="MBRS filing — what is it and how to file?" onClick={() => onTask('Explain what the Malaysian Business Reporting System (MBRS) is, how to prepare and submit XBRL financial statements via MBRS for a Sdn Bhd, and the key deadlines.')} />
        <QuickBtn icon={<Calendar size={13} />} label="What are my compliance deadlines this year?" onClick={() => onTask('List all the key statutory compliance deadlines for a Malaysian Sdn Bhd for the next 12 months — including Annual Return, financial statements, tax, SST, EPF, PCB, and BO reporting. Format as a compliance calendar table.')} />
      </SecSection>

      {/* 4. Corporate Exercises */}
      <SecSection title="Corporate Exercises (Ad-Hoc)" icon={<TrendingUp size={11} />}>
        <QuickBtn icon={<Users size={13} />} label="Share transfer between shareholders" onClick={() => onTask('Draft a share transfer board resolution and explain the full process for transferring shares between shareholders in a Malaysian Sdn Bhd — including SSM Form 32A, stamp duty, and timeline.')} />
        <QuickBtn icon={<DollarSign size={13} />} label="Increase share capital" onClick={() => onTask('Explain how to increase the paid-up share capital of a Malaysian Sdn Bhd — draft the necessary board and members\' resolutions, explain SSM Form 24/HOA, and the stamp duty calculation.')} />
        <QuickBtn icon={<DollarSign size={13} />} label="Declare dividends" onClick={() => onTask('Draft a dividend declaration resolution for a Malaysian Sdn Bhd. Explain the SSM and LHDN compliance requirements, solvency statement, and how dividends are treated for tax purposes.')} />
        <QuickBtn icon={<FileText size={13} />} label="Allot preference shares" onClick={() => onTask('Explain the process to allot preference shares in a Malaysian Sdn Bhd — draft the resolution, explain the differences from ordinary shares, and list the SSM filing requirements.')} />
        <QuickBtn icon={<Building2 size={13} />} label="Purchase / dispose company property" onClick={() => onTask('Draft a board resolution authorising the purchase, transfer, or disposal of commercial property by a Malaysian Sdn Bhd. Include the required approvals and stamp duty considerations.')} />
        <QuickBtn icon={<Building2 size={13} />} label="Company name change" onClick={() => onTask('Explain the complete process to change a company name in Malaysia — SSM application, required documents, fee, timeline, and how to update all official records and bank accounts after approval.')} />
        <QuickBtn icon={<FileText size={13} />} label="Adopt / amend company constitution" onClick={() => onTask('Explain how a Malaysian Sdn Bhd can abolish its existing constitution and adopt the standard Companies Act 2016 rules, or how to draft and adopt a customised constitution. Include the special resolution and SSM filing steps.')} />
      </SecSection>

      {/* 5. Documents & Letters */}
      <SecSection title="Documents & Letters" icon={<FileText size={11} />}>
        <QuickBtn icon={<FileText size={13} />} label="Secretary confirmation letter" onClick={() => onTask('Draft a Company Secretary Confirmation Letter for a Malaysian Sdn Bhd confirming the company\'s current directors, shareholders, and registered address. Use formal letterhead format.')} />
        <QuickBtn icon={<FileText size={13} />} label="CTC certified true copy — what is it?" onClick={() => onTask('Explain what a Certified True Copy (CTC) is in Malaysian company law, what documents are typically CTC-certified (SSM forms, ICs, passports), who can certify them, and when banks or third parties require them.')} />
        <QuickBtn icon={<FileText size={13} />} label="Draft a professional NDA" onClick={() => onTask('Draft a comprehensive NDA (Non-Disclosure Agreement) between two Malaysian companies for a business collaboration. Include mutual confidentiality, definition of confidential information, exclusions, 2-year term, and governing law (Malaysia).')} />
        <QuickBtn icon={<FileText size={13} />} label="Letter of authorisation template" onClick={() => onTask('Draft a formal Letter of Authorisation for a Malaysian company authorising a named person to act on behalf of the company for [banking/government/legal] matters. Include company stamp and director signature lines.')} />
        <QuickBtn icon={<ShieldCheck size={13} />} label="Statutory declaration (SD) explained" onClick={() => onTask('Explain what a Statutory Declaration (SD) is in Malaysia, when a company director must sign one, how to get it commissioned by a Commissioner for Oaths, and what it is used for.')} />
      </SecSection>

      {/* 6. Compliance Calendar */}
      <SecSection title="Compliance Deadlines" icon={<Calendar size={11} />} defaultOpen>
        <div className="flex flex-col gap-1.5">
          {COMPLIANCE_ITEMS.map((item) => (
            <button key={item.label} onClick={() => onTask(`Explain the "${item.label}" compliance requirement for a Malaysian Sdn Bhd in detail — what it involves, the exact deadline, how to file, and what happens if it's missed.`)}
              className={`rounded-xl px-3 py-2.5 border text-left w-full hover:opacity-90 transition-opacity ${URGENCY_COLORS[item.urgency]}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{item.label}</span>
                <span className="text-[10px] opacity-70">{format(item.date, 'dd MMM')}</span>
              </div>
              <p className="mt-0.5 text-[10px] opacity-60">{item.desc}</p>
            </button>
          ))}
        </div>
      </SecSection>

      {/* 7. Learn */}
      <SecSection title="Learn — Malaysian Company Law" icon={<Lightbulb size={11} />}>
        <QuickBtn icon={<Lightbulb size={13} />} label="Companies Act 2016 — key changes explained" onClick={() => onTask('Summarise the key changes introduced by the Malaysian Companies Act 2016 compared to the old Companies Act 1965, and what they mean for Sdn Bhd founders today.')} />
        <QuickBtn icon={<Lightbulb size={13} />} label="What is a company secretary's legal role?" onClick={() => onTask('Explain the legal role and duties of a Company Secretary under the Malaysian Companies Act 2016 — what they must do, their liability, and why every Sdn Bhd must appoint one within 30 days of incorporation.')} />
        <QuickBtn icon={<Lightbulb size={13} />} label="Digital signature & e-KYC for directors" onClick={() => onTask('Explain how Malaysian Sdn Bhd directors can use digital signatures and e-KYC (Know Your Customer) to authorise company documents online — what platforms are legally accepted and how it works.')} />
        <QuickBtn icon={<Lightbulb size={13} />} label="SSM vs LHDN vs EPF — who does what?" onClick={() => onTask('Explain the role of SSM, LHDN (Inland Revenue Board), and EPF/SOCSO for a Malaysian Sdn Bhd — what each agency regulates, the key forms each requires, and the main deadlines for each.')} />
        <QuickBtn icon={<Lightbulb size={13} />} label="Dormant company — obligations & options" onClick={() => onTask('Explain what "dormant company" status means for a Malaysian Sdn Bhd, what compliance obligations still apply, how to officially declare a company dormant with SSM, and whether it\'s better to keep it dormant or wind it up.')} />
        <QuickBtn icon={<Lightbulb size={13} />} label="Winding up a company — full guide" onClick={() => onTask('Explain the process to voluntarily wind up (strike off) a Malaysian Sdn Bhd — the requirements, SSM Form 308 application, timeline, cost, and what to do with company assets and liabilities before closing.')} />
      </SecSection>

    </div>
  )
}

// ── Finance Panel ─────────────────────────────────────────────────────────────
function FinancePanel({ onTask }: { onTask: (msg: string) => void }) {
  const emptyInv: Invoice = {
    number: `INV-${format(today, 'yyyyMMdd')}-001`, date: format(today, 'yyyy-MM-dd'),
    dueDate: format(addDays(today, 30), 'yyyy-MM-dd'), currency: 'MYR',
    from: { name: '', address: '', email: '' }, to: { name: '', address: '', email: '' },
    items: [{ description: '', qty: 1, rate: 0 }], notes: '',
  }
  const [inv, setInv] = useState<Invoice>(emptyInv)
  const [showForm, setShowForm] = useState(false)

  function updateItem(i: number, field: keyof InvoiceItem, val: string | number) {
    const items = [...inv.items]; (items[i] as any)[field] = val; setInv({ ...inv, items })
  }
  function addItem() { setInv({ ...inv, items: [...inv.items, { description: '', qty: 1, rate: 0 }] }) }
  function removeItem(i: number) { setInv({ ...inv, items: inv.items.filter((_, j) => j !== i) }) }

  const subtotal = calcTotal(inv.items)
  const total = subtotal * 1.06

  return (
    <div className="flex flex-col gap-4">
      {/* Invoice Builder toggle */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><Receipt size={11} />Invoice Builder</p>
          <button onClick={() => setShowForm(!showForm)} className="text-[11px] text-accent hover:text-accent-light flex items-center gap-1">
            {showForm ? <><X size={11} />Close</> : <><Plus size={11} />New Invoice</>}
          </button>
        </div>

        {showForm && (
          <div className="rounded-xl p-3 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {/* Invoice meta */}
            <div className="grid grid-cols-2 gap-2">
              {[['Invoice #', 'number'], ['Date', 'date'], ['Due Date', 'dueDate'], ['Currency', 'currency']].map(([label, key]) => (
                <div key={key}>
                  <label className="text-[10px] text-slate-500">{label}</label>
                  <input value={(inv as any)[key]} onChange={e => setInv({ ...inv, [key]: e.target.value })}
                    className="w-full mt-0.5 rounded-lg px-2 py-1.5 text-xs text-slate-200 bg-white/5 border border-white/8 outline-none focus:border-accent/50" />
                </div>
              ))}
            </div>
            {/* From / To */}
            {(['from', 'to'] as const).map(side => (
              <div key={side}>
                <p className="text-[10px] font-medium text-slate-500 mb-1">{side === 'from' ? 'From (Your Company)' : 'Bill To (Client)'}</p>
                <div className="flex flex-col gap-1.5">
                  {(['name', 'address', 'email'] as const).map(f => (
                    <input key={f} placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                      value={inv[side][f]} onChange={e => setInv({ ...inv, [side]: { ...inv[side], [f]: e.target.value } })}
                      className="w-full rounded-lg px-2 py-1.5 text-xs text-slate-200 bg-white/5 border border-white/8 outline-none focus:border-accent/50" />
                  ))}
                </div>
              </div>
            ))}
            {/* Items */}
            <div>
              <p className="text-[10px] font-medium text-slate-500 mb-1">Items</p>
              {inv.items.map((item, i) => (
                <div key={i} className="flex gap-1.5 mb-1.5 items-center">
                  <input placeholder="Description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)}
                    className="flex-1 rounded-lg px-2 py-1.5 text-xs text-slate-200 bg-white/5 border border-white/8 outline-none focus:border-accent/50" />
                  <input type="number" placeholder="Qty" value={item.qty} onChange={e => updateItem(i, 'qty', Number(e.target.value))}
                    className="w-12 rounded-lg px-2 py-1.5 text-xs text-slate-200 bg-white/5 border border-white/8 outline-none focus:border-accent/50" />
                  <input type="number" placeholder="Rate" value={item.rate} onChange={e => updateItem(i, 'rate', Number(e.target.value))}
                    className="w-20 rounded-lg px-2 py-1.5 text-xs text-slate-200 bg-white/5 border border-white/8 outline-none focus:border-accent/50" />
                  <button onClick={() => removeItem(i)} className="text-slate-600 hover:text-red-400"><X size={12} /></button>
                </div>
              ))}
              <button onClick={addItem} className="text-xs text-accent hover:text-accent-light flex items-center gap-1 mt-1"><Plus size={11} />Add item</button>
            </div>
            {/* Notes */}
            <textarea placeholder="Notes (optional)" value={inv.notes} onChange={e => setInv({ ...inv, notes: e.target.value })}
              className="w-full rounded-lg px-2 py-1.5 text-xs text-slate-200 bg-white/5 border border-white/8 outline-none focus:border-accent/50 resize-none" rows={2} />
            {/* Total + Print */}
            <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="text-xs text-slate-400">
                <span className="text-slate-500">Subtotal: </span>{inv.currency} {subtotal.toFixed(2)}<br />
                <span className="font-semibold text-white">Total (6% SST): {inv.currency} {total.toFixed(2)}</span>
              </div>
              <button onClick={() => printInvoice(inv)} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-light transition-all">
                <Printer size={12} />Print / PDF
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Finance tasks */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><DollarSign size={11} />AI Finance Tasks</p>
        <div className="flex flex-col gap-1.5">
          <QuickBtn icon={<BarChart3 size={13} />} label="Create monthly P&L template" onClick={() => onTask('Create a simple monthly Profit & Loss (P&L) template for a Malaysian SaaS business. Include all key revenue lines and operating costs.')} />
          <QuickBtn icon={<TrendingUp size={13} />} label="Analyse my revenue data" onClick={() => onTask('Analyse this revenue data and identify trends, growth rate, and anomalies: [paste your revenue figures here]')} />
          <QuickBtn icon={<DollarSign size={13} />} label="Build a pricing model" onClick={() => onTask('Build a simple pricing model for [your product/service] — consider costs, target margins, and competitor pricing. Show the calculation.')} />
          <QuickBtn icon={<Receipt size={13} />} label="Write financial summary report" onClick={() => onTask('Write a concise financial summary report based on these figures: [paste your monthly revenue, costs, and profit numbers]')} />
          <QuickBtn icon={<Calendar size={13} />} label="Payment reminder email to client" onClick={() => onTask('Write a professional but firm payment reminder email to a client whose invoice is 14 days overdue.')} />
        </div>
      </div>
    </div>
  )
}

// ── Market Researcher Panel ───────────────────────────────────────────────────
function MarketPanel({ onTask }: { onTask: (msg: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><Search size={11} />Research Tasks</p>
        <div className="flex flex-col gap-1.5">
          <QuickBtn icon={<TrendingUp size={13} />} label="Competitor analysis" onClick={() => onTask('Research the top 5 competitors of [your product] and summarise their pricing, features, key strengths, and weaknesses in a comparison table.')} />
          <QuickBtn icon={<BarChart3 size={13} />} label="Market size & TAM estimate" onClick={() => onTask('Estimate the total addressable market (TAM) and serviceable market (SAM) for [your product/industry]. Include sources and methodology.')} />
          <QuickBtn icon={<Users size={13} />} label="Ideal customer profile (ICP)" onClick={() => onTask('Define the ideal customer profile (ICP) for [your product]. Include demographics, job titles, pain points, buying triggers, and where to find them.')} />
          <QuickBtn icon={<TrendingUp size={13} />} label="Industry trends report" onClick={() => onTask('Identify the 5 biggest trends in [your industry] right now and explain what they mean for a startup entering this space.')} />
          <QuickBtn icon={<Search size={13} />} label="Potential B2B customer list" onClick={() => onTask('Find 10 potential B2B customers for [your product] — include company name, size, industry, and why they\'d be a good fit.')} />
          <QuickBtn icon={<FileText size={13} />} label="SWOT analysis" onClick={() => onTask('Write a detailed SWOT analysis for [your product/business] based on the current market. Be specific and actionable for each quadrant.')} />
        </div>
      </div>
    </div>
  )
}

// ── Content Writer Panel ──────────────────────────────────────────────────────
function ContentPanel({ onTask }: { onTask: (msg: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><PenLine size={11} />Content Tasks</p>
        <div className="flex flex-col gap-1.5">
          <QuickBtn icon={<FileText size={13} />} label="Blog post (600 words)" onClick={() => onTask('Write a well-structured 600-word blog post about [topic] for [target audience]. Include a compelling headline, intro, 3 main sections, and a CTA.')} />
          <QuickBtn icon={<Megaphone size={13} />} label="Social media — 7-day calendar" onClick={() => onTask('Create a 7-day social media content calendar for [your product] on LinkedIn and Instagram. Include post copy, hashtags, and content type for each day.')} />
          <QuickBtn icon={<Send size={13} />} label="Email newsletter" onClick={() => onTask('Write an engaging email newsletter for [your company] this week. Topic: [topic]. Keep it under 300 words with a clear CTA.')} />
          <QuickBtn icon={<FileText size={13} />} label="Landing page copy" onClick={() => onTask('Write full landing page copy for [your product] — headline, subheadline, features section (3 features), social proof section, and CTA. Make it conversion-focused.')} />
          <QuickBtn icon={<Megaphone size={13} />} label="LinkedIn post (viral style)" onClick={() => onTask('Write a LinkedIn post in viral storytelling format about [topic/milestone/lesson]. Hook in first line, story in middle, takeaway at end. Under 200 words.')} />
          <QuickBtn icon={<PenLine size={13} />} label="Product descriptions (3 variations)" onClick={() => onTask('Write 3 product description variations for [your product] — one professional, one casual/fun, one ultra-short (under 30 words).')} />
        </div>
      </div>
    </div>
  )
}

// ── Sales Panel ───────────────────────────────────────────────────────────────
function SalesPanel({ onTask }: { onTask: (msg: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><Briefcase size={11} />Sales Tasks</p>
        <div className="flex flex-col gap-1.5">
          <QuickBtn icon={<Send size={13} />} label="Cold email (under 150 words)" onClick={() => onTask('Write a cold email introducing [your product] to [target customer type]. Under 150 words. Personalised, clear value prop, and a specific CTA.')} />
          <QuickBtn icon={<Send size={13} />} label="3-step follow-up sequence" onClick={() => onTask('Write a 3-step email follow-up sequence for leads who haven\'t replied in 7 days. Day 7, Day 14, Day 21. Each email under 100 words. Vary the approach each time.')} />
          <QuickBtn icon={<Users size={13} />} label="LinkedIn outreach message" onClick={() => onTask('Write a LinkedIn connection request + follow-up message for a [target job title] at a [company type]. Keep it short, not salesy.')} />
          <QuickBtn icon={<Briefcase size={13} />} label="Sales pitch deck outline" onClick={() => onTask('Create a 10-slide sales pitch deck outline for [your product] targeting [customer type]. Include slide title and 3 bullet points per slide.')} />
          <QuickBtn icon={<FileText size={13} />} label="Objection handling responses" onClick={() => onTask('Write 5 professional responses to the most common objections for [product type]: too expensive, not the right time, already have a solution, need to think about it, need to ask my boss.')} />
          <QuickBtn icon={<DollarSign size={13} />} label="Proposal template" onClick={() => onTask('Write a professional business proposal template for a [service/product] engagement. Include executive summary, scope, deliverables, timeline, pricing, and next steps.')} />
        </div>
      </div>
    </div>
  )
}

// ── Generic Panel ─────────────────────────────────────────────────────────────
function GenericPanel({ employee, onTask }: { employee: Employee; onTask: (msg: string) => void }) {
  const templates = getTemplates(employee.role)
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><Lightbulb size={11} />Suggested Tasks</p>
        <div className="flex flex-col gap-1.5">
          {templates.map(tpl => <QuickBtn key={tpl} icon={<FileText size={13} />} label={tpl} onClick={() => onTask(tpl)} />)}
        </div>
      </div>
    </div>
  )
}

// ── Panel router ──────────────────────────────────────────────────────────────
function DepartmentPanel({ employee, onTask }: { employee: Employee; onTask: (msg: string) => void }) {
  const role = employee.role.toLowerCase()
  if (role.includes('secretary')) return <SecretaryPanel onTask={onTask} />
  if (role.includes('finance') || role.includes('financial') || role.includes('account') || role.includes('cfo')) return <FinancePanel onTask={onTask} />
  if (role.includes('market resear')) return <MarketPanel onTask={onTask} />
  if (role.includes('content') || role.includes('writer')) return <ContentPanel onTask={onTask} />
  if (role.includes('sales') || role.includes('representative')) return <SalesPanel onTask={onTask} />
  return <GenericPanel employee={employee} onTask={onTask} />
}

// ── Role icon for panel header ────────────────────────────────────────────────
function roleIcon(role: string) {
  const r = role.toLowerCase()
  if (r.includes('secretary')) return <Building2 size={14} />
  if (r.includes('finance') || r.includes('financial') || r.includes('cfo') || r.includes('account')) return <DollarSign size={14} />
  if (r.includes('market resear')) return <Search size={14} />
  if (r.includes('content') || r.includes('writer')) return <PenLine size={14} />
  if (r.includes('sales')) return <Briefcase size={14} />
  if (r.includes('data') || r.includes('analyst')) return <BarChart3 size={14} />
  if (r.includes('marketing') || r.includes('manager')) return <Megaphone size={14} />
  return <Users size={14} />
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
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

  const loadTasks = useCallback(async () => {
    const data = await api<Task[]>(`/employees/${eid}/tasks?company_id=${cid}`)
    setTasks(data); return data
  }, [cid, eid])

  useEffect(() => {
    async function init() {
      try {
        const emps = await employeesApi.list(cid)
        setEmployee(emps.find(e => e.id === eid) ?? null)
        await loadTasks()
      } finally { setLoading(false) }
    }
    init()
  }, [cid, eid, loadTasks])

  // WebSocket — real-time task + employee updates
  const hasActiveTask = tasks.some(t => t.status === 'pending' || t.status === 'running')
  useTaskSocket(cid, !loading, {
    onTaskUpdate: useCallback((patch: TaskPatch) => {
      if (patch.employee_id !== eid) return
      setTasks(prev => prev.map(t => t.id === patch.id ? { ...t, ...patch } : t))
    }, [eid]),
    onEmployeeUpdate: useCallback((patch: EmployeePatch) => {
      if (patch.id !== eid) return
      setEmployee(prev => prev ? { ...prev, ...patch } : prev)
    }, [eid]),
  })
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [tasks])

  async function send(msg?: string) {
    const message = (msg ?? input).trim()
    if (!message || sending) return
    setSending(true); setShowTemplates(false)
    try {
      await api(`/employees/${eid}/chat?company_id=${cid}`, { method: 'POST', body: JSON.stringify({ message }) })
      setInput('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      await loadTasks()
    } catch (e: any) { alert(e.message) }
    finally { setSending(false) }
  }

  function handleKey(e: React.KeyboardEvent) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const ta = e.target; ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }
  function handleCopied() { setCopyToast(true); setTimeout(() => setCopyToast(false), 2000) }

  const isWorking = employee?.status === 'working' || tasks.some(t => t.status === 'pending' || t.status === 'running')
  const templates = employee ? getTemplates(employee.role) : GENERIC_TEMPLATES

  if (loading) return <div className="flex h-screen items-center justify-center bg-surface"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
  if (!employee) return <div className="flex h-screen items-center justify-center bg-surface text-slate-400">Employee not found.</div>

  return (
    <div className="flex h-screen flex-col bg-surface">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-4 border-b px-6 py-3.5 shrink-0"
              style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#080810' }}>
        <button onClick={() => navigate(`/c/${cid}/employees`)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors">
          <ArrowLeft size={16} />Back
        </button>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl text-xl" style={{ background: 'rgba(13,148,136,0.12)' }}>
            {employee.role_emoji}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{employee.name}</p>
            <p className="text-xs text-slate-500">{employee.role} Department</p>
          </div>
          <div className={`ml-2 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${isWorking ? 'bg-blue-500/15 text-blue-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isWorking ? 'bg-blue-400 animate-pulse' : 'bg-emerald-400'}`} />
            {isWorking ? 'Working...' : 'Ready'}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-600">{tasks.length} tasks completed</span>
          <button onClick={loadTasks} className="text-slate-500 hover:text-slate-300 transition-colors"><RefreshCw size={15} /></button>
        </div>
      </header>

      {/* ── Body: two-column layout ─────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT — Department Tools */}
        <aside className="w-72 shrink-0 overflow-y-auto border-r p-4 hidden lg:block"
               style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(8,8,16,0.8)' }}>
          {/* Panel header */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-accent">{roleIcon(employee.role)}</span>
            <span className="text-sm font-semibold text-slate-200">{employee.role}</span>
          </div>
          <DepartmentPanel employee={employee} onTask={(msg) => { send(msg) }} />
        </aside>

        {/* RIGHT — Chat */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto flex max-w-3xl flex-col gap-6">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center gap-5 py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-4xl" style={{ background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.15)' }}>
                    {employee.role_emoji}
                  </div>
                  <div>
                    <p className="text-base font-medium text-slate-200">Start a conversation with {employee.name}</p>
                    <p className="mt-1 text-sm text-slate-500">Or use the department tools on the left to get started quickly.</p>
                  </div>
                  {/* Mobile template chips */}
                  <div className="w-full max-w-xl lg:hidden">
                    <p className="mb-3 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500"><Lightbulb size={12} className="text-amber-400" />Try one of these</p>
                    <div className="flex flex-col gap-2">
                      {templates.slice(0, 4).map(tpl => (
                        <button key={tpl} onClick={() => send(tpl)} className="rounded-xl px-4 py-3 text-left text-sm text-slate-300 hover:text-white transition-all"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(13,148,136,0.35)')}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}>
                          {tpl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                tasks.map(task => <Message key={task.id} task={task} employee={employee} onCopied={handleCopied} />)
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Template panel */}
          {showTemplates && tasks.length > 0 && (
            <div className="shrink-0 border-t px-6 pt-3 pb-1" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(8,8,16,0.95)' }}>
              <div className="mx-auto max-w-3xl">
                <p className="mb-2 text-xs text-slate-600">Suggested tasks for {employee.name}</p>
                <div className="flex flex-col gap-1.5 pb-2">
                  {templates.map(tpl => (
                    <button key={tpl} onClick={() => { setInput(tpl); setShowTemplates(false); textareaRef.current?.focus() }}
                      className="rounded-lg px-3 py-2 text-left text-xs text-slate-400 hover:bg-white/5 hover:text-slate-200">{tpl}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Input bar */}
          <div className="shrink-0 border-t px-6 py-4" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(8,8,16,0.8)', backdropFilter: 'blur(8px)' }}>
            <div className="mx-auto max-w-3xl">
              <div className="flex items-end gap-3 rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <button onClick={() => setShowTemplates(!showTemplates)} title="Show task suggestions"
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all ${showTemplates ? 'bg-amber-500/20 text-amber-400' : 'text-slate-600 hover:text-slate-400 hover:bg-white/5'}`}>
                  <Lightbulb size={15} />
                </button>
                <textarea ref={textareaRef}
                  className="flex-1 resize-none bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
                  style={{ minHeight: '24px', maxHeight: '160px' }}
                  placeholder={isWorking ? `${employee.name} is working, please wait...` : `Message ${employee.name}...`}
                  value={input} onChange={handleInput} onKeyDown={handleKey}
                  disabled={isWorking || sending} rows={1} />
                <button onClick={() => send()} disabled={!input.trim() || isWorking || sending}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition-all hover:bg-accent-light disabled:opacity-30 disabled:cursor-not-allowed active:scale-95">
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
              <p className="mt-2 text-center text-xs text-slate-600">
                {employee.name} uses <span className="text-slate-500">{(employee.config as any)?.model ?? 'claude-sonnet-4-6'}</span>
              </p>
            </div>
          </div>
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
