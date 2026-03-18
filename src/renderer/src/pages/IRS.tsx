import { useEffect, useState, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import irsLogo from '@/assets/irs-logo.png'
import connection1Sound from '@/assets/sounds/connection1.mp3'
import dailupSound from '@/assets/sounds/dailup.mp3'
import tadaSound from '@/assets/sounds/tada.wav'

// ── Colours matching IRS.gov ──────────────────────────────────────────────────
const NAVY   = '#003087'
const NAVY2  = '#1a4480'
const BLUE   = '#005ea2'
const WHITE  = '#ffffff'
const OFFWHT = '#f0f0f0'
const BLACK  = '#1b1b1b'
const MUTED  = '#565c65'
const BORDER = '#dfe1e2'
const BANNER = '#e7f0f9'

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = 'form' | 'connecting' | 'approved' | 'reporting' | 'done'

interface FakeTx {
  isIncoming: boolean
  amount: string
  timestamp: number
}

// ── Session persistence (survives React remounts within same app session) ─────
let _sessionPhase: Phase = 'form'
let _sessionFakeTxs: FakeTx[] | null = null
let _sessionCaseNum: string | null = null

function generateFakeTxs(): FakeTx[] {
  const now = Math.floor(Date.now() / 1000)
  const DAY = 86400
  return Array.from({ length: 3 }, (_, i) => ({
    isIncoming: Math.random() > 0.5,
    amount: (Math.random() * 0.14 + 0.001).toFixed(6),
    timestamp: now - (i * DAY * 7) - Math.floor(Math.random() * DAY * 5),
  }))
}

function generateCaseNum(): string {
  return 'XMR-2026-' + String(Math.floor(Math.random() * 900000 + 100000))
}

function formatTs(ts: number): string {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

const sans = "'Arial', 'Helvetica Neue', sans-serif"
const mono = "'IBM Plex Mono', 'Courier New', monospace"

// ── KYC connecting steps (~2s to match connection1.mp3) ──────────────────────
const DIAL_STEPS: { ms: number; text: string; pct: number }[] = [
  { ms: 0,    text: 'Connecting to IRS Government Server...',  pct: 0  },
  { ms: 500,  text: 'Authenticating credentials...',           pct: 40 },
  { ms: 1000, text: 'Verifying identity...',                   pct: 72 },
  { ms: 1600, text: 'KYC verification complete.',              pct: 95 },
  { ms: 1900, text: 'Done.',                                   pct: 100 },
]

// ── Modem upload steps (~28s to match dailup.mp3) ────────────────────────────
const MODEM_STEPS: { ms: number; text: string; pct: number }[] = [
  { ms: 0,     text: 'Initializing secure modem connection...',       pct: 0  },
  { ms: 2000,  text: 'Dialing 1-800-829-1040...',                    pct: 5  },
  { ms: 4200,  text: 'Negotiating connection speed... 56,000 bps',   pct: 12 },
  { ms: 6500,  text: 'Handshaking with irs.gov secure server...',    pct: 22 },
  { ms: 8800,  text: 'Authenticating 256-bit encryption keys...',    pct: 32 },
  { ms: 11000, text: 'Uploading Monero Transaction History To local government...',  pct: 44 },
  { ms: 14000, text: 'Uploading Monero Transaction History To local government...',  pct: 57 },
  { ms: 16700, text: 'Uploading Monero Transaction History To local government...',  pct: 70 },
  { ms: 19500, text: 'Verifying data integrity with IRS server...',  pct: 80 },
  { ms: 21800, text: 'Generating compliance certificate...',         pct: 88 },
  { ms: 23700, text: 'Finalizing submission to IRS database...',     pct: 94 },
  { ms: 25000, text: 'Awaiting server confirmation...',              pct: 98 },
  { ms: 26000, text: 'Submission confirmed.',                        pct: 100 },
]

// ── Win95 chunky progress bar ─────────────────────────────────────────────────
function Win95Progress({ pct }: { pct: number }) {
  return (
    <div style={{
      border: '2px solid',
      borderColor: '#808080 #dfdfdf #dfdfdf #808080',
      background: '#c0c0c0',
      height: '22px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Chunky segmented fill */}
      <div style={{
        position: 'absolute', left: '1px', top: '1px', bottom: '1px',
        width: `calc(${pct}% - 2px)`,
        background: 'repeating-linear-gradient(90deg, #000080 0px, #000080 12px, #1a4fd6 12px, #1a4fd6 14px)',
        transition: 'width 0.6s linear',
      }} />
    </div>
  )
}

// ── Globe / connecting animation ──────────────────────────────────────────────
function ConnectingGlobe() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0 14px' }}>
      <div style={{ position: 'relative', width: '72px', height: '72px' }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #4488ff 0%, #001166 70%)',
          border: '3px solid #808080',
          boxShadow: 'inset -4px -4px 8px rgba(0,0,0,0.4)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', left: '20%', top: '50%', width: '44px', height: '22px', marginTop: '-11px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.18)' }} />
          <div style={{ position: 'absolute', left: '5%', top: '25%', width: '62px', height: '22px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.12)' }} />
        </div>
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: '84px', height: '84px', marginLeft: '-42px', marginTop: '-42px', borderRadius: '50%', border: '2px dashed rgba(0,200,255,0.6)', animation: 'globeSpin 1.2s linear infinite' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: '90px', height: '52px', marginLeft: '-45px', marginTop: '-26px', borderRadius: '50%', border: '1px dashed rgba(120,180,255,0.35)', animation: 'globeSpin 2s linear infinite reverse', transform: 'rotateX(55deg)' }} />
        {/* Blinking status dot */}
        <div style={{ position: 'absolute', bottom: '0', right: '0', width: '10px', height: '10px', borderRadius: '50%', background: '#00ff44', boxShadow: '0 0 6px #00ff44', border: '1px solid #004400', animation: 'irscur 0.7s step-end infinite' }} />
      </div>
    </div>
  )
}

