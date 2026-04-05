import { Play, Trash2, Clock, Cpu, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Employee } from '../lib/api'

const MODEL_LABEL: Record<string, string> = {
  'claude-opus-4-6':           'Opus 4.6',
  'claude-sonnet-4-6':         'Sonnet 4.6',
  'claude-haiku-4-5-20251001': 'Haiku 4.5',
  'gpt-4o':                    'GPT-4o',
  'gpt-4o-mini':               'GPT-4o Mini',
}

const STATUS_CONFIG = {
  idle:             { label: 'Idle',              className: 'status-idle',    dot: 'bg-slate-500' },
  working:          { label: 'Working',            className: 'status-working', dot: 'bg-blue-400 animate-pulse' },
  waiting_approval: { label: 'Awaiting Approval',  className: 'status-waiting', dot: 'bg-amber-400 animate-pulse' },
  error:            { label: 'Error',              className: 'status-error',   dot: 'bg-red-400' },
}

interface Props {
  employee: Employee
  companyId: number
  onRun: (id: number) => void
  onDelete: (id: number) => void
  onChat: (employee: Employee) => void
}

export default function EmployeeCard({ employee, companyId, onRun, onDelete, onChat }: Props) {
  const status     = STATUS_CONFIG[employee.status] ?? STATUS_CONFIG.idle
  const canRun     = employee.status === 'idle' || employee.status === 'error'
  const modelId    = (employee.config as any)?.model ?? 'claude-sonnet-4-6'
  const modelLabel = MODEL_LABEL[modelId] ?? modelId

  return (
    <div
      className="card group flex flex-col gap-4 p-5 transition-all hover:border-white/15 cursor-pointer animate-fade-in"
      onClick={() => onChat(employee)}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl"
               style={{ background: 'rgba(124,58,237,0.12)' }}>
            {employee.role_emoji}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 group-hover:text-white transition-colors">
              {employee.name}
            </h3>
            <p className="text-xs text-slate-500">{employee.role}</p>
          </div>
        </div>
        <div className={status.className}>
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </div>
      </div>

      {/* Current task */}
      <div className="min-h-[36px]">
        {employee.current_task ? (
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{employee.current_task}</p>
        ) : (
          <p className="text-xs text-slate-600 italic">Click to chat and assign tasks</p>
        )}
      </div>

      {/* Capabilities */}
      {employee.capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {employee.capabilities.slice(0, 3).map((cap) => (
            <span key={cap} className="rounded-md px-2 py-0.5 text-xs text-slate-500"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {cap}
            </span>
          ))}
          {employee.capabilities.length > 3 && (
            <span className="rounded-md px-2 py-0.5 text-xs text-slate-600"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              +{employee.capabilities.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="flex items-center gap-1"><Cpu size={10} />{modelLabel}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {employee.last_active
              ? formatDistanceToNow(new Date(employee.last_active), { addSuffix: true })
              : 'Never active'}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onChat(employee)}
            title="Open chat"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-accent/15 hover:text-accent-light"
          >
            <MessageSquare size={13} />
          </button>
          <button
            onClick={() => onRun(employee.id)}
            disabled={!canRun}
            title={canRun ? 'Quick run' : 'Already running'}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-accent/15 hover:text-accent-light disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Play size={13} />
          </button>
          <button
            onClick={() => onDelete(employee.id)}
            title="Remove employee"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-red-500/15 hover:text-red-400"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
