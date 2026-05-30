import { useState, useEffect, useRef } from 'react'
import { runComputerUseTask } from './computerUse'

const API = (import.meta as any).env?.VITE_API_URL ?? 'https://ai-company-platform.onrender.com'

function getToken() { return localStorage.getItem('token') ?? '' }
function setToken(t: string) { localStorage.setItem('token', t) }

// ── Types ─────────────────────────────────────────────────────────────────────
interface Employee {
  id: number
  name: string
  role: string
  role_emoji: string
  status: string
  current_task: string
}

interface Step {
  type: string
  content: string
  ts: string
}

// ── Step icons ────────────────────────────────────────────────────────────────
const STEP_ICON: Record<string, string> = {
  init: '📋', thinking: '💭', working: '⚡', done: '✅', error: '❌', default: '▸',
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  padding: '10px 14px',
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'system-ui',
  width: '100%',
  boxSizing: 'border-box',
}

const btnStyle: React.CSSProperties = {
  background: '#0d9488',
  border: 'none',
  borderRadius: 10,
  padding: '10px 22px',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'system-ui',
}

// ── Login ─────────────────────────────────────────────────────────────────────
function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [pass, setPass]   = useState('')
  const [err, setErr]     = useState('')
  const [busy, setBusy]   = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      })
      if (!res.ok) { const d = await res.json(); setErr(d.detail ?? 'Login failed'); return }
      const data = await res.json()
      setToken(data.access_token)
      onLogin()
    } catch { setErr('Network error') }
    finally { setBusy(false) }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'#080810', color:'#fff', fontFamily:'system-ui' }}>
      <div style={{ fontSize:32, fontWeight:900, marginBottom:8 }}>1nexio</div>
      <div style={{ fontSize:13, color:'#666', marginBottom:40 }}>Your AI Workforce — Desktop</div>
      <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:12, width:320 }}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} required />
        <input type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} style={inputStyle} required />
        {err && <div style={{ color:'#f87171', fontSize:12 }}>{err}</div>}
        <button type="submit" disabled={busy} style={{ ...btnStyle, opacity: busy ? 0.5 : 1 }}>
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

