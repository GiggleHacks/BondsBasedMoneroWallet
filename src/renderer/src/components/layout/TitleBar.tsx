import { useState, useEffect } from 'react'

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.api.app.isMaximized().then(setIsMaximized)
    const unsub = window.api.app.onMaximizeChange(setIsMaximized)
    return unsub
  }, [])

  return (
    <div
      className="flex items-center justify-between select-none shrink-0"
      style={{
        WebkitAppRegion: 'drag',
        height: '34px',
        background: 'rgba(10, 10, 10, 0.5)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      } as any}
    >
      {/* Title */}
      <div className="flex items-center pl-4 gap-2">
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '14px',
          fontWeight: 600,
          color: '#f26822',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          MONERO.EXE
        </span>
        <span style={{
          fontSize: '12px',
          color: '#666666',
          fontWeight: 400,
        }}>
          v1.0
        </span>
      </div>

      {/* Window controls */}
      <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button
          onClick={() => window.api.app.minimize()}
          style={winBtn}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >&#x2500;</button>
        <button
          onClick={() => window.api.app.maximize()}
          style={winBtn}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >{isMaximized ? '\u25A3' : '\u25A1'}</button>
        <button
          onClick={() => window.api.app.close()}
          style={{ ...winBtn, width: '46px' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#c41e1e'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#808080' }}
        >&times;</button>
      </div>
    </div>
  )
}

const winBtn: React.CSSProperties = {
  height: '100%',
  width: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
  color: '#808080',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '16px',
  cursor: 'pointer',
  transition: 'background 0.1s, color 0.1s',
  lineHeight: 1,
}
