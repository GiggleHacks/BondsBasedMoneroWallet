import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, Minus, Square, X, Plus, RotateCcw } from 'lucide-react'
import { useWalletStore } from '../store/walletStore'
import type { WalletProfile } from '@shared/types'
import mascotImg from '@/assets/davidbond2.png'

export default function Unlock() {
  const navigate = useNavigate()
  const { setWalletOpen, setAddress, setBalance, setLocked, setCurrentWalletName } = useWalletStore()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [wallets, setWallets] = useState<WalletProfile[]>([])
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)
  const [loadingWallets, setLoadingWallets] = useState(true)

  useEffect(() => {
    loadWallets()
  }, [])

  const loadWallets = async () => {
    try {
      const [list, lastWallet] = await Promise.all([
        window.api.wallet.listWallets(),
        window.api.wallet.getLastWallet(),
      ])
      setWallets(list)
      if (lastWallet && list.some(w => w.filename === lastWallet)) {
        setSelectedWallet(lastWallet)
      } else if (list.length > 0) {
        setSelectedWallet(list[0].filename)
      }
    } catch {
      // Fallback: check if wallet exists at all
      try {
        const exists = await window.api.wallet.walletExists()
        if (exists) {
          setWallets([{ filename: 'based_wallet', lastUsed: null }])
          setSelectedWallet('based_wallet')
        }
      } catch {}
    } finally {
      setLoadingWallets(false)
    }
  }

  const handleUnlock = async () => {
    if (!password || !selectedWallet) return
    setError('')
    setLoading(true)

    try {
      const info = await window.api.wallet.open(password, selectedWallet)
      setWalletOpen(true)
      setLocked(false)
      setAddress(info.primaryAddress)
      setBalance(info.balance, info.unlockedBalance)
      setCurrentWalletName(selectedWallet)

      await window.api.wallet.startSync()
      navigate('/dashboard')
    } catch (e: any) {
      setError('Incorrect password or wallet file corrupted')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: '#0a0a0a' }}>
      {/* Window controls */}
      <div className="flex items-center justify-end h-9 shrink-0 select-none"
           style={{ WebkitAppRegion: 'drag' } as any}>
        <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button onClick={() => window.api.app.minimize()} className="h-full px-4 hover:bg-white/5 transition-colors flex items-center">
            <Minus size={14} style={{ color: '#a0a0a0' }} />
          </button>
          <button onClick={() => window.api.app.maximize()} className="h-full px-4 hover:bg-white/5 transition-colors flex items-center">
            <Square size={12} style={{ color: '#a0a0a0' }} />
          </button>
          <button onClick={() => window.api.app.close()} className="h-full px-4 hover:bg-red-500 transition-colors flex items-center group">
            <X size={14} style={{ color: '#a0a0a0' }} className="group-hover:text-white" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            width: '100%',
            maxWidth: '400px',
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {/* Branding */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <img
              src={mascotImg}
              alt="Bond"
              style={{
                width: '100px',
                height: '100px',
                objectFit: 'contain',
                borderRadius: '12px',
                border: '1px solid rgba(242, 104, 34, 0.3)',
                boxShadow: '0 0 24px rgba(242, 104, 34, 0.15)',
                margin: '0 auto 14px',
                display: 'block',
              }}
            />
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f26822', letterSpacing: '0.04em' }}>
              Bond's Based
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#e0e0e0', letterSpacing: '0.04em' }}>
              Monero Wallet
            </div>
            <div style={{
              fontSize: '10px', color: '#666', letterSpacing: '0.18em',
              marginTop: '4px', textTransform: 'uppercase', fontWeight: 500,
            }}>
              for GigaChads
            </div>
          </div>

          {/* Wallet Selector */}
          <div style={{
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.02)',
            marginBottom: '16px',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '8px 14px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              fontSize: '11px',
              color: '#666',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}>
              WALLET FILES
            </div>

            {loadingWallets ? (
              <div style={{ padding: '16px', textAlign: 'center' }}>
                <Loader2 size={16} className="animate-spin" style={{ color: '#666', margin: '0 auto' }} />
              </div>
            ) : wallets.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#666', fontSize: '13px' }}>
                No wallets found
              </div>
            ) : (
              <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                {wallets.map((w) => {
                  const isSelected = selectedWallet === w.filename
                  return (
                    <button
                      key={w.filename}
                      onClick={() => { setSelectedWallet(w.filename); setError('') }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '10px 14px',
                        background: isSelected ? 'rgba(242, 104, 34, 0.08)' : 'transparent',
                        border: 'none',
                        borderLeft: isSelected ? '2px solid #f26822' : '2px solid transparent',
                        color: isSelected ? '#f26822' : '#a0a0a0',
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '13px',
                        fontWeight: isSelected ? 600 : 400,
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.12s',
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                          e.currentTarget.style.color = '#e0e0e0'
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = '#a0a0a0'
                        }
                      }}
                    >
                      <span style={{ fontWeight: 700, width: '14px', flexShrink: 0 }}>
                        {isSelected ? '>' : ' '}
                      </span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {w.filename}
                      </span>
                      {isSelected && (
                        <span style={{
                          fontSize: '9px',
                          color: '#f26822',
                          background: 'rgba(242, 104, 34, 0.12)',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          letterSpacing: '0.08em',
                          fontWeight: 600,
                        }}>
                          SELECTED
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Password Input */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              placeholder="Password"
              autoFocus
              style={{
                width: '100%',
                padding: '12px 44px 12px 14px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                color: '#e0e0e0',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(242, 104, 34, 0.5)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                padding: '2px',
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <div style={{
              color: '#ef4444',
              fontSize: '12px',
              marginBottom: '12px',
              padding: '8px 12px',
              background: 'rgba(239, 68, 68, 0.08)',
              borderRadius: '6px',
              border: '1px solid rgba(239, 68, 68, 0.15)',
            }}>
              {error}
            </div>
          )}

          {/* Unlock Button */}
          <button
            onClick={handleUnlock}
            disabled={loading || !password || !selectedWallet}
            style={{
              width: '100%',
              padding: '12px',
              background: loading || !password || !selectedWallet
                ? 'rgba(242, 104, 34, 0.3)'
                : '#f26822',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading || !password || !selectedWallet ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '20px',
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? 'Unlocking...' : '> Unlock Wallet'}
          </button>

          {/* Bottom links */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
          }}>
            <button
              onClick={() => navigate('/onboarding', { state: { addWallet: true } })}
              style={{
                background: 'none',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '6px',
                color: '#888',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                cursor: 'pointer',
                padding: '8px 14px',
                transition: 'all 0.12s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#f26822'
                e.currentTarget.style.borderColor = 'rgba(242, 104, 34, 0.3)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = '#888'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)'
              }}
            >
              <Plus size={12} /> New Wallet
            </button>
            <button
              onClick={() => navigate('/onboarding', { state: { addWallet: true, restore: true } })}
              style={{
                background: 'none',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '6px',
                color: '#888',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                cursor: 'pointer',
                padding: '8px 14px',
                transition: 'all 0.12s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#f26822'
                e.currentTarget.style.borderColor = 'rgba(242, 104, 34, 0.3)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = '#888'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)'
              }}
            >
              <RotateCcw size={12} /> Restore Seed
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