// ── Task runner ───────────────────────────────────────────────────────────────
function TaskRunner({ employee, companyId, onBack }: { employee: Employee; companyId: number; onBack: () => void }) {
  const [task, setTask]       = useState('')
  const [steps, setSteps]     = useState<Step[]>([])
  const [running, setRunning] = useState(false)
  const [result, setResult]   = useState('')
  const [error, setError]     = useState('')
  const abortRef              = useRef<AbortController | null>(null)
  const bottomRef             = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [steps])

  function addStep(content: string, type = 'working') {
    setSteps(prev => [...prev, { type, content, ts: new Date().toISOString() }])
  }

  async function start() {
    if (!task.trim() || running) return
    setSteps([]); setResult(''); setError(''); setRunning(true)

    let taskId: number
    try {
      const res = await fetch(`${API}/api/employees/${employee.id}/chat?company_id=${companyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ message: task }),
      })
      const data = await res.json()
      taskId = data.id
    } catch (e) {
      setError(`Failed to create task: ${e}`); setRunning(false); return
    }

    const ctrl = new AbortController()
    abortRef.current = ctrl

    await runComputerUseTask(
      API, getToken(), employee.id, companyId, taskId, task,
      {
        onStep:  (msg, type) => addStep(msg, type ?? 'working'),
        onDone:  (res)       => { setResult(res); setRunning(false) },
        onError: (err)       => { setError(err);  setRunning(false) },
      },
      ctrl.signal,
    )
  }

  function stop() { abortRef.current?.abort(); setRunning(false); addStep('Stopped by user.', 'error') }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'#080810', color:'#fff', fontFamily:'system-ui' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'#08080f' }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:'#666', cursor:'pointer', fontSize:13 }}>← Back</button>
        <div style={{ fontSize:22 }}>{employee.role_emoji}</div>
        <div>
          <div style={{ fontWeight:700 }}>{employee.name}</div>
          <div style={{ fontSize:11, color:'#666' }}>{employee.role}</div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, fontSize:11,
          padding:'3px 10px', borderRadius:20,
          background: running ? 'rgba(59,130,246,0.15)' : 'rgba(34,197,94,0.15)',
          color: running ? '#60a5fa' : '#4ade80' }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'currentColor', display:'inline-block',
            animation: running ? 'pulse 1s infinite' : 'none' }} />
          {running ? 'Working...' : 'Ready'}
        </div>
      </div>

      {/* Live workspace */}
      <div style={{ flex:1, overflow:'auto', padding:20 }}>
        {steps.length === 0 && !result && !error ? (
          <div style={{ textAlign:'center', paddingTop:60, color:'#444' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>{employee.role_emoji}</div>
            <div style={{ fontSize:15, color:'#666' }}>Give {employee.name} a task to start working</div>
            <div style={{ fontSize:12, color:'#444', marginTop:4 }}>AI will control your computer step by step — you can watch and stop at any time</div>
          </div>
        ) : (
          <div style={{ maxWidth:700, margin:'0 auto', display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ background:'#0a0a12', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'8px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.02)', display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ display:'flex', gap:5 }}>
                  {['#ef4444','#f59e0b','#22c55e'].map(c => <span key={c} style={{ width:10, height:10, borderRadius:'50%', background:c, opacity:0.5 }} />)}
                </div>
                <span style={{ fontSize:11, color:'#444', flex:1, textAlign:'center' }}>{employee.name}'s workspace</span>
                {running && <span style={{ fontSize:10, color:'#f87171', fontWeight:700 }}>● LIVE</span>}
              </div>
              <div style={{ padding:16, fontFamily:'monospace', fontSize:12, minHeight:80, maxHeight:320, overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
                {steps.map((s, i) => (
                  <div key={i} style={{ display:'flex', gap:8, opacity: i === steps.length - 1 ? 1 : 0.65 }}>
                    <span>{STEP_ICON[s.type] ?? STEP_ICON.default}</span>
                    <span style={{ color: s.type === 'done' ? '#4ade80' : s.type === 'error' ? '#f87171' : s.type === 'thinking' ? '#a78bfa' : '#94a3b8' }}>{s.content}</span>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </div>
            {result && (
              <div style={{ padding:16, borderRadius:12, background:'rgba(34,197,94,0.07)', border:'1px solid rgba(34,197,94,0.2)', fontSize:13, color:'#d1fae5', lineHeight:1.6, whiteSpace:'pre-wrap' }}>
                {result}
              </div>
            )}
            {error && (
              <div style={{ padding:16, borderRadius:12, background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)', fontSize:13, color:'#fca5a5' }}>
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding:'12px 20px', borderTop:'1px solid rgba(255,255,255,0.07)', background:'rgba(8,8,16,0.9)' }}>
        <div style={{ maxWidth:700, margin:'0 auto', display:'flex', gap:10, alignItems:'flex-end' }}>
          <textarea value={task} onChange={e => setTask(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); start() } }}
            placeholder={`Tell ${employee.name} what to do...`}
            disabled={running} rows={2}
            style={{ flex:1, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'10px 14px', color:'#fff', fontSize:13, resize:'none', outline:'none', fontFamily:'system-ui', opacity: running ? 0.5 : 1 }} />
          {running
            ? <button onClick={stop} style={{ ...btnStyle, background:'rgba(239,68,68,0.8)', flexShrink:0 }}>Stop</button>
            : <button onClick={start} disabled={!task.trim()} style={{ ...btnStyle, flexShrink:0, opacity: task.trim() ? 1 : 0.3 }}>Start</button>}
        </div>
        <div style={{ textAlign:'center', fontSize:11, color:'#333', marginTop:6 }}>AI controls your computer — you can stop at any time</div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )
}

// ── Employee list ─────────────────────────────────────────────────────────────
function EmployeeList({ companyId, onSelect }: { companyId: number; onSelect: (e: Employee) => void }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    fetch(`${API}/api/employees?company_id=${companyId}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json()).then(setEmployees).finally(() => setLoading(false))
  }, [companyId])

  if (loading) return <div style={{ textAlign:'center', paddingTop:80, color:'#444', fontFamily:'system-ui' }}>Loading your team...</div>

  return (
    <div style={{ padding:24 }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:20, fontWeight:700, marginBottom:4 }}>Your AI Team</div>
        <div style={{ fontSize:13, color:'#666' }}>Select an employee to give them a task</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:12 }}>
        {employees.map(emp => (
          <button key={emp.id} onClick={() => onSelect(emp)}
            style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:18, textAlign:'left', cursor:'pointer', color:'#fff', transition:'border-color 0.15s', fontFamily:'system-ui' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(13,148,136,0.5)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}>
            <div style={{ fontSize:28, marginBottom:10 }}>{emp.role_emoji}</div>
            <div style={{ fontWeight:600, marginBottom:3 }}>{emp.name}</div>
            <div style={{ fontSize:11, color:'#666', marginBottom:10 }}>{emp.role}</div>
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11,
              color: emp.status === 'working' ? '#60a5fa' : emp.status === 'error' ? '#f87171' : '#4ade80' }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'currentColor', display:'inline-block' }} />
              {emp.status === 'working' ? emp.current_task || 'Working...' : emp.status === 'idle' ? 'Ready' : emp.status}
            </div>
          </button>
        ))}
        {employees.length === 0 && <div style={{ color:'#555', fontSize:13 }}>No employees yet — create some in the web app first.</div>}
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed]       = useState(!!getToken())
  const [companyId, setCompanyId] = useState<number | null>(null)
  const [selected, setSelected]   = useState<Employee | null>(null)

  useEffect(() => {
    if (!authed) return
    fetch(`${API}/api/companies`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then((companies: any[]) => { if (companies[0]) setCompanyId(companies[0].id) })
      .catch(() => { setToken(''); setAuthed(false) })
  }, [authed])

  if (!authed)   return <Login onLogin={() => setAuthed(true)} />
  if (!companyId) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#080810', color:'#666', fontFamily:'system-ui' }}>Loading...</div>
  if (selected)  return <TaskRunner employee={selected} companyId={companyId} onBack={() => setSelected(null)} />

  return (
    <div style={{ height:'100vh', background:'#080810', color:'#fff', fontFamily:'system-ui', overflowY:'auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 24px', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'#08080f' }}>
        <div style={{ fontWeight:900, fontSize:18 }}>1nexio</div>
        <button onClick={() => { setToken(''); setAuthed(false) }} style={{ background:'none', border:'none', color:'#555', cursor:'pointer', fontSize:12 }}>Sign out</button>
      </div>
      <EmployeeList companyId={companyId} onSelect={setSelected} />
    </div>
  )
}
