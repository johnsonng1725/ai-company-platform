import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, Loader2, CheckCircle, Clock, Users, Settings2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { employees as employeesApi } from '../lib/api'
import type { Employee } from '../lib/api'

const TOKEN = () => localStorage.getItem('token')

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN()}`, ...options.headers },
  })
  if (!res.ok) { const e = await res.json().catch(() => ({ detail: 'Error' })); throw new Error(e.detail) }
  return res.json()
}

interface MeetingMsg {
  id: number
  role: 'user' | 'employee'
  employee_id: number | null
  employee_name: string | null
  employee_emoji: string | null
  content: string
  status: 'pending' | 'done'
  created_at: string
}
interface MeetingDetail {
  id: number
  name: string
  participant_ids: number[]
  participants: { id: number; name: string; role: string; role_emoji: string; status: string }[]
}

// Assign a subtle accent color to each employee
const COLORS = ['#0d9488', '#2563eb', '#059669', '#d97706', '#dc2626', '#0d9488']
function empColor(id: number) { return COLORS[id % COLORS.length] }

export default function MeetingRoom() {
  const { companyId, meetingId } = useParams<{ companyId: string; meetingId: string }>()
  const navigate = useNavigate()
  const cid = Number(companyId)
  const mid = Number(meetingId)

  const [meeting,   setMeeting]   = useState<MeetingDetail | null>(null)
  const [messages,  setMessages]  = useState<MeetingMsg[]>([])
  const [allEmps,   setAllEmps]   = useState<Employee[]>([])
  const [input,     setInput]     = useState('')
  const [sending,   setSending]   = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [showConfig,setShowConfig]= useState(false)
  const bottomRef   = useRef<HTMLDivElement>(null)
  const pollingRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadMessages = useCallback(async () => {
    const msgs = await api<MeetingMsg[]>(`/meetings/${mid}/messages?company_id=${cid}`)
    setMessages(msgs)
    return msgs
  }, [mid, cid])

  useEffect(() => {
    async function init() {
      try {
        const [m, emps] = await Promise.all([
          api<MeetingDetail>(`/meetings/${mid}?company_id=${cid}`),
          employeesApi.list(cid),
        ])
        setMeeting(m)
        setAllEmps(emps)
        await loadMessages()
      } finally { setLoading(false) }
    }
    init()
  }, [mid, cid, loadMessages])

  // Poll while there are pending messages
  useEffect(() => {
    const hasPending = messages.some((m) => m.status === 'pending')
    if (hasPending && !pollingRef.current) {
      pollingRef.current = setInterval(async () => {
        const updated = await loadMessages()
        if (!updated.some((m) => m.status === 'pending') && pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
      }, 2500)
    }
    return () => {}
  }, [messages, loadMessages])
  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current) }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const msg = input.trim()
    if (!msg || sending) return
    setSending(true)
    try {
      await api(`/meetings/${mid}/chat?company_id=${cid}`, {
        method: 'POST',
        body: JSON.stringify({ message: msg }),
      })
      setInput('')
      await loadMessages()
    } catch (e: any) { alert(e.message) }
    finally { setSending(false) }
  }

  async function updateParticipants(newIds: number[]) {
    const token = TOKEN()
    await fetch(`/api/meetings/${mid}?company_id=${cid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ participant_ids: newIds }),
    })
    const m = await api<MeetingDetail>(`/meetings/${mid}?company_id=${cid}`)
    setMeeting(m)
  }

  async function deleteMeeting() {
    if (!confirm(`Delete meeting "${meeting?.name}"?`)) return
    await api(`/meetings/${mid}?company_id=${cid}`, { method: 'DELETE' })
    navigate(`/c/${cid}/dashboard`)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const isWorking = messages.some((m) => m.status === 'pending')

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-surface">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  )
  if (!meeting) return <div className="flex h-screen items-center justify-center text-slate-400">Meeting not found.</div>

  return (
    <div className="flex h-screen flex-col bg-surface">
      {/* Header */}
      <header className="flex items-center gap-4 border-b px-6 py-3 shrink-0"
              style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#080810' }}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl text-lg"
               style={{ background: 'rgba(13,148,136,0.15)' }}>📅</div>
          <div>
            <p className="text-sm font-semibold text-white">{meeting.name}</p>
            <div className="flex items-center gap-1.5">
              {meeting.participants.slice(0, 5).map((p) => (
                <span key={p.id} title={p.name} className="text-xs">{p.role_emoji}</span>
              ))}
              <span className="text-xs text-slate-500">{meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}</span>
              {isWorking && (
                <span className="flex items-center gap-1 text-xs text-blue-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                  responding...
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowConfig(!showConfig)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-400 transition-all hover:bg-white/5 hover:text-slate-200">
            <Settings2 size={14} />Participants
          </button>
          <button onClick={deleteMeeting}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-red-400/70 transition-all hover:bg-red-500/10 hover:text-red-400">
            <Trash2 size={14} />
          </button>
        </div>
      </header>

      {/* Participant config panel */}
      {showConfig && (
        <div className="border-b px-6 py-4" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
          <p className="mb-3 text-xs font-medium text-slate-400">Select participants for this meeting:</p>
          <div className="flex flex-wrap gap-2">
            {allEmps.map((emp) => {
              const isIn = meeting.participant_ids.includes(emp.id)
              return (
                <button
                  key={emp.id}
                  onClick={() => {
                    const newIds = isIn
                      ? meeting.participant_ids.filter((id) => id !== emp.id)
                      : [...meeting.participant_ids, emp.id]
                    updateParticipants(newIds)
                  }}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-all ${
                    isIn
                      ? 'bg-accent/20 text-white border border-accent/40'
                      : 'text-slate-400 border hover:border-white/15 hover:text-slate-200'
                  }`}
                  style={{ borderColor: isIn ? undefined : 'rgba(255,255,255,0.08)' }}
                >
                  {emp.role_emoji} {emp.name}
                  {isIn && <CheckCircle size={11} className="text-accent-light" />}
                </button>
              )
            })}
            <button
              onClick={() => updateParticipants(allEmps.map((e) => e.id))}
              className="rounded-lg border px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-all"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <Users size={11} className="inline mr-1" />All
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <span className="text-5xl">📅</span>
              <div>
                <p className="text-base font-medium text-slate-200">{meeting.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {meeting.participants.length === 0
                    ? 'Add participants using the Participants button above, then start the meeting.'
                    : `${meeting.participants.map((p) => p.name).join(', ')} are in this meeting. Send a message to begin.`}
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              if (msg.role === 'user') {
                return (
                  <div key={msg.id} className="flex justify-end animate-fade-in">
                    <div className="max-w-[70%]">
                      <div className="rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-white"
                           style={{ background: 'rgba(13,148,136,0.35)', border: '1px solid rgba(13,148,136,0.4)' }}>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <p className="mt-1 text-right text-xs text-slate-600">
                        You · {format(new Date(msg.created_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                )
              }

              // Employee message
              const color = empColor(msg.employee_id ?? 0)
              return (
                <div key={msg.id} className="flex items-start gap-3 animate-fade-in">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-lg"
                       style={{ background: `${color}22`, border: `1px solid ${color}40` }}>
                    {msg.employee_emoji ?? '🤖'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color }}>{msg.employee_name}</span>
                      <span className="text-xs text-slate-600">{format(new Date(msg.created_at), 'HH:mm')}</span>
                    </div>
                    {msg.status === 'pending' ? (
                      <div className="flex items-center gap-1.5 rounded-xl px-4 py-3"
                           style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', width: 'fit-content' }}>
                        <span className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: color, animationDelay: '0ms' }} />
                        <span className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: color, animationDelay: '150ms' }} />
                        <span className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: color, animationDelay: '300ms' }} />
                      </div>
                    ) : (
                      <div className="rounded-xl px-4 py-3"
                           style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t px-6 py-4"
           style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(8px)' }}>
        <div className="mx-auto max-w-3xl">
          {meeting.participants.length === 0 && (
            <p className="mb-2 text-center text-xs text-amber-400">
              ⚠️ No participants yet — click "Participants" to add employees to this meeting.
            </p>
          )}
          <div className="flex items-end gap-3 rounded-2xl px-4 py-3"
               style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <textarea
              className="flex-1 resize-none bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
              style={{ minHeight: '24px', maxHeight: '120px' }}
              placeholder={
                isWorking
                  ? 'Waiting for responses...'
                  : meeting.participants.length === 0
                    ? 'Add participants first...'
                    : `Message the meeting... (Enter to send)`
              }
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={handleKey}
              disabled={isWorking || sending || meeting.participants.length === 0}
              rows={1}
            />
            <button
              onClick={send}
              disabled={!input.trim() || isWorking || sending || meeting.participants.length === 0}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition-all hover:bg-accent-light disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-slate-600">
            Replies from: {meeting.participants.map((p) => `${p.role_emoji} ${p.name}`).join(' · ') || 'no one yet'}
          </p>
        </div>
      </div>
    </div>
  )
}
