import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import sendSound from '@/assets/sounds/sound1.mp3'
import { playSound } from '@/lib/playSound'
import {
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowLeftRight,
} from 'lucide-react'
import { useWalletStore } from '../store/walletStore'
import { formatXmrDisplay, xmrToAtomic, atomicToUsd, formatUsd, usdToAtomic, atomicToXmr } from '../lib/formatXmr'
import { TX_PRIORITIES } from '@shared/constants'
import type { TxPreview } from '@shared/types'

type Step = 'form' | 'preview' | 'sending' | 'success' | 'error'

export default function Send() {
  const { balance, unlockedBalance, xmrPriceUsd, setXmrPrice } = useWalletStore()
  const [step, setStep] = useState<Step>('form')
  const [address, setAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [priority, setPriority] = useState(0)
  const [preview, setPreview] = useState<TxPreview | null>(null)
  const [txHash, setTxHash] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSweep, setIsSweep] = useState(false)
  const [feeEstimate, setFeeEstimate] = useState<string | null>(null)
  const [feeLoading, setFeeLoading] = useState(false)
  const [inputMode, setInputMode] = useState<'xmr' | 'usd'>('xmr')
  const feeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    window.api.price.getXmrPrice().then(p => { if (p) setXmrPrice(p) }).catch(() => {})
  }, [])

  const validateAddress = (addr: string): boolean => {
    return addr.length >= 95 && (addr.startsWith('4') || addr.startsWith('8'))
  }

  // Convert current amount to atomic XMR regardless of input mode
  const getAtomicAmount = (): string => {
    if (!amount || parseFloat(amount) <= 0) return '0'
    if (inputMode === 'usd' && xmrPriceUsd) {
      return usdToAtomic(amount, xmrPriceUsd)
    }
    return xmrToAtomic(amount)
  }

  // Lightweight fee estimation — uses priority-based estimate instead of
  // constructing a full unsigned transaction on every keystroke (C4 fix)
  useEffect(() => {
    if (isSweep) return
    if (!validateAddress(address) || !amount || parseFloat(amount) <= 0) {
      setFeeEstimate(null)
      setFeeLoading(false)
      return
    }

    let cancelled = false
    setFeeLoading(true)

    feeTimerRef.current = setTimeout(async () => {
      try {
        const fee = await window.api.wallet.estimateFee(priority)
        if (!cancelled) setFeeEstimate(fee)
      } catch {
        if (!cancelled) setFeeEstimate(null)
      } finally {
        if (!cancelled) setFeeLoading(false)
      }
    }, 200)

    return () => {
      cancelled = true
      if (feeTimerRef.current) clearTimeout(feeTimerRef.current)
    }
  }, [amount, address, priority, isSweep, inputMode])

  const toggleInputMode = () => {
    if (!xmrPriceUsd) return
    if (inputMode === 'xmr') {
      // Convert XMR amount to USD
      if (amount && parseFloat(amount) > 0) {
        const usdVal = parseFloat(amount) * xmrPriceUsd
        setAmount(usdVal.toFixed(2))
      }
      setInputMode('usd')
    } else {
      // Convert USD amount to XMR
      if (amount && parseFloat(amount) > 0) {
        const xmrVal = parseFloat(amount) / xmrPriceUsd
        setAmount(xmrVal.toFixed(6))
      }
      setInputMode('xmr')
    }
  }

  const handlePreview = async () => {
    if (!validateAddress(address)) {
      setError('Invalid Monero address')
      return
    }
    if (!isSweep && (!amount || parseFloat(amount) <= 0)) {
      setError('Enter a valid amount')
      return
    }

    setError('')
    setLoading(true)

    try {
      let result: TxPreview
      if (isSweep) {
        result = await window.api.wallet.sweepTx(address, priority)
      } else {
        const atomicAmount = getAtomicAmount()
        result = await window.api.wallet.createTx(address, atomicAmount, priority)
      }
      setPreview(result)
      setStep('preview')
    } catch (e: any) {
      setError(e.message || 'Failed to create transaction')
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!preview) return
    setStep('sending')

    try {
      const hash = await window.api.wallet.relayTx(preview.txMetadata)
      setTxHash(hash)
      setStep('success')
      playSound(sendSound, 'send', 0.8)
    } catch (e: any) {
      setError(e.message || 'Transaction failed')
      setStep('error')
    }
  }

  const handleSendAll = () => {
    setIsSweep(true)
    setInputMode('xmr')
    setAmount(formatXmrDisplay(unlockedBalance, 6))
    setFeeEstimate(null)
  }

  const resetForm = () => {
    setStep('form')
    setAddress('')
    setAmount('')
    setPreview(null)
    setTxHash('')
    setError('')
    setIsSweep(false)
    setFeeEstimate(null)
    setInputMode('xmr')
  }

  // Conversion display text
  const getConversionText = (): string => {
    if (!amount || parseFloat(amount) <= 0 || !xmrPriceUsd) return ''
    if (inputMode === 'xmr') {
      const usdVal = parseFloat(amount) * xmrPriceUsd
      return `≈ ${formatUsd(usdVal)}`
    } else {
      const xmrVal = parseFloat(amount) / xmrPriceUsd
      return `≈ ${xmrVal.toFixed(6)} XMR`
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-2xl font-bold mb-6">Send XMR</h2>

        {step === 'form' && (
          <div className="space-y-5">
            {/* Available balance */}
            <div className="glass-card p-4">
              <p className="text-sm text-text-secondary">Available Balance</p>
              <p className="text-xl font-mono font-bold text-text-primary">
                {xmrPriceUsd
                  ? formatUsd(atomicToUsd(unlockedBalance, xmrPriceUsd))
                  : formatXmrDisplay(unlockedBalance, 6)
                }
                {' '}
                <span className="text-text-muted text-sm">{xmrPriceUsd ? 'USD' : 'XMR'}</span>
              </p>
              {xmrPriceUsd && (
                <p className="text-sm font-mono text-text-muted mt-0.5">
                  {formatXmrDisplay(unlockedBalance, 6)} XMR
                </p>
              )}
            </div>

            {/* Recipient */}
            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">Recipient Address</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value.trim())}
                placeholder="4... or 8..."
                className="input-field font-mono text-sm h-20 resize-none"
              />
            </div>

            {/* Amount */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-text-secondary">Amount</label>
                  {xmrPriceUsd && (
                    <button
                      onClick={toggleInputMode}
                      className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-border hover:border-accent-primary text-text-muted hover:text-accent-primary transition-all"
                      title="Switch between XMR and USD"
                    >
                      <ArrowLeftRight size={10} />
                      {inputMode === 'xmr' ? 'XMR' : 'USD'}
                    </button>
                  )}
                </div>
                <button
                  onClick={handleSendAll}
                  className="text-xs text-accent-primary hover:text-accent-hover"
                >
                  Send All
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => {
                    if (isSweep) setIsSweep(false)
                    setAmount(e.target.value)
                  }}
                  placeholder={inputMode === 'xmr' ? '0.0000' : '0.00'}
                  className="input-field font-mono pr-14"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted text-sm">
                  {inputMode === 'xmr' ? 'XMR' : 'USD'}
                </span>
              </div>
              {/* Conversion + fee estimate rows */}
              <div className="mt-1.5 space-y-0.5">
                {/* Conversion (XMR↔USD) */}
                <div className="h-4">
                  <span className="text-xs text-text-secondary">
                    {getConversionText()}
                  </span>
                </div>
                {/* Fee estimate */}
                <div className="flex items-center gap-1.5 h-4">
                  {feeLoading && <Loader2 size={12} className="text-text-muted animate-spin" />}
                  <span className="text-xs text-text-muted">
                    {feeLoading
                      ? 'Estimating fee...'
                      : feeEstimate
                        ? `≈ fee: ${formatXmrDisplay(feeEstimate, 6)} XMR${xmrPriceUsd ? ` (${formatUsd(atomicToUsd(feeEstimate, xmrPriceUsd))})` : ''}`
                        : isSweep ? 'Fee calculated at preview' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">Transaction Priority</label>
              <div className="grid grid-cols-4 gap-2">
                {TX_PRIORITIES.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setPriority(p.value)}
                    className={`p-2 rounded-lg text-xs text-center transition-all ${
                      priority === p.value
                        ? 'bg-accent-primary/20 border border-accent-primary text-accent-primary'
                        : 'bg-bg-surface border border-border text-text-secondary hover:border-border-hover'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-status-error">
                <AlertTriangle size={14} />
                {error}
              </div>
            )}

            <button
              onClick={handlePreview}
              disabled={loading || !address || (!isSweep && !amount)}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowUpRight size={18} />}
              {loading ? 'Preparing...' : 'Preview Transaction'}
            </button>
          </div>
        )}

        {step === 'preview' && preview && (
          <div className="space-y-5">
            <div className="glass-card p-5 space-y-4">
              <h3 className="font-semibold text-text-primary">Transaction Summary</h3>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Amount</span>
                  <div className="text-right">
                    <span className="text-sm font-mono text-text-primary">
                      {formatXmrDisplay(preview.amount, 6)} XMR
                    </span>
                    {xmrPriceUsd && (
                      <p className="text-xs text-text-muted font-mono">
                        {formatUsd(atomicToUsd(preview.amount, xmrPriceUsd))}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Network Fee</span>
                  <div className="text-right">
                    <span className="text-sm font-mono text-text-primary">
                      {formatXmrDisplay(preview.fee, 6)} XMR
                    </span>
                    {xmrPriceUsd && (
                      <p className="text-xs text-text-muted font-mono">
                        {formatUsd(atomicToUsd(preview.fee, xmrPriceUsd))}
                      </p>
                    )}
                  </div>
                </div>
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="text-sm font-semibold text-text-primary">Total</span>
                  <div className="text-right">
                    <span className="text-sm font-mono font-bold text-accent-primary">
                      {formatXmrDisplay(preview.totalAmount, 6)} XMR
                    </span>
                    {xmrPriceUsd && (
                      <p className="text-xs text-text-muted font-mono">
                        {formatUsd(atomicToUsd(preview.totalAmount, xmrPriceUsd))}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs text-text-muted mb-1">To</p>
                <p className="text-xs font-mono text-text-secondary break-all">{address}</p>
              </div>
            </div>

            <div className="bg-status-warning/10 border border-status-warning/30 rounded-lg p-3">
              <p className="text-sm text-status-warning">
                This transaction cannot be reversed. Please verify the address and amount.
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('form')} className="btn-secondary flex-1">
                Back
              </button>
              <button onClick={handleSend} className="btn-primary flex-1">
                Confirm & Send
              </button>
            </div>
          </div>
        )}

        {step === 'sending' && (
          <div className="text-center py-12">
            <Loader2 size={48} className="mx-auto text-accent-primary animate-spin mb-4" />
            <h3 className="text-xl font-bold mb-2">Sending Transaction</h3>
            <p className="text-text-secondary text-sm">Broadcasting to the Monero network...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-12 space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <CheckCircle2 size={64} className="mx-auto text-status-success" />
            </motion.div>
            <h3 className="text-xl font-bold">Transaction Sent!</h3>
            <p className="text-text-secondary text-sm">Your XMR is on its way.</p>
            <div className="glass-card p-3">
              <p className="text-xs text-text-muted mb-1">Transaction Hash</p>
              <p className="text-xs font-mono text-text-secondary break-all">{txHash}</p>
            </div>
            <button onClick={resetForm} className="btn-primary">
              Send Another
            </button>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center py-12 space-y-4">
            <AlertTriangle size={64} className="mx-auto text-status-error" />
            <h3 className="text-xl font-bold">Transaction Failed</h3>
            <p className="text-text-secondary text-sm">{error}</p>
            <button onClick={() => setStep('form')} className="btn-primary">
              Try Again
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
