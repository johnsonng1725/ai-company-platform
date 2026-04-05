import { useEffect, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import type { ActivityLog } from '../lib/api'

interface Props {
  logs: ActivityLog[]
  compact?: boolean
}

const LEVEL_CONFIG = {
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  success: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
}

export default function ActivityFeed({ logs, compact = false }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  if (logs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-600">
        No activity yet. Trigger an employee to get started.
      </div>
    )
  }

  return (
    <div
      className="flex flex-col gap-1 overflow-y-auto"
      onScroll={(e) => {
        const el = e.currentTarget
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
        setAutoScroll(atBottom)
      }}
    >
      {[...logs].reverse().map((log) => {
        const cfg = LEVEL_CONFIG[log.level] ?? LEVEL_CONFIG.info
        const Icon = cfg.icon
        return (
          <div
            key={log.id}
            className={`flex items-start gap-3 rounded-lg p-3 ${cfg.bg} animate-fade-in`}
          >
            <Icon size={14} className={`mt-0.5 shrink-0 ${cfg.color}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {log.employee_emoji && log.employee_name && !compact && (
                  <span className="text-xs font-medium text-slate-400">
                    {log.employee_emoji} {log.employee_name}
                  </span>
                )}
                <span className="text-xs text-slate-300 leading-relaxed">{log.message}</span>
              </div>
              <span className="text-xs text-slate-600 mt-0.5 block">
                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
