import { useEffect, useState, useRef } from 'react'
import type { TransactionInfo } from '../../../shared/types'

interface IRSModalProps {
  open: boolean
  onClose: () => void
  transactions: TransactionInfo[]
}

const FULL_MESSAGE = `> INITIALIZING IRS COMPLIANCE MODULE...
> CONNECTING TO SECURE GOVERNMENT SERVER...
> SCANNING MONERO BLOCKCHAIN...
>
> The Bonds-Based Monero Wallet is the most ethical
> and law-abiding Monero wallet available.
>
> This wallet is fully compliant and cooperative
> with applicable financial regulations.
>
> This interface allows responsible citizens to
> voluntarily report Monero transaction activity
> to the Internal Revenue Service.
>
> READY FOR VOLUNTARY DISCLOSURE.
> _`

// Atomic units → XMR (12 decimal places)
function atomicToXmr(atomic: string): string {
  try {
    const n = BigInt(atomic)
    const xmr = Number(n) / 1e12
    return xmr.toFixed(6)
  } catch {
    return '0.000000'
  }
}

function formatTs(ts: number): string {
  if (!ts) return '----/--/-- --:--'
  const d = new Date(ts * 1000)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ── Pixel-art IRS letters via box-shadow ────────────────────────────────────
// Each letter is a 5×7 grid. Scale = 3px per pixel.
// box-shadow offsets: (col * scale)px (row * scale)px 0 0 color
const S = 3 // pixel scale
function px(col: number, row: number, color: string) {
  return `${col * S}px ${row * S}px 0 0 ${color}`
}

// "I" glyph (cols 0-4, rows 0-6)
const I_PIXELS: [number, number][] = [
  [0,0],[1,0],[2,0],[3,0],[4,0],
  [2,1],[2,2],[2,3],[2,4],[2,5],
  [0,6],[1,6],[2,6],[3,6],[4,6],
]
// "R" glyph (offset by 7 cols)
const R_PIXELS: [number, number][] = [
  [0,0],[1,0],[2,0],[3,0],
  [0,1],[4,1],
  [0,2],[4,2],
  [0,3],[1,3],[2,3],[3,3],
  [0,4],[3,4],
  [0,5],[4,5],
  [0,6],[4,6],
].map(([c,r]) => [c + 7, r])
// "S" glyph (offset by 14 cols)
const S_PIXELS: [number, number][] = [
  [1,0],[2,0],[3,0],[4,0],
  [0,1],
  [0,2],
  [1,3],[2,3],[3,3],
  [4,4],
  [4,5],
  [0,6],[1,6],[2,6],[3,6],
].map(([c,r]) => [c + 14, r])

const ALL_PIXELS = [...I_PIXELS, ...R_PIXELS, ...S_PIXELS]
const LOGO_SHADOW = ALL_PIXELS.map(([c, r]) => px(c, r, '#33ff33')).join(', ')

export default function IRSModal({ open, onClose, transactions }: IRSModalProps) {
  const [typed, setTyped] = useState('')
  const [hovering, setHovering] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Typewriter — resets and replays every time modal opens
  useEffect(() => {
    if (!open) {
      setTyped('')
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    setTyped('')
    let i = 0
    intervalRef.current = setInterval(() => {
      i++
      setTyped(FULL_MESSAGE.slice(0, i))
      if (i >= FULL_MESSAGE.length) {
        clearInterval(intervalRef.current!)
        intervalRef.current = null
      }
    }, 28)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  // Last 3 transactions, newest first
  const recentTxs = [...transactions]
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 3)

  // Pad to 3 rows with placeholders
  const rows: Array<TransactionInfo | null> = [
    recentTxs[0] ?? null,
    recentTxs[1] ?? null,
    recentTxs[2] ?? null,
  ]

  const font = "'IBM Plex Mono', 'Courier New', monospace"

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        background: 'rgba(0,0,0,0.93)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        // Scanlines overlay on the backdrop
        backgroundImage: `
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 20, 0, 0.18) 2px,
            rgba(0, 20, 0, 0.18) 4px
          )
        `,
      }}
    >
      {/* Terminal panel — stop click propagation so clicking inside doesn't close */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#050a05',
          border: '2px solid #33ff33',
          boxShadow: '0 0 40px rgba(51,255,51,0.18), inset 0 0 60px rgba(0,0,0,0.5)',
          fontFamily: font,
          padding: '32px 36px 28px',
          // Subtle inner scanlines
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 3px,
              rgba(0,255,0,0.015) 3px,
              rgba(0,255,0,0.015) 4px
            )
          `,
        }}
      >

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '14px',
            background: 'transparent',
            border: '1px solid #33ff33',
            color: '#33ff33',
            fontFamily: font,
            fontSize: '14px',
            padding: '2px 8px',
            cursor: 'pointer',
            lineHeight: 1.4,
            opacity: 0.7,
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
        >
          [×]
        </button>

        {/* ── Pixel-art IRS logo ── */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{
            position: 'relative',
            width: `${(14 + 5 + 1) * S}px`,   // 20 cols × scale
            height: `${7 * S}px`,
            marginLeft: `${S}px`,             // box-shadow is offset from a 1px source
          }}>
            <div style={{
              width: `${S}px`,
              height: `${S}px`,
              background: 'transparent',
              boxShadow: LOGO_SHADOW,
              imageRendering: 'pixelated',
            }} />
          </div>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            color: '#ffff00',
            fontSize: '18px',
            fontWeight: 700,
            letterSpacing: '0.15em',
            textShadow: '0 0 10px rgba(255,255,0,0.4)',
            marginBottom: '4px',
          }}>
            IRS COMPLIANCE TERMINAL
          </div>
          <div style={{
            color: '#33ff33',
            fontSize: '11px',
            letterSpacing: '0.12em',
            opacity: 0.7,
          }}>
            Internal Revenue Service Compliance Interface
          </div>
          <div style={{
            marginTop: '16px',
            height: '1px',
            background: 'linear-gradient(to right, transparent, #33ff33, transparent)',
            opacity: 0.4,
          }} />
        </div>

        {/* Typewriter message panel */}
        <div style={{
          background: '#020802',
          border: '1px solid rgba(51,255,51,0.35)',
          padding: '14px 16px',
          marginBottom: '20px',
          minHeight: '180px',
          position: 'relative',
        }}>
          {/* Corner accents */}
          {['topLeft','topRight','bottomLeft','bottomRight'].map(corner => {
            const isTop = corner.includes('top')
            const isLeft = corner.includes('Left')
            return (
              <div key={corner} style={{
                position: 'absolute',
                top: isTop ? '-1px' : 'auto',
                bottom: !isTop ? '-1px' : 'auto',
                left: isLeft ? '-1px' : 'auto',
                right: !isLeft ? '-1px' : 'auto',
                width: '8px',
                height: '8px',
                background: '#33ff33',
              }} />
            )
          })}
          <pre style={{
            margin: 0,
            color: '#33ff33',
            fontSize: '12px',
            lineHeight: 1.7,
            fontFamily: font,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {typed}
            {/* Blinking cursor while typing */}
            {typed.length < FULL_MESSAGE.length && (
              <span style={{ animation: 'irs-blink 0.6s step-end infinite' }}>█</span>
            )}
          </pre>
        </div>

        {/* Transaction list */}
        <div style={{
          background: '#020802',
          border: '1px solid rgba(51,255,51,0.35)',
          padding: '12px 16px',
          marginBottom: '24px',
        }}>
          <div style={{
            color: '#ffff00',
            fontSize: '10px',
            letterSpacing: '0.14em',
            marginBottom: '10px',
            fontWeight: 600,
          }}>
            ▸ RECENT MONERO TRANSACTIONS (LAST 3)
          </div>
          <div style={{
            height: '1px',
            background: 'rgba(51,255,51,0.2)',
            marginBottom: '10px',
          }} />
          {rows.map((tx, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              padding: '5px 0',
              borderBottom: i < 2 ? '1px solid rgba(51,255,51,0.1)' : 'none',
              fontSize: '11px',
              fontFamily: font,
            }}>
              <span style={{ color: '#1a8c1a', minWidth: '36px' }}>TX #{i + 1}</span>
              <span style={{ color: 'rgba(51,255,51,0.25)' }}>│</span>
              {tx ? (
                <>
                  <span style={{
                    color: tx.isIncoming ? '#33ff33' : '#aaaa00',
                    minWidth: '20px',
                    fontSize: '10px',
                    fontWeight: 700,
                  }}>
                    {tx.isIncoming ? ' IN' : 'OUT'}
                  </span>
                  <span style={{ color: 'rgba(51,255,51,0.25)' }}>│</span>
                  <span style={{ color: '#aaff66', minWidth: '110px', letterSpacing: '0.04em' }}>
                    {atomicToXmr(tx.amount)} XMR
                  </span>
                  <span style={{ color: 'rgba(51,255,51,0.25)' }}>│</span>
                  <span style={{ color: '#1a8c1a', fontSize: '10px' }}>
                    {formatTs(tx.timestamp)}
                  </span>
                </>
              ) : (
                <span style={{ color: '#1a3d1a', letterSpacing: '0.1em' }}>
                  -- NO DATA AVAILABLE --
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Report button */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => {}}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            style={{
              background: '#f26822',
              border: '3px solid #ff8844',
              color: '#ffffff',
              fontFamily: font,
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              padding: '12px 28px',
              cursor: 'pointer',
              borderRadius: 0,
              boxShadow: hovering ? '2px 2px 0px #5c2508' : '4px 4px 0px #8b3a10',
              transform: hovering ? 'translate(2px, 2px)' : 'translate(0, 0)',
              transition: 'transform 0.07s, box-shadow 0.07s',
              textShadow: '1px 1px 0px rgba(0,0,0,0.5)',
              textTransform: 'uppercase',
            }}
          >
            ▶ REPORT MONERO TRANSACTIONS TO THE IRS
          </button>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '18px',
          textAlign: 'center',
          color: '#1a3d1a',
          fontSize: '9px',
          letterSpacing: '0.1em',
        }}>
          INTERNAL REVENUE SERVICE — VOLUNTARY COMPLIANCE DIVISION — FORM XMR-1099
        </div>
      </div>

      {/* Blink keyframe — injected inline */}
      <style>{`
        @keyframes irs-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