// ── Win95 Dialing Progress banner (globe → waves → phone + computer) ─────────
function DialupBanner() {
  return (
    <div style={{ background: '#007878', height: '88px', display: 'flex', alignItems: 'center', padding: '0 14px', gap: '0', marginBottom: '10px', border: '2px solid', borderColor: '#808080 #dfdfdf #dfdfdf #808080', overflow: 'hidden', position: 'relative' }}>

      {/* Globe */}
      <div style={{ width: '62px', height: '62px', borderRadius: '50%', flexShrink: 0, background: 'radial-gradient(circle at 38% 32%, #5ab4f0 0%, #1a6bb5 38%, #0d4080 72%)', border: '2px solid #2a5a9a', boxShadow: '2px 2px 6px rgba(0,0,0,0.5)', position: 'relative', overflow: 'hidden' }}>
        {/* Continents */}
        <div style={{ position: 'absolute', width: '20px', height: '24px', background: '#2d8a3e', borderRadius: '55% 40% 60% 35%', top: '10px', left: '12px', boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.2)' }} />
        <div style={{ position: 'absolute', width: '13px', height: '18px', background: '#3a9a4c', borderRadius: '40% 60% 30% 55%', top: '6px', left: '34px' }} />
        <div style={{ position: 'absolute', width: '15px', height: '11px', background: '#2d8a3e', borderRadius: '50%', bottom: '12px', left: '6px' }} />
        <div style={{ position: 'absolute', width: '9px', height: '13px', background: '#3a9a4c', borderRadius: '40%', bottom: '8px', right: '8px' }} />
        <div style={{ position: 'absolute', width: '7px', height: '7px', background: '#246e32', borderRadius: '50%', top: '30px', left: '6px' }} />
      </div>

      {/* Signal wave dots — travel left to right */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '0 6px' }}>
        {Array.from({ length: 11 }, (_, i) => (
          <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.9)', flexShrink: 0, animation: 'signalDot 1.3s ease-in-out infinite', animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>

      {/* Right: telephone + computer */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
        {/* Yellow telephone */}
        <div style={{ width: '30px', height: '48px', background: '#d4b800', border: '2px solid', borderColor: '#ffe040 #8a7800 #8a7800 #ffe040', borderRadius: '5px 5px 8px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0', gap: '2px' }}>
          <div style={{ width: '18px', height: '7px', background: '#8a7800', borderRadius: '3px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 5px)', gap: '2px', marginTop: '3px' }}>
            {Array.from({ length: 9 }, (_, j) => (
              <div key={j} style={{ width: '5px', height: '4px', background: '#b89a00', borderRadius: '1px', border: '1px solid #8a7800' }} />
            ))}
          </div>
        </div>

        {/* Computer: monitor + tower */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end' }}>
          <div>
            <div style={{ width: '46px', height: '36px', background: '#c0c0c0', border: '2px solid', borderColor: '#ffffff #808080 #808080 #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '34px', height: '24px', background: '#000080', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', padding: '2px 3px', gap: '2px', overflow: 'hidden' }}>
                <div style={{ width: '90%', height: '2px', background: '#00ff44', animation: 'modemLine 0.28s step-end infinite' }} />
                <div style={{ width: '70%', height: '2px', background: '#00cc33', animation: 'modemLine 0.4s step-end infinite 0.1s' }} />
                <div style={{ width: '85%', height: '2px', background: '#00ff44', animation: 'modemLine 0.35s step-end infinite 0.05s' }} />
                <div style={{ width: '55%', height: '2px', background: '#008822', animation: 'modemLine 0.45s step-end infinite 0.15s' }} />
              </div>
            </div>
            <div style={{ width: '16px', height: '4px', background: '#a0a0a0', margin: '0 auto', border: '1px solid #808080' }} />
            <div style={{ width: '30px', height: '3px', background: '#a0a0a0', margin: '0 auto', border: '1px solid #808080' }} />
          </div>
          {/* Tower */}
          <div style={{ width: '16px', height: '40px', background: '#c0c0c0', border: '2px solid', borderColor: '#ffffff #808080 #808080 #ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '2px', background: '#444' }} />
            <div style={{ width: '7px', height: '7px', background: '#000080', borderRadius: '50%', border: '1px solid #00008866' }} />
            <div style={{ width: '8px', height: '2px', background: '#444' }} />
            <div style={{ width: '6px', height: '3px', background: '#228822', borderRadius: '1px', animation: 'modemLine 0.5s step-end infinite' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function IRS() {
  const navigate = useNavigate()
  const [phase, setPhaseState] = useState<Phase>(_sessionPhase)
  const [activeNav, setActiveNav] = useState('compliance')

  // KYC form state
  const [firstName, setFirstName]   = useState('')
  const [lastName, setLastName]     = useState('')
  const [address, setAddress]       = useState('')
  const [fundsSource, setFundsSource] = useState('')
  const [formError, setFormError]   = useState('')
  const [shakeForm, setShakeForm]   = useState(false)

  // Loading states
  const [dialText, setDialText]     = useState(DIAL_STEPS[0].text)
  const [dialPct, setDialPct]       = useState(0)
  const [modemText, setModemText]   = useState(MODEM_STEPS[0].text)
  const [modemPct, setModemPct]     = useState(0)
  const [elapsed, setElapsed]       = useState(0)
  const [btnHover, setBtnHover]     = useState(false)

  const audioRef    = useRef<HTMLAudioElement | null>(null)
  const txSectionRef = useRef<HTMLDivElement | null>(null)
  const modemSectionRef = useRef<HTMLDivElement | null>(null)
  const elapsedRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  // Stable session data
  const fakeTxs = useMemo(() => {
    if (!_sessionFakeTxs) _sessionFakeTxs = generateFakeTxs()
    return _sessionFakeTxs
  }, [])

  const caseNum = useMemo(() => {
    if (!_sessionCaseNum) _sessionCaseNum = generateCaseNum()
    return _sessionCaseNum
  }, [])

  function setPhase(p: Phase) {
    _sessionPhase = p
    setPhaseState(p)
  }

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    if (elapsedRef.current) {
      clearInterval(elapsedRef.current)
      elapsedRef.current = null
    }
  }

  // Stop audio on unmount / page navigation
  useEffect(() => {
    return () => stopAudio()
  }, [])

  // Scroll to transactions after KYC approval; scroll to modem when reporting starts
  useEffect(() => {
    if (phase === 'approved' && txSectionRef.current) {
      setTimeout(() => {
        txSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 200)
    }
    if (phase === 'reporting' && modemSectionRef.current) {
      setTimeout(() => {
        modemSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [phase])

  // KYC connecting animation (~2s, plays connection1.mp3)
  useEffect(() => {
    if (phase !== 'connecting') return
    // Play connection sound
    const audio = new Audio(connection1Sound)
    audio.volume = 0.9
    audio.play().catch(() => {})
    audioRef.current = audio

    const timers: ReturnType<typeof setTimeout>[] = []
    DIAL_STEPS.forEach((step, i) => {
      timers.push(setTimeout(() => {
        setDialText(step.text)
        setDialPct(step.pct)
        if (i === DIAL_STEPS.length - 1) {
          setTimeout(() => {
            stopAudio()
            setPhase('approved')
          }, 200)
        }
      }, step.ms))
    })
    return () => {
      timers.forEach(clearTimeout)
      stopAudio()
    }
  }, [phase])

  // Modem upload animation (~28s, plays dailup.mp3)
  useEffect(() => {
    if (phase !== 'reporting') return
    setElapsed(0)

    const audio = new Audio(dailupSound)
    audio.volume = 0.85
    audio.play().catch(() => {})
    audioRef.current = audio

    // Elapsed timer
    elapsedRef.current = setInterval(() => setElapsed(s => s + 1), 1000)

    const timers: ReturnType<typeof setTimeout>[] = []
    MODEM_STEPS.forEach((step, i) => {
      timers.push(setTimeout(() => {
        setModemText(step.text)
        setModemPct(step.pct)
        if (i === MODEM_STEPS.length - 1) {
          setTimeout(() => {
            stopAudio()
            setPhase('done')
            const tada = new Audio(tadaSound)
            tada.volume = 0.6
            tada.play().catch(() => {})
          }, 300)
        }
      }, step.ms))
    })
    return () => {
      timers.forEach(clearTimeout)
      stopAudio()
    }
  }, [phase])

  function handleSubmitKyc() {
    if (!firstName.trim() || !lastName.trim() || !address.trim() || !fundsSource) {
      setFormError('All fields are required.')
      setShakeForm(true)
      setTimeout(() => setShakeForm(false), 500)
      return
    }
    setFormError('')
    setPhase('connecting')
  }

  function handleCancel() {
    stopAudio()
    setModemPct(0)
    setModemText(MODEM_STEPS[0].text)
    setElapsed(0)
    setPhase('approved')
  }

  const navItems = [
    { id: 'file',       label: 'File' },
    { id: 'pay',        label: 'Pay' },
    { id: 'refunds',    label: 'Refunds' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'report',     label: 'Report Fraud' },
  ]

  const showTable  = phase === 'approved' || phase === 'reporting' || phase === 'done'
  const showFooter = phase === 'approved' || phase === 'reporting' || phase === 'done'

  const fmtElapsed = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const remaining = Math.max(0, 26 - elapsed)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: '820px', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 32px rgba(0,0,0,0.45)', border: `1px solid ${BORDER}`, fontFamily: sans }}
    >

      {/* ── TOP HEADER BAR ──────────────────────────────────────────── */}
      <div style={{ background: NAVY, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px', borderBottom: `3px solid ${NAVY2}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: WHITE, borderRadius: '4px', padding: '3px 5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={irsLogo} alt="IRS" style={{ height: '34px', width: '34px', objectFit: 'contain', display: 'block' }} />
          </div>
          <div style={{ color: WHITE, fontWeight: 400, fontSize: '12px', letterSpacing: '0.04em' }}>
            Internal Revenue Service
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {['Help', 'News'].map((l, idx, arr) => (
            <span key={l} style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px', cursor: 'pointer', letterSpacing: '0.02em', borderRight: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none', paddingRight: idx < arr.length - 1 ? '20px' : '0' }}>{l}</span>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '4px', padding: '3px 9px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 5px #4ade80' }} />
            <span style={{ color: '#4ade80', fontSize: '10px', fontFamily: mono, fontWeight: 700, letterSpacing: '0.1em' }}>COMPLIANT</span>
          </div>
        </div>
      </div>

      {/* ── SECONDARY NAV BAR ───────────────────────────────────────── */}
      <div style={{ background: NAVY2, padding: '0 20px', display: 'flex', alignItems: 'stretch', gap: '2px', height: '42px' }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setActiveNav(item.id)} style={{ background: activeNav === item.id ? WHITE : 'transparent', color: activeNav === item.id ? NAVY : 'rgba(255,255,255,0.85)', border: 'none', padding: '0 16px', fontSize: '13px', fontWeight: activeNav === item.id ? 700 : 500, fontFamily: sans, cursor: 'pointer', letterSpacing: '0.01em', borderTop: activeNav === item.id ? `3px solid ${BLUE}` : '3px solid transparent', transition: 'all 0.12s' }}>
            {item.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input readOnly placeholder="FILE TAXES" style={{ background: WHITE, border: 'none', borderRadius: '3px', padding: '5px 10px', fontSize: '12px', color: MUTED, fontFamily: sans, width: '160px', outline: 'none' }} />
          <div style={{ background: BLUE, borderRadius: '3px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
        </div>
      </div>

      {/* ── ALERT BANNER ────────────────────────────────────────────── */}
      <div style={{ background: BANNER, borderLeft: `4px solid ${BLUE}`, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: WHITE, fontSize: '11px', fontWeight: 900 }}>i</span>
        </div>
        <span style={{ fontSize: '13px', color: BLACK }}>
          <strong>Monero Compliance Module</strong> is active.{' '}
          <span style={{ color: BLUE, cursor: 'pointer', textDecoration: 'underline' }}>Learn about voluntary XMR disclosure obligations.</span>
        </span>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
      <div style={{ background: WHITE, padding: '28px 24px 20px', borderBottom: `1px solid ${BORDER}` }}>
        {/* Page heading */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h1 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: 700, color: BLACK, fontFamily: sans, letterSpacing: '-0.01em', lineHeight: 1.2 }}>Monero Compliance Terminal</h1>
            <p style={{ margin: 0, fontSize: '14px', color: MUTED, fontFamily: sans }}>Form XMR-1099 · Voluntary Disclosure Interface · Tax Year 2025</p>
          </div>
          <div style={{ background: OFFWHT, border: `1px solid ${BORDER}`, borderRadius: '6px', padding: '10px 16px', textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: '10px', color: MUTED, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: mono, marginBottom: '4px' }}>FILING DEADLINE</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: NAVY, fontFamily: sans }}>Apr 15, 2026</div>
            <div style={{ fontSize: '10px', color: MUTED, fontFamily: sans, marginTop: '2px' }}>
              {Math.ceil((new Date('2026-04-15').getTime() - Date.now()) / 86400000)} days remaining
            </div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${BORDER}`, margin: '0 0 20px' }} />

        {/* ── KYC SECTION ─────────────────────────────────────────── */}

        {/* Phase: form */}
        {phase === 'form' && (
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: '6px', padding: '24px', background: WHITE, animation: shakeForm ? 'irs-shake 0.4s ease' : undefined }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: NAVY, fontFamily: sans }}>KYC — Know Your Customer</div>
                <div style={{ fontSize: '12px', color: MUTED, fontFamily: sans, marginTop: '2px' }}>Required · FinCEN Directive 31 CFR § 1022.210</div>
              </div>
              <div style={{ background: '#fde8d8', border: '1px solid #f5c6a0', borderRadius: '3px', padding: '3px 8px', fontSize: '10px', fontWeight: 700, fontFamily: mono, color: '#8b4513', letterSpacing: '0.08em' }}>REQUIRED</div>
            </div>
            <p style={{ fontSize: '12px', color: MUTED, fontFamily: sans, fontStyle: 'italic', margin: '12px 0 20px', lineHeight: 1.6 }}>
              The Bond's-Based Monero Wallet is the most ethical, law-abiding, and tax-compliant wallet ever conceived by human beings. The IRS sincerely thanks you for your cooperation and honesty.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: BLACK, marginBottom: '4px', fontFamily: sans }}>First Name <span style={{ color: '#d00' }}>*</span></label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${BORDER}`, borderRadius: '3px', padding: '8px 10px', fontSize: '13px', fontFamily: sans, color: BLACK, background: WHITE, outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: BLACK, marginBottom: '4px', fontFamily: sans }}>Last Name <span style={{ color: '#d00' }}>*</span></label>
                <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Taxpayer" style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${BORDER}`, borderRadius: '3px', padding: '8px 10px', fontSize: '13px', fontFamily: sans, color: BLACK, background: WHITE, outline: 'none' }} />
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: BLACK, marginBottom: '4px', fontFamily: sans }}>Home Address <span style={{ color: '#d00' }}>*</span></label>
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, Springfield, IL 62701" style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${BORDER}`, borderRadius: '3px', padding: '8px 10px', fontSize: '13px', fontFamily: sans, color: BLACK, background: WHITE, outline: 'none' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: BLACK, marginBottom: '4px', fontFamily: sans }}>Source of Funds <span style={{ color: '#d00' }}>*</span></label>
              <select value={fundsSource} onChange={e => setFundsSource(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${BORDER}`, borderRadius: '3px', padding: '8px 10px', fontSize: '13px', fontFamily: sans, color: fundsSource ? BLACK : MUTED, background: WHITE, outline: 'none', cursor: 'pointer' }}>
                <option value="" disabled>Select source of funds...</option>
                <option value="employment">Employment</option>
                <option value="savings">Savings</option>
                <option value="onlyfans">OnlyFans</option>
                <option value="allowance">Allowance from my mom</option>
              </select>
            </div>
            {formError && <div style={{ fontSize: '12px', color: '#cc0000', fontFamily: sans, marginBottom: '12px', fontWeight: 600 }}>⚠ {formError}</div>}
            <button onClick={handleSubmitKyc} style={{ width: '100%', background: NAVY, border: 'none', color: WHITE, fontFamily: sans, fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em', padding: '13px 24px', borderRadius: '4px', cursor: 'pointer', transition: 'background 0.15s', boxShadow: '0 2px 8px rgba(0,48,135,0.35)' }} onMouseEnter={e => (e.currentTarget.style.background = '#00205b')} onMouseLeave={e => (e.currentTarget.style.background = NAVY)}>
              Submit KYC Information
            </button>
          </div>
        )}

        {/* Phase: connecting — Win95 identity verification dialog */}
        {phase === 'connecting' && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
            <div style={{ width: '400px', border: '2px solid', borderColor: '#dfdfdf #808080 #808080 #dfdfdf', boxShadow: '1px 1px 0 #000, inset 1px 1px 0 #ffffff' }}>
              {/* Win95 title bar */}
              <div style={{ background: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)', padding: '3px 4px 3px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '14px', height: '14px', background: '#c0c0c0', border: '1px solid #808080', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}>🖥</div>
                  <span style={{ color: WHITE, fontSize: '11px', fontFamily: "'Arial', sans-serif", fontWeight: 700 }}>Verifying Identity — FILE TAXES</span>
                </div>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {['_', '□', '×'].map(c => (
                    <div key={c} style={{ width: '16px', height: '14px', background: '#c0c0c0', border: '1px solid', borderColor: '#ffffff #808080 #808080 #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900, cursor: 'default', color: BLACK, fontFamily: "'Arial', sans-serif" }}>{c}</div>
                  ))}
                </div>
              </div>
              {/* Body */}
              <div style={{ background: '#c0c0c0', padding: '16px 20px 20px' }}>
                <ConnectingGlobe />
                <div style={{ fontSize: '12px', fontFamily: "'Arial', sans-serif", color: BLACK, textAlign: 'center', marginBottom: '12px', minHeight: '16px', fontWeight: 600 }}>
                  {dialText}
                </div>
                <Win95Progress pct={dialPct} />
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '14px' }}>
                  <button style={{ background: '#c0c0c0', border: '2px solid', borderColor: '#dfdfdf #808080 #808080 #dfdfdf', padding: '3px 20px', fontSize: '11px', fontFamily: "'Arial', sans-serif", color: '#808080', cursor: 'default', minWidth: '72px', boxShadow: 'inset 1px 1px 0 #ffffff' }}>
                    Please wait...
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase: approved/reporting/done — KYC success banner */}
        {(phase === 'approved' || phase === 'reporting' || phase === 'done') && (
          <div style={{ background: '#d4edda', borderLeft: '4px solid #1a7a3f', borderRadius: '0 4px 4px 0', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#1a7a3f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
              <span style={{ color: WHITE, fontSize: '13px', fontWeight: 900 }}>✓</span>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0d4920', fontFamily: sans }}>KYC VERIFICATION COMPLETE</div>
              <div style={{ fontSize: '12px', color: '#1a7a3f', fontFamily: sans, marginTop: '2px' }}>Your identity has been verified and permanently recorded. Monero transaction disclosure is unlocked.</div>
            </div>
          </div>
        )}
      </div>

      {/* ── MODEM UPLOAD DIALOG (reporting phase) — shown above table ── */}
      {phase === 'reporting' && (
        <div ref={modemSectionRef} style={{ background: OFFWHT, padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '460px', border: '2px solid', borderColor: '#dfdfdf #808080 #808080 #dfdfdf', boxShadow: '1px 1px 0 #000, inset 1px 1px 0 #ffffff' }}>
            {/* Title bar */}
            <div style={{ background: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)', padding: '3px 4px 3px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '14px', height: '14px', background: '#c0c0c0', border: '1px solid #808080', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}>📡</div>
                <span style={{ color: WHITE, fontSize: '11px', fontFamily: "'Arial', sans-serif", fontWeight: 700 }}>IRS Secure Modem Upload</span>
              </div>
              <div style={{ display: 'flex', gap: '2px' }}>
                {['_', '□'].map(c => (
                  <div key={c} style={{ width: '16px', height: '14px', background: '#c0c0c0', border: '1px solid', borderColor: '#ffffff #808080 #808080 #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900, cursor: 'default', color: BLACK, fontFamily: "'Arial', sans-serif" }}>{c}</div>
                ))}
              </div>
            </div>
            {/* Body */}
            <div style={{ background: '#c0c0c0', padding: '12px 16px 16px' }}>
              <DialupBanner />
              <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                <div style={{ flex: 1, background: WHITE, border: '2px solid', borderColor: '#808080 #dfdfdf #dfdfdf #808080', padding: '5px 8px', fontSize: '11px', fontFamily: "'Courier New', monospace", color: BLACK }}>
                  <div>Speed: <span style={{ color: '#000080', fontWeight: 700 }}>56,000 bps</span></div>
                  <div>Protocol: <span style={{ color: '#000080' }}>V.90</span></div>
                  <div>Server: <span style={{ color: '#000080' }}>irs.gov:443</span></div>
                  <div>Bytes: <span style={{ color: '#000080', fontWeight: 700 }}>{Math.floor(modemPct * 327.68).toLocaleString()}</span> / 32,768</div>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <div style={{ fontSize: '11px', fontFamily: "'Arial', sans-serif", color: BLACK, minHeight: '14px' }}>
                    {modemText}
                  </div>
                </div>
              </div>
              <Win95Progress pct={modemPct} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', fontFamily: "'Arial', sans-serif", color: '#444' }}>
                <span>Elapsed: {fmtElapsed(elapsed)}</span>
                <span>{modemPct}%</span>
                <span>Remaining: ~{fmtElapsed(remaining)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '14px' }}>
                <button
                  onClick={handleCancel}
                  style={{ background: '#c0c0c0', border: '2px solid', borderColor: '#dfdfdf #808080 #808080 #dfdfdf', padding: '4px 20px', fontSize: '12px', fontFamily: "'Arial', sans-serif", color: BLACK, cursor: 'pointer', minWidth: '80px', boxShadow: 'inset 1px 1px 0 #ffffff', fontWeight: 700 }}
                  onMouseDown={e => { e.currentTarget.style.borderColor = '#808080 #dfdfdf #dfdfdf #808080'; e.currentTarget.style.boxShadow = 'none' }}
                  onMouseUp={e => { e.currentTarget.style.borderColor = '#dfdfdf #808080 #808080 #dfdfdf'; e.currentTarget.style.boxShadow = 'inset 1px 1px 0 #ffffff' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { stopAudio(); navigate('/dashboard') }}
                  style={{ background: '#c0c0c0', border: '2px solid', borderColor: '#dfdfdf #808080 #808080 #dfdfdf', padding: '4px 20px', fontSize: '12px', fontFamily: "'Arial', sans-serif", color: '#888', cursor: 'pointer', minWidth: '80px', boxShadow: 'inset 1px 1px 0 #ffffff' }}
                >
                  Hide
                </button>
              </div>
              <div style={{ fontSize: '10px', color: '#666', fontFamily: "'Arial', sans-serif", textAlign: 'center', marginTop: '8px' }}>
                ⚠ DO NOT close this window. Interrupting transmission may result in audit.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TRANSACTION TABLE ────────────────────────────────────────── */}
      {showTable && (
        <div ref={txSectionRef} style={{ background: WHITE, padding: '0 24px 20px', borderBottom: `1px solid ${BORDER}` }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: BLACK, margin: '0 0 12px', fontFamily: sans, paddingTop: '20px', borderTop: `3px solid ${NAVY}` }}>
            Reportable Transactions
            <span style={{ fontSize: '12px', color: MUTED, fontWeight: 400, marginLeft: '8px' }}>Most recent 3</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '48px 72px 1fr 1fr', gap: '12px', padding: '7px 12px', background: NAVY, borderRadius: '4px 4px 0 0' }}>
            {['#', 'TYPE', 'AMOUNT (XMR)', 'DATE / TIME'].map(h => (
              <span key={h} style={{ fontSize: '11px', color: WHITE, fontFamily: sans, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</span>
            ))}
          </div>
          {fakeTxs.map((tx, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '48px 72px 1fr 1fr', gap: '12px', padding: '11px 12px', background: i % 2 === 0 ? WHITE : OFFWHT, borderBottom: `1px solid ${BORDER}`, alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: MUTED, fontFamily: mono }}>{i + 1}</span>
              <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: sans, letterSpacing: '0.04em', textTransform: 'uppercase', color: tx.isIncoming ? '#1a7a3f' : '#8b4513', background: tx.isIncoming ? '#d4edda' : '#fde8d8', border: `1px solid ${tx.isIncoming ? '#a3d9b1' : '#f5c6a0'}`, padding: '2px 8px', borderRadius: '3px', display: 'inline-block' }}>
                {tx.isIncoming ? 'RECV' : 'SENT'}
              </span>
              <span style={{ fontSize: '14px', color: BLACK, fontFamily: mono, fontWeight: 600 }}>
                {tx.amount} <span style={{ fontSize: '11px', color: MUTED, fontWeight: 400 }}>XMR</span>
              </span>
              <span style={{ fontSize: '12px', color: MUTED, fontFamily: sans }}>{formatTs(tx.timestamp)}</span>
            </div>
          ))}
          <div style={{ borderBottom: `3px solid ${NAVY}`, borderRadius: '0 0 4px 4px' }} />
        </div>
      )}

      {/* ── CTA FOOTER ───────────────────────────────────────────────── */}
      {showFooter && (
        <div style={{ background: OFFWHT, padding: '20px 24px' }}>

          {/* Phase: approved — report button */}
          {phase === 'approved' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <p style={{ margin: 0, fontSize: '12px', color: MUTED, fontFamily: sans, maxWidth: '480px', lineHeight: 1.6 }}>
                By clicking "Report Monero Transactions", you confirm that the information submitted is accurate and complete to the best of your knowledge. Penalties may apply for false or misleading disclosures under 26 U.S.C. § 7206.
              </p>
              <button
                onClick={() => setPhase('reporting')}
                onMouseEnter={() => setBtnHover(true)}
                onMouseLeave={() => setBtnHover(false)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, background: btnHover ? '#00205b' : NAVY, border: 'none', color: WHITE, fontFamily: sans, fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em', padding: '13px 24px', borderRadius: '4px', cursor: 'pointer', transition: 'background 0.15s', boxShadow: '0 2px 8px rgba(0,48,135,0.35)' }}
              >
                <img src={irsLogo} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain', filter: 'brightness(10)' }} />
                Report Monero Transactions
              </button>
            </div>
          )}

          {/* Phase: done — congratulations */}
          {phase === 'done' && (
            <div style={{ background: BANNER, borderLeft: `4px solid ${NAVY}`, borderRadius: '0 4px 4px 0', padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: WHITE, fontSize: '14px', fontWeight: 900 }}>✓</span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: NAVY, fontFamily: sans }}>SUBMISSION CONFIRMED — CASE #{caseNum}</div>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: '13px', color: BLACK, fontFamily: sans, lineHeight: 1.7 }}>
                Congratulations on being a completely law-abiding Monero wallet user. The IRS has received your voluntary disclosure and will be in touch shortly. Please do not flee the country.
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: MUTED, fontFamily: sans, lineHeight: 1.6 }}>
                This session is now closed. For your records, print this page and frame it on your wall.
              </p>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes irscur    { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes globeSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes irs-shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-5px)} 40%,80%{transform:translateX(5px)} }
        @keyframes modemLine { 0%{opacity:1} 50%{opacity:0.2} 100%{opacity:1} }
        @keyframes signalDot { 0%,100%{opacity:0.1;transform:scale(0.7)} 50%{opacity:1;transform:scale(1)} }
      `}</style>
    </motion.div>
  )
}
