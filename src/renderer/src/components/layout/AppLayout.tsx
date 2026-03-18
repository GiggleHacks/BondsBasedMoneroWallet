import { useState, useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import TitleBar from './TitleBar'
import Sidebar from './Sidebar'
import type { LogEntry } from '@shared/types'
import { useWalletStore } from '@/store/walletStore'

const SOURCE_COLOR: Record<string, string> = {
  wallet: '#a78bfa',
  node:   '#60a5fa',
  lws:    '#34d399',
  app:    '#f26822',
}

const LEVEL_COLOR: Record<string, string> = {
  info:  '#888888',
  debug: '#666666',
  warn:  '#f59e0b',
  error: '#ef4444',
}

function nodeLabel(uri: string | null): string {
  if (!uri) return 'connecting...'
  try {
    return new URL(uri).host
  } catch {
    return uri
  }
}

export default function AppLayout() {
  const { setPriceHistory24h } = useWalletStore()
  const [lastLog, setLastLog] = useState<LogEntry | null>(null)
  const [connectedNode, setConnectedNode] = useState<string | null>(null)
  const [paymentGlow, setPaymentGlow] = useState(false)
  const glowTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Orange glow on new payment
  useEffect(() => {
    const unsub = window.api.wallet.onNewPayment(() => {
      if (glowTimeout.current) clearTimeout(glowTimeout.current)
      setPaymentGlow(true)
      glowTimeout.current = setTimeout(() => setPaymentGlow(false), 700)
    })
    return () => {
      unsub()
      if (glowTimeout.current) clearTimeout(glowTimeout.current)
    }
  }, [])

  // Prefetch 24h price history in the background so Price page loads instantly
  useEffect(() => {
    setTimeout(() => {
      window.api.price.getXmrPriceHistory('1')
        .then(data => { if (data && data.length > 0) setPriceHistory24h(data) })
        .catch(() => {})
    }, 2000)
  }, [])

  useEffect(() => {
    // Seed with most recent log
    window.api.app.getLogs().then(all => {
      if (all.length > 0) setLastLog(all[all.length - 1])
    }).catch(() => {})

    // Rolling single-entry update
    const unsub = window.api.app.onLog((entry) => {
      setLastLog(entry)
    })

    // Get connected node on mount, then poll every 8s
    const fetchNode = () => {
      window.api.node.getConnectedNode().then(setConnectedNode).catch(() => {})
    }
    fetchNode()
    const nodeInterval = setInterval(fetchNode, 8000)

    return () => {
      unsub()
      clearInterval(nodeInterval)
    }
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'transparent' }}>
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Status bar */}
      <div style={{
        height: '26px',
        background: 'rgba(10, 10, 10, 0.5)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        alignItems: 'center',
        padding: '0',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '11px',
        color: '#666666',
        flexShrink: 0,
      }}>
        {/* Node badge */}
        <span style={{
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '0 14px',
          color: connectedNode ? '#60a5fa' : '#666',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          whiteSpace: 'nowrap',
          height: '100%',
        }}>
          ⬡ {nodeLabel(connectedNode)}
        </span>

        {/* Last log line */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0 14px',
          overflow: 'hidden',
          minWidth: 0,
        }}>
          {lastLog ? (
            <>
              <span style={{
                color: SOURCE_COLOR[lastLog.source] ?? '#888',
                flexShrink: 0,
              }}>
                [{lastLog.source}]
              </span>
              <span style={{
                color: LEVEL_COLOR[lastLog.level] ?? '#888',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {lastLog.message}
              </span>
            </>
          ) : (
            <span style={{ color: '#444' }}>ready_</span>
          )}
        </div>

      </div>

      {/* Orange glow vignette on new payment */}
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        opacity: paymentGlow ? 1 : 0,
        transition: paymentGlow ? 'opacity 0.08s ease-out' : 'opacity 0.25s ease-in',
        boxShadow: 'inset 0 0 120px 40px rgba(242, 104, 34, 0.15), inset 0 0 60px 20px rgba(242, 104, 34, 0.08)',
      }} />
    </div>
  )
}
