import { invoke } from '@tauri-apps/api/core'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Screenshot {
  base64: string
  width: number
  height: number
}

export interface ComputerAction {
  type: 'screenshot' | 'mouse_move' | 'left_click' | 'right_click' | 'type' | 'key' | 'open_app' | 'done'
  x?: number
  y?: number
  text?: string
  key?: string
  app?: string
  reason?: string
}

export interface StepCallback {
  onStep: (message: string, type?: string) => void
  onDone: (result: string) => void
  onError: (error: string) => void
}

// ── Screen capture ────────────────────────────────────────────────────────────

export async function captureScreen(): Promise<Screenshot> {
  return invoke<Screenshot>('capture_screen')
}

// ── Execute a single action returned by Claude ───────────────────────────────

export async function executeAction(action: ComputerAction): Promise<void> {
  switch (action.type) {
    case 'mouse_move':
      await invoke('mouse_move', { x: action.x ?? 0, y: action.y ?? 0 })
      break
    case 'left_click':
    case 'right_click':
      await invoke('mouse_click', { payload: { x: action.x ?? 0, y: action.y ?? 0 } })
      break
    case 'type':
      await invoke('keyboard_type', { payload: { text: action.text ?? '' } })
      break
    case 'key':
      await invoke('keyboard_key', { key: action.key ?? '' })
      break
    case 'open_app':
      await invoke('open_application', { payload: { app: action.app ?? '' } })
      break
    case 'screenshot':
    case 'done':
      break
  }
}

// ── Computer Use loop ─────────────────────────────────────────────────────────

export async function runComputerUseTask(
  apiBase: string,
  token: string,
  employeeId: number,
  companyId: number,
  taskId: number,
  taskDescription: string,
  cb: StepCallback,
  signal: AbortSignal,
): Promise<void> {
  let iteration = 0
  const MAX_ITERATIONS = 30

  cb.onStep('Taking initial screenshot...', 'init')

  while (iteration < MAX_ITERATIONS && !signal.aborted) {
    iteration++

    // 1. Capture current screen state
    let screenshot: Screenshot
    try {
      screenshot = await captureScreen()
    } catch (e) {
      cb.onError(`Screen capture failed: ${e}`)
      return
    }

    cb.onStep(`Analysing screen (step ${iteration})...`, 'thinking')

    // 2. Send screenshot to our backend → Claude decides next action
    let action: ComputerAction
    try {
      const res = await fetch(`${apiBase}/api/computer-use/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          company_id: companyId,
          employee_id: employeeId,
          task_id: taskId,
          task: taskDescription,
          screenshot_base64: screenshot.base64,
          screen_width: screenshot.width,
          screen_height: screenshot.height,
          iteration,
        }),
        signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
        cb.onError(err.detail ?? 'Backend error')
        return
      }

      action = await res.json()
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      cb.onError(`Backend request failed: ${e}`)
      return
    }

    // 3. Done?
    if (action.type === 'done') {
      cb.onStep('Task complete.', 'done')
      cb.onDone(action.reason ?? 'Task completed successfully.')
      return
    }

    // 4. Show plain-English step description
    const stepMsg = actionToMessage(action)
    cb.onStep(stepMsg, 'working')

    // 5. Execute the action on the local machine
    try {
      await executeAction(action)
    } catch (e) {
      cb.onError(`Action execution failed: ${e}`)
      return
    }

    // Small delay so apps have time to respond
    await sleep(800)
  }

  if (iteration >= MAX_ITERATIONS) {
    cb.onError('Reached maximum iterations without completing the task.')
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function actionToMessage(action: ComputerAction): string {
  switch (action.type) {
    case 'open_app':   return `Opening ${action.app}...`
    case 'left_click': return `Clicking at (${Math.round(action.x ?? 0)}, ${Math.round(action.y ?? 0)})...`
    case 'type':       return `Typing: "${(action.text ?? '').slice(0, 40)}${(action.text ?? '').length > 40 ? '...' : ''}"`
    case 'key':        return `Pressing ${action.key}...`
    case 'mouse_move': return `Moving mouse to (${Math.round(action.x ?? 0)}, ${Math.round(action.y ?? 0)})...`
    case 'screenshot': return 'Taking screenshot to see the screen...'
    default:           return `Performing action: ${action.type}`
  }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}
