import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ArrowUpRight, ArrowDownLeft, TrendingUp, Settings, Landmark } from 'lucide-react'
import { lazy, Suspense, useState, useEffect } from 'react'
import mascotImg from '@/assets/davidbond2.png'

type NodeStatus = 'connecting' | 'connected' | 'error'

const STATUS_DOT: Record<NodeStatus, { bg: string; shadow: string }> = {
  connecting: { bg: '#f59e0b', shadow: 'rgba(245,158,11,0.45)' },
  connected:  { bg: '#4ade80', shadow: 'rgba(74,222,128,0.4)' },
  error:      { bg: '#ef4444', shadow: 'rgba(239,68,68,0.45)' },
}

const STATUS_LABEL: Record<NodeStatus, string> = {
  connecting: 'connecting...',
  connected:  'connected',
  error:      'offline',
}

const Sidebar3DModel = lazy(() => import('@/components/Sidebar3DModel'))

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/send', label: 'Send XMR', icon: ArrowUpRight },
  { path: '/receive', label: 'Receive', icon: ArrowDownLeft },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/price', label: 'Price', icon: TrendingUp },
  { path: '/irs', label: 'FILE TAXES', icon: Landmark },
]

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [nodeStatus, setNodeStatus] = useState<NodeStatus>('connecting')

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      try {
        const uri = await window.api.node.getConnectedNode()
        if (cancelled) return
        if (!uri) { setNodeStatus('connecting'); return }
        const result = await window.api.node.testConnection(uri, true) // silent — no log spam
        if (!cancelled) setNodeStatus(result.isHealthy ? 'connected' : 'error')
      } catch {
        if (!cancelled) setNodeStatus('error')
      }
    }

    check()
    const interval = setInterval(check, 90_000) // every 90s is plenty for a status dot
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  return (
    <div style={{
      width: '220px', minWidth: '220px', height: '100%',
      background: 'rgba(10, 10, 10, 0.65)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderRight: '1px solid rgba(255, 255, 255, 0.06)',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'IBM Plex Mono', monospace",
    }}>
      {/* Mascot + Branding */}
      <div style={{
        padding: '14px 14px 12px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <img
          src={mascotImg}
          alt="Bond"
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            borderRadius: '8px',
            border: '1px solid rgba(242, 104, 34, 0.25)',
            boxShadow: '0 0 20px rgba(242, 104, 34, 0.15)',
          }}
        />
        <div style={{
          marginTop: '10px',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#f26822',
            letterSpacing: '0.08em',
            lineHeight: 1.3,
            textTransform: 'uppercase',
          }}>
            Bond's Based
          </div>
          <div style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#e0e0e0',
            letterSpacing: '0.08em',
            lineHeight: 1.3,
            textTransform: 'uppercase',
          }}>
            Monero Wallet
          </div>
        </div>
      </div>

      {/* Navigation — grows to fill available space */}
      <nav style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 18px',
                background: isActive ? 'rgba(242, 104, 34, 0.08)' : 'transparent',
                borderLeft: isActive ? '2px solid #f26822' : '2px solid transparent',
                borderTop: 'none',
                borderBottom: 'none',
                borderRight: 'none',
                borderRadius: 0,
                color: isActive ? '#f26822' : '#909090',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '14px',
                fontWeight: isActive ? 600 : 500,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.12s',
                letterSpacing: '0.02em',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.color = '#e0e0e0'
                  e.currentTarget.style.background = 'rgba(242, 104, 34, 0.04)'
                  e.currentTarget.style.borderLeftColor = '#555'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.color = '#909090'
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderLeftColor = 'transparent'
                }
              }}
            >
              <Icon size={16} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.5 }} />
              <span>{isActive ? '> ' : ''}{label}</span>
            </button>
          )
        })}
      </nav>

      {/* 3D Model — pinned at bottom above status */}
      <div style={{ height: '180px', overflow: 'hidden', flexShrink: 0 }}>
        <Suspense fallback={null}>
          <Sidebar3DModel />
        </Suspense>
      </div>

      {/* Status footer */}
      <div style={{
        padding: '10px 18px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0,
      }}>
        <span style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: STATUS_DOT[nodeStatus].bg,
          boxShadow: `0 0 6px ${STATUS_DOT[nodeStatus].shadow}`,
          display: 'inline-block', flexShrink: 0,
          transition: 'background 0.4s, box-shadow 0.4s',
        }} />
        <span style={{
          fontSize: '12px', color: '#888888', fontWeight: 500,
          letterSpacing: '0.05em',
        }}>
          {STATUS_LABEL[nodeStatus]}
        </span>
      </div>
    </div>
  )
}
