import { BrowserWindow } from 'electron'

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'
export type LogSource = 'wallet' | 'node' | 'lws' | 'sync' | 'app'

export interface LogEntry {
  id: number
  timestamp: number
  level: LogLevel
  source: LogSource
  message: string
}

const MAX_ENTRIES = 500
let entries: LogEntry[] = []
let counter = 0

export function appLog(level: LogLevel, source: LogSource, message: string): void {
  const entry: LogEntry = { id: ++counter, timestamp: Date.now(), level, source, message }
  entries.push(entry)
  if (entries.length > MAX_ENTRIES) entries = entries.slice(-MAX_ENTRIES)
  try {
    const wins = BrowserWindow.getAllWindows()
    for (const win of wins) {
      if (!win.isDestroyed()) win.webContents.send('app:log', entry)
    }
  } catch {}
}

export function getLogs(): LogEntry[] {
  return [...entries]
}

export function clearLogs(): void {
  entries = []
}
