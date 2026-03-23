import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, RotateCcw, Eye, EyeOff, Loader2, Minus, Square, X, Copy, Check, FolderOpen, Pencil, FolderSearch } from 'lucide-react'
import { useWalletStore } from '../store/walletStore'
import type { WalletProfile } from '@shared/types'
import mascotImg from '@/assets/davidbond2.png'
import MatrixRain from '../components/MatrixRain'
import { playSound } from '@/lib/playSound'
import startup4Sound from '@/assets/sounds/startup4.mp3'

type Step = 'welcome' | 'create-password' | 'show-seed' | 'restore-seed' | 'restore-password' | 'syncing'

export default function Onboarding() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setWalletOpen, setAddress, setSeed, setLoading, setLocked, setBalance, setCurrentWalletName } = useWalletStore()

  const isAddWallet = !!(location.state as any)?.addWallet
  const startRestore = !!(location.state as any)?.restore

  const [step, setStep] = useState<Step>(startRestore ? 'restore-seed' : 'welcome')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [seed, setSeedLocal] = useState('')
  const [generatedSeed, setGeneratedSeed] = useState('')
  const [restoreHeight, setRestoreHeight] = useState('')
  const [error, setError] = useState('')
  const [loading, setLocalLoading] = useState(false)
  const [mode, setMode] = useState<'create' | 'restore'>(startRestore ? 'restore' : 'create')
  const [copiedSeed, setCopiedSeed] = useState(false)
  const [walletName, setWalletName] = useState('')
  const [walletDir, setWalletDirState] = useState('')
  const [existingWallets, setExistingWallets] = useState<WalletProfile[]>([])

  // Inline unlock state
  const [selectedExisting, setSelectedExisting] = useState<string | null>(null)
  const [unlockPwd, setUnlockPwd] = useState('')
  const [showUnlockPwd, setShowUnlockPwd] = useState(false)
  const [unlockError, setUnlockError] = useState('')
  const [unlockLoading, setUnlockLoading] = useState(false)

  useEffect(() => {
    window.api.app.getWalletDir().then(setWalletDirState).catch(() => {})
    window.api.wallet.listWallets().then(setExistingWallets).catch(() => {})
  }, [])

  const handleChangeDir = async () => {
    const selected = await window.api.app.selectFolder()
    if (selected) {
      await window.api.app.setWalletDir(selected)
      setWalletDirState(selected)
      const wallets = await window.api.wallet.listWallets()
      setExistingWallets(wallets)
      setSelectedExisting(null)
      setUnlockPwd('')
    }
  }

  const handleOpenFile = async () => {
    const filePath = await window.api.app.selectFile()
    if (!filePath) return
    // Extract directory and filename (strip .keys extension)
    const sep = filePath.includes('\\') ? '\\' : '/'
    const parts = filePath.split(sep)
    const fileWithExt = parts[parts.length - 1]
    const dir = parts.slice(0, -1).join(sep)
    const name = fileWithExt.replace(/\.keys$/i, '')
    await window.api.app.setWalletDir(dir)
    setWalletDirState(dir)
    const wallets = await window.api.wallet.listWallets()
    setExistingWallets(wallets)
    setSelectedExisting(name)
    setUnlockPwd('')
    setUnlockError('')
  }

  const handleInlineUnlock = async () => {
    if (!unlockPwd || !selectedExisting) return
    setUnlockError('')
    setUnlockLoading(true)
    try {
      const info = await window.api.wallet.open(unlockPwd, selectedExisting)
      setWalletOpen(true)
      setLocked(false)
      setAddress(info.primaryAddress)
      setBalance(info.balance, info.unlockedBalance)
      setCurrentWalletName(selectedExisting)
      await window.api.wallet.startSync()
      playSound(startup4Sound, 'startup', 0.8)
      navigate('/dashboard')
    } catch {
      setUnlockError('Incorrect password')
    } finally {
      setUnlockLoading(false)
    }
  }

  // Typewriter effect for welcome screen
  const line1 = isAddWallet ? 'ADD WALLET' : "BOND'S BASED"
  const line2 = isAddWallet ? '' : 'MONERO WALLET'
  const line3 = isAddWallet ? 'CREATE OR RESTORE A WALLET' : 'The Monero Wallet for Extremely Law-Abiding\nTax-Compliant Individuals'
  const fullText = [line1, line2, line3].filter(Boolean).join('\n')

  const [typedText, setTypedText] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const typeIndexRef = useRef(0)
  const typingDoneRef = useRef(false)

  // Disclaimer typewriter
  const disclaimer = 'The Monero Wallet For Completely Ordinary, Totally Non-Criminal, Fully Tax-Compliant Adults Who Have Absolutely Nothing to Hide, Carefully Document Every Transaction, Diligently Report All Income to the Proper Authorities, and Would Never Even Consider Money Laundering.'
  const [typedDisclaimer, setTypedDisclaimer] = useState('')
  const disclaimerIndexRef = useRef(0)
  const disclaimerDoneRef = useRef(false)

  useEffect(() => {
    if (step !== 'welcome') return
    setTypedText('')
    typeIndexRef.current = 0
    typingDoneRef.current = false

    const interval = setInterval(() => {
      if (typeIndexRef.current < fullText.length) {
        typeIndexRef.current++
        setTypedText(fullText.slice(0, typeIndexRef.current))
      } else {
        typingDoneRef.current = true
        clearInterval(interval)
      }
    }, 45)

    return () => clearInterval(interval)
  }, [step])

  // Start disclaimer typing after a short delay (feels like a second boot message)
  useEffect(() => {
    if (step !== 'welcome') return
    setTypedDisclaimer('')
    disclaimerIndexRef.current = 0
    disclaimerDoneRef.current = false

    let intervalId: ReturnType<typeof setInterval> | null = null
    const delay = setTimeout(() => {
      intervalId = setInterval(() => {
        if (disclaimerIndexRef.current < disclaimer.length) {
          disclaimerIndexRef.current++
          setTypedDisclaimer(disclaimer.slice(0, disclaimerIndexRef.current))
        } else {
          disclaimerDoneRef.current = true
          if (intervalId) clearInterval(intervalId)
        }
      }, 18) // fast DOS-style typing
    }, 400)

    return () => {
      clearTimeout(delay)
      if (intervalId) clearInterval(intervalId)
    }
  }, [step])

  useEffect(() => {
    const blink = setInterval(() => setShowCursor(c => !c), 530)
    return () => clearInterval(blink)
  }, [])

  const typedLines = typedText.split('\n')

  const sanitizeWalletName = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_{2,}/g, '_').replace(/^_|_$/g, '')
  }

  const handleCreate = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setError('')
    setLocalLoading(true)

    try {
      const effectiveName = walletName ? sanitizeWalletName(walletName) : undefined
      const result = await window.api.wallet.create(password, effectiveName)
      setGeneratedSeed(result.seed)
      setAddress(result.primaryAddress)
      setSeed(result.seed)
      setStep('show-seed')
    } catch (e: any) {
      setError(e.message || 'Failed to create wallet')
    } finally {
      setLocalLoading(false)
    }
  }

  const handleRestoreSeedNext = () => {
    const words = seed.trim().split(/\s+/)
    if (words.length !== 25) {
      setError('Seed must be exactly 25 words')
      return
    }
    setError('')
    setStep('restore-password')
  }

  const handleRestoreSubmit = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setError('')
    setLocalLoading(true)

    try {
      const height = restoreHeight ? parseInt(restoreHeight) : 0
      const effectiveName = walletName ? sanitizeWalletName(walletName) : undefined
      await window.api.wallet.restore(seed.trim(), password, height, effectiveName)
      finishSetup()
    } catch (e: any) {
      setError(e.message || 'Failed to restore wallet')
      setLocalLoading(false)
    }
  }

  const finishSetup = async () => {
    setStep('syncing')
    try {
      await window.api.wallet.startSync()
      setWalletOpen(true)
      setLoading(false)
      navigate('/dashboard')
    } catch (e: any) {
      // Even if sync fails initially, go to dashboard
      setWalletOpen(true)
      navigate('/dashboard')
    }
  }

  const copySeed = () => {
    navigator.clipboard.writeText(generatedSeed)
    setCopiedSeed(true)
    setTimeout(() => setCopiedSeed(false), 2000)
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: 'transparent', position: 'relative', overflow: 'hidden' }}>
      {/* Matrix rain background */}
      <MatrixRain />

      {/* Window controls */}
      <div className="flex items-center justify-end h-9 shrink-0 select-none"
           style={{ WebkitAppRegion: 'drag', position: 'relative', zIndex: 1 } as any}>
        <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button onClick={() => window.api.app.minimize()} className="h-full px-4 hover:bg-white/5 transition-colors flex items-center">
            <Minus size={14} className="text-text-secondary" />
          </button>
          <button onClick={() => window.api.app.maximize()} className="h-full px-4 hover:bg-white/5 transition-colors flex items-center">
            <Square size={12} className="text-text-secondary" />
          </button>
          <button onClick={() => window.api.app.close()} className="h-full px-4 hover:bg-red-500 transition-colors flex items-center group">
            <X size={14} className="text-text-secondary group-hover:text-white" />
          </button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8" style={{ position: 'relative', zIndex: 1, overflowY: 'auto', alignItems: 'flex-start', paddingTop: '2vh' }}>
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg"
      >
        {step === 'welcome' && (
          <div className="space-y-4">
            {/* Big centred mascot */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 180, damping: 18 }}
              >
                <img
                  src={mascotImg}
                  alt="Bond"
                  style={{
                    width: 'clamp(140px, 22vh, 220px)',
                    height: 'clamp(140px, 22vh, 220px)',
                    objectFit: 'cover',
                    objectPosition: 'center top',
                    borderRadius: '20px',
                    border: '2px solid rgba(242, 104, 34, 0.5)',
                    boxShadow: '0 0 60px rgba(242, 104, 34, 0.25), 0 0 120px rgba(242, 104, 34, 0.08)',
                    display: 'block',
                  }}
                />
              </motion.div>
            </div>

            {/* Title below the image, centred — fixed height to prevent mascot shift */}
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", textAlign: 'center', minHeight: '9rem' }}>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 700, letterSpacing: '0.06em', color: '#f0f0f0', marginBottom: '4px', lineHeight: 1.15 }}>
                {typedLines[0] ?? ''}
                {typedLines.length <= 1 && (
                  <span style={{ opacity: showCursor ? 1 : 0, color: '#f26822' }}>█</span>
                )}
              </h1>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 700, letterSpacing: '0.06em', color: '#f26822', marginBottom: '2px', lineHeight: 1.15, visibility: typedLines.length > 1 ? 'visible' : 'hidden' }}>
                {typedLines[1] ?? '\u00a0'}
                {typedLines.length === 2 && (
                  <span style={{ opacity: showCursor ? 1 : 0, color: '#f26822' }}>█</span>
                )}
              </h2>
              <p style={{ fontSize: '0.85rem', letterSpacing: '0.14em', color: '#ffffff', marginTop: '6px', whiteSpace: 'pre-line', visibility: typedLines.length > 2 ? 'visible' : 'hidden' }}>
                {[typedLines[2], typedLines[3]].filter(Boolean).join('\n') || '\u00a0'}
                {typedLines.length > 2 && (
                  <span style={{ opacity: showCursor ? 1 : 0, color: '#f26822' }}>█</span>
                )}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => { setMode('create'); setStep('create-password') }}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Create New Wallet
              </button>
              <button
                onClick={() => { setMode('restore'); setStep('restore-seed') }}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <RotateCcw size={18} />
                Restore From Seed
              </button>
            </div>

            {isAddWallet && (
              <button
                onClick={() => navigate('/unlock')}
                className="btn-secondary w-full"
              >
                Back to Unlock
              </button>
            )}

            {/* Existing Wallet Files */}
            {existingWallets.length > 0 && (
              <div style={{
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.02)',
                textAlign: 'left',
                overflow: 'hidden',
              }}>
                {/* Header row with Open button */}
                <div style={{
                  padding: '8px 14px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  fontSize: '11px',
                  color: '#888',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <span>EXISTING WALLETS</span>
                  <button
                    onClick={handleOpenFile}
                    title="Open wallet file from any location"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      background: 'rgba(242,104,34,0.08)',
                      border: '1px solid rgba(242,104,34,0.2)',
                      borderRadius: '4px',
                      color: '#f26822',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '10px',
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      padding: '3px 8px',
                      cursor: 'pointer',
                      transition: 'all 0.12s',
                      textTransform: 'uppercase',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(242,104,34,0.16)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(242,104,34,0.08)' }}
                  >
                    <FolderSearch size={11} />
                    Open
                  </button>
                </div>

                {/* Wallet list */}
                <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                  {existingWallets.map((w) => {
                    const isSelected = selectedExisting === w.filename
                    return (
                      <button
                        key={w.filename}
                        onClick={() => {
                          setSelectedExisting(isSelected ? null : w.filename)
                          setUnlockPwd('')
                          setUnlockError('')
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%',
                          padding: '8px 14px',
                          background: isSelected ? 'rgba(242, 104, 34, 0.08)' : 'transparent',
                          border: 'none',
                          borderLeft: isSelected ? '2px solid #f26822' : '2px solid transparent',
                          color: isSelected ? '#f26822' : '#b0b0b0',
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '13px',
                          fontWeight: isSelected ? 600 : 400,
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.12s',
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'rgba(242, 104, 34, 0.06)'
                            e.currentTarget.style.borderLeftColor = '#555'
                            e.currentTarget.style.color = '#e0e0e0'
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.borderLeftColor = 'transparent'
                            e.currentTarget.style.color = '#b0b0b0'
                          }
                        }}
                      >
                        <span style={{ color: '#f26822', fontWeight: 700, width: '14px', flexShrink: 0 }}>
                          {isSelected ? '>' : ' '}
                        </span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {w.filename}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Inline password panel — slides in when a wallet is selected */}
                <AnimatePresence>
                  {selectedExisting && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Password input */}
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showUnlockPwd ? 'text' : 'password'}
                            value={unlockPwd}
                            onChange={e => { setUnlockPwd(e.target.value); setUnlockError('') }}
                            onKeyDown={e => e.key === 'Enter' && handleInlineUnlock()}
                            placeholder="Password"
                            autoFocus
                            style={{
                              width: '100%',
                              padding: '9px 38px 9px 12px',
                              background: 'rgba(255,255,255,0.04)',
                              border: unlockError
                                ? '1px solid rgba(239,68,68,0.5)'
                                : '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '6px',
                              color: '#e0e0e0',
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '13px',
                              outline: 'none',
                              transition: 'border-color 0.15s',
                              boxSizing: 'border-box',
                            }}
                            onFocus={e => { if (!unlockError) e.currentTarget.style.borderColor = 'rgba(242,104,34,0.5)' }}
                            onBlur={e => { if (!unlockError) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
                          />
                          <button
                            onClick={() => setShowUnlockPwd(v => !v)}
                            style={{
                              position: 'absolute', right: '10px', top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none', border: 'none',
                              color: '#666', cursor: 'pointer', padding: '2px',
                            }}
                          >
                            {showUnlockPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>

                        {unlockError && (
                          <div style={{
                            fontSize: '11px', color: '#ef4444',
                            padding: '5px 9px',
                            background: 'rgba(239,68,68,0.08)',
                            borderRadius: '4px',
                            border: '1px solid rgba(239,68,68,0.15)',
                          }}>
                            {unlockError}
                          </div>
                        )}

                        {/* Unlock + Cancel row */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={handleInlineUnlock}
                            disabled={unlockLoading || !unlockPwd}
                            style={{
                              flex: 1,
                              padding: '9px',
                              background: unlockLoading || !unlockPwd ? 'rgba(242,104,34,0.3)' : '#f26822',
                              border: 'none',
                              borderRadius: '6px',
                              color: '#fff',
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: unlockLoading || !unlockPwd ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              transition: 'background 0.12s',
                            }}
                          >
                            {unlockLoading
                              ? <><Loader2 size={13} className="animate-spin" /> Unlocking...</>
                              : '> Unlock Wallet'
                            }
                          </button>
                          <button
                            onClick={() => { setSelectedExisting(null); setUnlockPwd(''); setUnlockError('') }}
                            style={{
                              padding: '9px 14px',
                              background: 'transparent',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '6px',
                              color: '#666',
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.12s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#e0e0e0'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#666'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Wallet Directory */}
            {walletDir && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '6px',
              }}>
                <button
                  onClick={() => window.api.app.openFolder(walletDir)}
                  title="Open wallet folder"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#f26822',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    flexShrink: 0,
                  }}
                >
                  <FolderOpen size={14} />
                </button>
                <code style={{
                  fontSize: '11px',
                  color: '#888',
                  fontFamily: "'IBM Plex Mono', monospace",
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  textAlign: 'left',
                }}>
                  {walletDir}
                </code>
                <button
                  onClick={handleChangeDir}
                  title="Change wallet directory"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#666',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#f26822'}
                  onMouseLeave={e => e.currentTarget.style.color = '#666'}
                >
                  <Pencil size={12} />
                </button>
              </div>
            )}

            {/* MS-DOS style disclaimer typewriter */}
            <div style={{
              width: 'min(680px, 88vw)',
              marginLeft: 'calc(50% - min(340px, 44vw))',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '12px',
              lineHeight: 1.7,
              color: 'rgba(230, 230, 220, 0.92)',
              background: 'rgba(0,0,0,0.45)',
              border: '1px solid rgba(242,104,34,0.18)',
              borderRadius: '4px',
              padding: '10px 14px',
              letterSpacing: '0.01em',
              minHeight: '92px', // reserve full height so layout never shifts while typing
            }}>
              <span style={{ color: '#f26822', marginRight: '6px', userSelect: 'none' }}>C:\&gt;</span>
              {typedDisclaimer}
              {!disclaimerDoneRef.current && (
                <span style={{ opacity: showCursor ? 1 : 0, color: '#f26822' }}>█</span>
              )}
            </div>
          </div>
        )}

        {step === 'create-password' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Set Your Password</h2>
              <p className="text-text-secondary text-sm">
                This password encrypts your wallet file locally.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-text-secondary mb-1 block">
                  Wallet Name (optional)
                </label>
                <input
                  type="text"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  placeholder="e.g. my_savings"
                  className="input-field"
                />
                <p className="text-xs text-text-muted mt-1">
                  Lowercase, alphanumeric & underscores. Leave blank for auto-generated name.
                </p>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="input-field pr-12"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="input-field"
              />

              {/* Password strength indicator */}
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(level => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      password.length >= level * 3
                        ? level <= 2 ? 'bg-status-error' : level === 3 ? 'bg-status-warning' : 'bg-status-success'
                        : 'bg-bg-surface'
                    }`}
                  />
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-status-error">{error}</p>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep('welcome')} className="btn-secondary flex-1">
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                {loading ? 'Creating...' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {step === 'show-seed' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Your Recovery Seed</h2>
              <p className="text-text-secondary text-sm">
                Write these 25 words down and store them safely. This is the ONLY way to recover your wallet.
              </p>
            </div>

            <div className="glass-card p-4">
              <div className="grid grid-cols-5 gap-2">
                {generatedSeed.split(' ').map((word, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-sm">
                    <span className="text-text-muted text-xs w-4 text-right">{i + 1}</span>
                    <span className="font-mono text-text-primary">{word}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={copySeed}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              {copiedSeed ? <Check size={16} className="text-status-success" /> : <Copy size={16} />}
              {copiedSeed ? 'Copied to Clipboard!' : 'Copy Seed Phrase'}
            </button>

            <div className="bg-status-warning/10 border border-status-warning/30 rounded-lg p-3">
              <p className="text-sm text-status-warning">
                Never share your seed with anyone. Anyone with these words has full access to your funds.
              </p>
            </div>

            <button
              onClick={finishSetup}
              className="btn-primary w-full"
            >
              I've Written It Down — Let's Go
            </button>
          </div>
        )}

        {/* Restore flow: Step 1 - Enter seed first */}
        {step === 'restore-seed' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Enter Recovery Seed</h2>
              <p className="text-text-secondary text-sm">
                Enter your 25-word mnemonic seed phrase.
              </p>
            </div>

            <textarea
              value={seed}
              onChange={(e) => setSeedLocal(e.target.value)}
              placeholder="Enter your 25-word seed phrase..."
              className="input-field h-32 resize-none font-mono text-sm"
              autoFocus
            />

            <div>
              <label className="text-sm text-text-secondary mb-1 block">
                Restore Height (optional)
              </label>
              <input
                type="number"
                value={restoreHeight}
                onChange={(e) => setRestoreHeight(e.target.value)}
                placeholder="Block height or leave empty for full scan"
                className="input-field"
              />
              <p className="text-xs text-text-muted mt-1">
                If you know when you created your wallet, enter the block height to speed up syncing.
              </p>
            </div>

            {error && (
              <p className="text-sm text-status-error">{error}</p>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setStep('welcome'); setError('') }} className="btn-secondary flex-1">
                Back
              </button>
              <button
                onClick={handleRestoreSeedNext}
                className="btn-primary flex-1"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Restore flow: Step 2 - Set password */}
        {step === 'restore-password' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Set Wallet Password</h2>
              <p className="text-text-secondary text-sm">
                This password encrypts your wallet file locally.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-text-secondary mb-1 block">
                  Wallet Name (optional)
                </label>
                <input
                  type="text"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  placeholder="e.g. restored_wallet"
                  className="input-field"
                />
                <p className="text-xs text-text-muted mt-1">
                  Lowercase, alphanumeric & underscores. Leave blank for auto-generated name.
                </p>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="input-field pr-12"
                  autoFocus
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="input-field"
              />

              {/* Password strength indicator */}
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(level => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      password.length >= level * 3
                        ? level <= 2 ? 'bg-status-error' : level === 3 ? 'bg-status-warning' : 'bg-status-success'
                        : 'bg-bg-surface'
                    }`}
                  />
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-status-error">{error}</p>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setStep('restore-seed'); setError('') }} className="btn-secondary flex-1">
                Back
              </button>
              <button
                onClick={handleRestoreSubmit}
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                {loading ? 'Restoring...' : 'Restore Wallet'}
              </button>
            </div>
          </div>
        )}

        {step === 'syncing' && (
          <div className="text-center space-y-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="mx-auto w-16 h-16 rounded-full border-4 border-bg-surface border-t-accent-primary"
            />
            <div>
              <h2 className="text-2xl font-bold mb-2">Syncing Wallet</h2>
              <p className="text-text-secondary text-sm">
                Connecting to the Monero network...
              </p>
            </div>
          </div>
        )}
      </motion.div>
      </div>
    </div>
  )
}
