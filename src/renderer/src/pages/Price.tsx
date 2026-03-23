import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { useWalletStore } from '../store/walletStore'
import PriceChart from '../components/PriceChart'
import type { PriceHistoryPoint } from '../components/PriceChart'
import moneroLogo from '@/assets/monero-symbol-480.png'

const TIMEFRAMES = [
  { key: '1', label: '24H' },
  { key: '7', label: '1W' },
  { key: '30', label: '1M' },
  { key: '90', label: '3M' },
  { key: '180', label: '6M' },
  { key: '365', label: '1Y' },
  { key: 'max', label: 'ALL' },
] as const

export default function Price() {
  const { xmrPriceUsd, xmrChange24h, setXmrPrice, setXmrChange24h } = useWalletStore()
  const [timeframe, setTimeframe] = useState('7')
  const [historyData, setHistoryData] = useState<PriceHistoryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Fetch current price on mount
  useEffect(() => {
    window.api.price.getXmrPrice().then(p => { if (p) setXmrPrice(p) }).catch(() => {})
    window.api.price.getXmrChange24h().then(c => { if (c != null) setXmrChange24h(c) }).catch(() => {})
  }, [])

  const fetchHistory = useCallback((tf: string) => {
    setLoading(true)
    setError(false)
    // Small delay to avoid CoinGecko rate limiting after price fetch
    const delay = historyData.length === 0 ? 1500 : 0
    setTimeout(() => {
      window.api.price.getXmrPriceHistory(tf as any)
        .then(data => {
          if (data && data.length > 0) {
            setHistoryData(data)
            setError(false)
          } else {
            setError(true)
          }
          setLoading(false)
        })
        .catch(() => {
          setError(true)
          setLoading(false)
        })
    }, delay)
  }, [historyData.length])

  // Fetch history when timeframe changes
  useEffect(() => {
    fetchHistory(timeframe)
  }, [timeframe])

  // Compute chart-specific price change (first vs last point)
  const chartChange = historyData.length >= 2
    ? ((historyData[historyData.length - 1].price - historyData[0].price) / historyData[0].price) * 100
    : null

  return (
    <div style={{ maxWidth: '900px' }} className="space-y-5">
      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 relative overflow-hidden"
      >
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-accent-primary/5 rounded-full blur-3xl" />

        <div className="relative flex items-center gap-5">
          {/* Monero Logo */}
          <img
            src={moneroLogo}
            alt="Monero"
            style={{
              width: '56px',
              height: '56px',
              flexShrink: 0,
              filter: 'drop-shadow(0 0 12px rgba(242, 104, 34, 0.3))',
            }}
          />

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-text-secondary text-sm">Monero (XMR)</span>
            </div>

            {xmrPriceUsd ? (
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-text-primary font-mono">
                  ${xmrPriceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-lg text-text-muted">USD</span>
              </div>
            ) : (
              <div className="text-2xl font-bold text-text-muted font-mono">Loading...</div>
            )}

            {xmrChange24h != null && (
              <div className="flex items-center gap-2 mt-1">
                <span style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: "'IBM Plex Mono', monospace",
                  letterSpacing: '0.04em',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: xmrChange24h >= 0
                    ? 'rgba(74, 222, 128, 0.12)'
                    : 'rgba(239, 68, 68, 0.12)',
                  color: xmrChange24h >= 0 ? '#4ade80' : '#ef4444',
                  border: `1px solid ${xmrChange24h >= 0 ? 'rgba(74,222,128,0.25)' : 'rgba(239,68,68,0.25)'}`,
                }}>
                  {xmrChange24h >= 0 ? '+' : ''}{xmrChange24h.toFixed(2)}% 24h
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Chart card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card overflow-hidden"
      >
        {/* Timeframe buttons + period change */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div style={{
            display: 'flex',
            gap: '2px',
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '8px',
            padding: '3px',
          }}>
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.key}
                onClick={() => setTimeframe(tf.key)}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: "'IBM Plex Mono', monospace",
                  letterSpacing: '0.04em',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: timeframe === tf.key ? '#f26822' : 'transparent',
                  color: timeframe === tf.key ? '#fff' : '#909090',
                }}
                onMouseEnter={e => {
                  if (timeframe !== tf.key) e.currentTarget.style.color = '#e0e0e0'
                }}
                onMouseLeave={e => {
                  if (timeframe !== tf.key) e.currentTarget.style.color = '#909090'
                }}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Period price change */}
          {chartChange !== null && !loading && (
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: "'IBM Plex Mono', monospace",
              color: chartChange >= 0 ? '#4ade80' : '#ef4444',
            }}>
              {chartChange >= 0 ? '+' : ''}{chartChange.toFixed(2)}%
            </span>
          )}
        </div>

        {/* Chart */}
        <div style={{ height: '400px', padding: '8px', position: 'relative' }}>
          <PriceChart data={historyData} loading={loading} timeframe={timeframe} />
          {/* Retry overlay when no data */}
          {error && !loading && historyData.length === 0 && (
            <div style={{
              position: 'absolute', inset: '8px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '12px',
              background: 'rgba(12, 12, 12, 0.6)',
              borderRadius: '8px',
            }}>
              <span style={{
                fontSize: '13px',
                fontFamily: "'IBM Plex Mono', monospace",
                color: 'rgba(255, 255, 255, 0.4)',
              }}>
                Failed to load chart data
              </span>
              <button
                onClick={() => fetchHistory(timeframe)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: "'IBM Plex Mono', monospace",
                  background: 'rgba(242, 104, 34, 0.15)',
                  border: '1px solid rgba(242, 104, 34, 0.3)',
                  borderRadius: '6px',
                  color: '#f26822',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(242, 104, 34, 0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(242, 104, 34, 0.15)'}
              >
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
