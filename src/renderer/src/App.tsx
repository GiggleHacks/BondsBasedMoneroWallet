import { useEffect, useState, useRef, useCallback } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AnimatePresence } from 'framer-motion'
import startupSound from '@/assets/sounds/startup3.mp3'
import clickySound from '@/assets/sounds/clicky2.mp3'
import moneySound from '@/assets/sounds/money.mp3'
import { playSound } from '@/lib/playSound'
import { AUTO_LOCK_TIMEOUT } from '@shared/constants'

import AppLayout from './components/layout/AppLayout'
import Onboarding from './pages/Onboarding'
import Unlock from './pages/Unlock'
import Dashboard from './pages/Dashboard'
import Send from './pages/Send'
import Receive from './pages/Receive'
import Transactions from './pages/Transactions'
import Settings from './pages/Settings'
import Price from './pages/Price'
import IRS from './pages/IRS'
import Swap from './pages/Swap'

export default function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null)
  const navigate = useNavigate()
  const autoLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLockedRef = useRef(false)

  // Auto-lock: reset idle timer on user activity (H6 fix)
  const resetAutoLock = useCallback(() => {
    if (isLockedRef.current) return
    if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current)
    autoLockTimerRef.current = setTimeout(async () => {
      // Only lock if we're inside the app (not on onboarding/unlock)
      const path = window.location.hash || window.location.pathname
      if (path.includes('onboarding') || path.includes('unlock')) return
      isLockedRef.current = true
      try {
        await window.api.wallet.stopSync()
        await window.api.wallet.close()
      } catch {}
      navigate('/unlock')
      isLockedRef.current = false
    }, AUTO_LOCK_TIMEOUT)
  }, [navigate])

  useEffect(() => {
    playSound(startupSound, 'startup', 0.8)
    checkWalletState()

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('button, a, input, select, textarea, [role="button"], [role="tab"], [role="option"], label')) {
        playSound(clickySound, 'click', 0.5)
      }
    }
    document.addEventListener('mousedown', handleClick)

    // Play money sound when a new incoming payment is detected
    const unsubPayment = window.api.wallet.onNewPayment(() => {
      playSound(moneySound, 'receive', 0.9)
    })

    // Auto-lock: track user activity
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const
    activityEvents.forEach(evt => document.addEventListener(evt, resetAutoLock))
    resetAutoLock() // start the timer

    return () => {
      document.removeEventListener('mousedown', handleClick)
      unsubPayment()
      activityEvents.forEach(evt => document.removeEventListener(evt, resetAutoLock))
      if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current)
    }
  }, [])

  const checkWalletState = async () => {
    try {
      const wallets = await window.api.wallet.listWallets()
      if (wallets.length > 0) {
        setInitialRoute('/unlock')
        navigate('/unlock')
      } else {
        setInitialRoute('/onboarding')
        navigate('/onboarding')
      }
    } catch {
      // Fallback to old method
      try {
        const exists = await window.api.wallet.walletExists()
        if (exists) {
          setInitialRoute('/unlock')
          navigate('/unlock')
        } else {
          setInitialRoute('/onboarding')
          navigate('/onboarding')
        }
      } catch {
        setInitialRoute('/onboarding')
        navigate('/onboarding')
      }
    }
  }

  if (!initialRoute) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-primary">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#e0e0e0',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
          },
        }}
      />
      <AnimatePresence mode="wait">
        <Routes>
          {/* Full-screen routes (no sidebar) */}
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/unlock" element={<Unlock />} />

          {/* App routes (with sidebar) */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/send" element={<Send />} />
            <Route path="/receive" element={<Receive />} />
            <Route path="/swap" element={<Swap />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/price" element={<Price />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/irs" element={<IRS />} />
          </Route>

          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </Routes>
      </AnimatePresence>
    </>
  )
}
