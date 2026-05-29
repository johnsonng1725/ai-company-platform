import { useEffect, useRef, useCallback } from 'react'

export interface TaskPatch {
  id: number
  employee_id: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  steps: { type: string; content: string; ts: string }[]
  result: string
  error: string
  updated_at: string
}

export interface EmployeePatch {
  id: number
  status: 'idle' | 'working' | 'waiting_approval' | 'error'
  current_task: string
}

interface Handlers {
  onTaskUpdate: (patch: TaskPatch) => void
  onEmployeeUpdate: (patch: EmployeePatch) => void
}

function getWsBase(): string {
  const env = (import.meta as any).env?.VITE_WS_URL as string | undefined
  if (env) return env.replace(/\/$/, '')
  // Derive from current page: http → ws, https → wss
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}`
}

export function useTaskSocket(
  companyId: number,
  enabled: boolean,
  handlers: Handlers,
) {
  const wsRef    = useRef<WebSocket | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aliveRef = useRef(true)

  const handlersRef = useRef(handlers)
  useEffect(() => { handlersRef.current = handlers }, [handlers])

  const connect = useCallback(() => {
    if (!aliveRef.current || !enabled) return

    const token = localStorage.getItem('token')
    if (!token) return

    const url = `${getWsBase()}/ws/${companyId}?token=${encodeURIComponent(token)}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        if (msg.type === 'task_update')     handlersRef.current.onTaskUpdate(msg.task)
        if (msg.type === 'employee_update') handlersRef.current.onEmployeeUpdate(msg.employee)
      } catch { /* ignore malformed */ }
    }

    ws.onclose = () => {
      wsRef.current = null
      if (aliveRef.current) {
        // Reconnect after 3 s
        timerRef.current = setTimeout(connect, 3000)
      }
    }

    ws.onerror = () => ws.close()
  }, [companyId, enabled])

  useEffect(() => {
    aliveRef.current = true
    connect()
    return () => {
      aliveRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
      wsRef.current?.close()
    }
  }, [connect])
}
