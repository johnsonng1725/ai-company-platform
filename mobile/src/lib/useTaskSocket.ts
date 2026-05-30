import { useEffect, useRef } from 'react'
import { API, getToken } from './api'

type Handler = (msg: any) => void

export function useTaskSocket(companyId: number | null, onMessage: Handler) {
  const ws = useRef<WebSocket | null>(null)
  const reconnect = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!companyId) return

    let alive = true

    async function connect() {
      const token = await getToken()
      const base = API.replace(/^http/, 'ws')
      const socket = new WebSocket(`${base}/ws/${companyId}?token=${token}`)
      ws.current = socket

      socket.onmessage = (e) => {
        try { onMessage(JSON.parse(e.data)) } catch {}
      }

      socket.onclose = () => {
        if (alive) reconnect.current = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      alive = false
      if (reconnect.current) clearTimeout(reconnect.current)
      ws.current?.close()
    }
  }, [companyId])
}
