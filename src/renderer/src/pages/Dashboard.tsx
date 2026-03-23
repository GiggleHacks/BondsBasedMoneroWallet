import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  Clock,
  CheckCircle2,
  Lock,
  Copy,
  Check,
  Server,
  Activity,
  Zap,
} from 'lucide-react'
import { useWalletStore } from '../store/walletStore'
import { formatXmrDisplay, formatTimestamp, truncateAddress, atomicToUsd, formatUsd } from '../lib/formatXmr'

export default function Dashboard() {
  const navigate = useNavigate()
  const {
    balance,
    unlockedBalance,
    primaryAddress,
    syncHeight,
    chainHeight,
    transactions,
    xmrPriceUsd,
    xmrChange24h,
    setBalance,
    setSyncProgress,
    setTransactions,
    setXmrPrice,
    setXmrChange24h,
  } = useWalletStore()

  const [copied, setCopied] = useState(false)
  const [connectedNode, setConnectedNode] = useState<string | null>(null)
  const [nodeLatency, setNodeLatency] = useState<number | null>(null)
  // Initialize from store — if we already have chain height, sync was previously started
  const [syncStarted, setSyncStarted] = useState(() => chainHeight > 0)
  // Track the actual percent from monero-ts (more accurate than our own calculation)
  const [syncPercentFromNode, setSyncPercentFromNode] = useState<number | null>(null)
  const [syncStartHeight, setSyncStartHeight] = useState(0)
  const [lwsActive, setLwsActive] = useState(false)
  const [lwsServer, setLwsServer] = useState<string | null>(null)
  const latencyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchPrice = () => {
    window.api.price.getXmrPrice().then(p => { if (p) setXmrPrice(p) }).catch(() => {})
    window.api.price.getXmrChange24h().then(c => { if (c != null) setXmrChange24h(c) }).catch(() => {})
  }

  useEffect(() => {
    // Fetch XMR price on mount, then refresh every 5 minutes
    fetchPrice()
    const priceInterval = setInterval(fetchPrice, 5 * 60 * 1000)

    // Try LWS first for instant data, then fall back to full node
    loadLwsData()
    loadData()
    loadNodeInfo()

    // Listen for full-node sync updates — use the real percent from monero-ts
    const unsubSync = window.api.wallet.onSyncProgress((progress) => {
      setSyncStarted(true)
      setSyncStartHeight(prev => prev || progress.startHeight)
      setSyncProgress(progress.height, progress.endHeight)
      // monero-ts percent is 0.0–1.0, convert to 0–100
      setSyncPercentFromNode(Math.min(100, Math.round(progress.percent * 100)))
    })

    const unsubBalance = window.api.wallet.onBalanceChanged((bal) => {
      setBalance(bal.balance, bal.unlockedBalance)
    })

    // Poll: LWS every 10s (fast), full node every 5s during sync, 30s when synced
    const lwsInterval = setInterval(loadLwsData, 10000)
    // Use faster polling (5s) to keep sync display responsive
    const nodeInterval = setInterval(loadData, 5000)
    latencyIntervalRef.current = setInterval(pingNode, 90000)

    return () => {
      unsubSync()
      unsubBalance()
      clearInterval(priceInterval)
      clearInterval(lwsInterval)
      clearInterval(nodeInterval)
      if (latencyIntervalRef.current) clearInterval(latencyIntervalRef.current)
    }
  }, [])

  const loadLwsData = async () => {
    try {
      const active = await window.api.lws.isActive()
      setLwsActive(active)
      if (!active) return

      const server = await window.api.lws.getServer()
      setLwsServer(server)

      const [balData, txs] = await Promise.all([
        window.api.lws.getBalance(),
        window.api.lws.getTransactions(),
      ])

      setBalance(balData.balance, balData.unlockedBalance)
      if (balData.blockchainHeight > 0) {
        setSyncStarted(true)
        setSyncProgress(balData.scannedHeight, balData.blockchainHeight)
      }
      setTransactions(txs)
    } catch {
      // LWS not available, will use full node data
    }
  }

  const loadData = async () => {
    try {
      const info = await window.api.wallet.getInfo()
      // Always update sync progress from the wallet (even if LWS handles balance)
      if (info.chainHeight > 0) {
        setSyncStarted(true)
        setSyncProgress(info.syncHeight, info.chainHeight)
      }

      // If LWS is active, don't overwrite LWS balance/tx data
      if (lwsActive) return

      const [bal, txs] = await Promise.all([
        window.api.wallet.getBalance(),
        window.api.wallet.getTransactions(),
      ])
      setBalance(bal.balance, bal.unlockedBalance)
      setTransactions(txs)
    } catch {
      // Wallet might not be ready yet
    }
  }

  const loadNodeInfo = async () => {
    try {
      const uri = await window.api.node.getConnectedNode()
      if (uri) {
        setConnectedNode(uri)
        const result = await window.api.node.testConnection(uri, true)
        if (result.isHealthy) setNodeLatency(result.latency)
      }
    } catch {}
  }

  const pingNode = async () => {
    if (!connectedNode) return
    try {
      const result = await window.api.node.testConnection(connectedNode, true)
      if (result.isHealthy) setNodeLatency(result.latency)
      else setNodeLatency(null)
    } catch {}
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(primaryAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Prefer monero-ts's real percent (accounts for startHeight properly)
  // Fall back to our own calculation from heights
  const syncPercent = syncPercentFromNode !== null
    ? syncPercentFromNode
    : (syncStarted && chainHeight > 0)
      ? Math.min(100, Math.floor((syncHeight / chainHeight) * 100))
      : null
  const lockedBalance = BigInt(balance) - BigInt(unlockedBalance)
  const hasLockedBalance = lockedBalance > 0n
  const recentTxs = [...transactions]
    .sort((a, b) => (b.timestamp || b.height || 0) - (a.timestamp || a.height || 0))
    .slice(0, 5)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 relative overflow-hidden"
      >
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-accent-primary/5 rounded-full blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-text-secondary text-sm">Total Balance</p>
            {lwsActive && (
              <span className="flex items-center gap-1 text-[10px] text-status-success bg-status-success/10 px-1.5 py-0.5 rounded-full">
                <Zap size={8} />
                Instant
              </span>
            )}
          </div>

          {/* Primary balance: USD if available, XMR fallback */}
          {xmrPriceUsd ? (
            <>
              <div className="flex items-baseline gap-3 mb-0.5">
                <motion.span
                  key={`usd-${balance}`}
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 1 }}
                  className="text-4xl font-bold text-text-primary font-mono"
                >
                  {formatUsd(atomicToUsd(balance, xmrPriceUsd))}
                </motion.span>
                <span className="text-lg text-text-muted">USD</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg text-text-secondary font-mono">
                  {formatXmrDisplay(balance, 6)}
                </span>
                <span className="text-sm text-text-muted">XMR</span>
                {xmrChange24h != null && (
                  <span
                    onClick={() => navigate('/price')}
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      fontFamily: "'IBM Plex Mono', monospace",
                      letterSpacing: '0.04em',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      background: xmrChange24h >= 0
                        ? 'rgba(74, 222, 128, 0.12)'
                        : 'rgba(239, 68, 68, 0.12)',
                      color: xmrChange24h >= 0 ? '#4ade80' : '#ef4444',
                      border: `1px solid ${xmrChange24h >= 0 ? 'rgba(74,222,128,0.25)' : 'rgba(239,68,68,0.25)'}`,
                      transition: 'filter 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.3)'}
                    onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
                  >
                    {xmrChange24h >= 0 ? '+' : ''}{xmrChange24h.toFixed(2)}% 24h
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-baseline gap-3 mb-1">
              <motion.span
                key={balance}
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                className="text-4xl font-bold text-text-primary font-mono"
              >
                {formatXmrDisplay(balance, 6)}
              </motion.span>
              <span className="text-lg text-text-muted">XMR</span>
            </div>
          )}

          {hasLockedBalance && (
            <div className="flex items-center gap-1.5 text-sm text-status-warning mb-4">
              <Lock size={14} />
              <span>
                {formatXmrDisplay(lockedBalance.toString(), 4)} XMR locked (pending)
                {xmrPriceUsd && ` (${formatUsd(atomicToUsd(lockedBalance.toString(), xmrPriceUsd))})`}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 mt-4">
            <code className="text-xs text-text-muted font-mono bg-bg-primary/50 px-3 py-1.5 rounded-lg">
              {truncateAddress(primaryAddress, 12)}
            </code>
            <button onClick={copyAddress} className="text-text-muted hover:text-text-primary transition-colors">
              {copied ? <Check size={14} className="text-status-success" /> : <Copy size={14} />}
            </button>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => navigate('/send')}
              className="btn-primary flex items-center gap-2"
            >
              <ArrowUpRight size={18} />
              Send
            </button>
            <button
              onClick={() => navigate('/receive')}
              className="btn-secondary flex items-center gap-2"
            >
              <ArrowDownLeft size={18} />
              Receive
            </button>
          </div>
        </div>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-text-primary">Recent Transactions</h3>
          <button
            onClick={() => navigate('/transactions')}
            className="text-sm text-accent-primary hover:text-accent-hover transition-colors"
          >
            View All
          </button>
        </div>

        {recentTxs.length === 0 ? (
          <div className="p-8 text-center">
            <TrendingUp size={32} className="mx-auto text-text-muted mb-3" />
            <p className="text-text-secondary">No transactions yet</p>
            <p className="text-text-muted text-sm mt-1">
              Send or receive XMR to get started
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            <AnimatePresence>
              {recentTxs.map((tx, i) => (
                <motion.div
                  key={tx.hash}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-4 hover:bg-bg-hover/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      tx.isIncoming ? 'bg-status-success/10' : 'bg-accent-primary/10'
                    }`}>
                      {tx.isIncoming ? (
                        <ArrowDownLeft size={16} className="text-status-success" />
                      ) : (
                        <ArrowUpRight size={16} className="text-accent-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {tx.isIncoming ? 'Received' : 'Sent'}
                      </p>
                      <p className="text-xs text-text-muted flex items-center gap-1">
                        <Clock size={10} />
                        {formatTimestamp(tx.timestamp)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`text-sm font-mono font-medium ${
                      tx.isIncoming ? 'text-status-success' : 'text-text-primary'
                    }`}>
                      {tx.isIncoming ? '+' : '-'}{formatXmrDisplay(tx.amount, 4)} XMR
                    </p>
                    {xmrPriceUsd && (
                      <p className="text-xs text-text-muted font-mono">
                        {formatUsd(atomicToUsd(tx.amount, xmrPriceUsd))}
                      </p>
                    )}
                    <div className="flex items-center gap-1 justify-end">
                      {tx.confirmations >= 10 ? (
                        <CheckCircle2 size={10} className="text-status-success" />
                      ) : (
                        <Clock size={10} className="text-status-warning" />
                      )}
                      <span className="text-xs text-text-muted">
                        {tx.confirmations >= 10 ? 'Confirmed' : `${tx.confirmations}/10`}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Sync Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">Sync Status</span>
            {lwsActive && (
              <span className="flex items-center gap-1 text-[10px] text-status-success bg-status-success/10 px-1.5 py-0.5 rounded-full">
                <Zap size={8} />
                Light Wallet
              </span>
            )}
          </div>
          <span className="text-sm font-mono text-text-muted">
            {syncStarted
              ? `${syncHeight.toLocaleString()} / ${chainHeight.toLocaleString()}`
              : 'Connecting to node...'
            }
          </span>
        </div>
        <div className="w-full h-2 bg-bg-primary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-accent rounded-full"
            initial={{ width: 0 }}
            animate={{ width: syncPercent !== null ? `${syncPercent}%` : '0%' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs text-text-muted">
            {syncPercent === null
              ? 'Waiting for node connection...'
              : syncPercent >= 100
                ? 'Fully synced'
                : `${syncPercent}% synced`
            }
          </p>
          {syncStarted && syncPercent !== null && syncPercent < 100 && chainHeight > 0 && (
            <p className="text-xs text-text-muted font-mono">
              {(chainHeight - syncHeight).toLocaleString()} blocks remaining
            </p>
          )}
        </div>

        {/* Connected node/LWS info */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <Server size={12} className="text-text-muted" />
            <span className="text-xs text-text-muted font-mono truncate max-w-[300px]">
              {lwsActive ? (lwsServer || 'Light Wallet Server') : (connectedNode || 'Selecting best node...')}
            </span>
          </div>
          {nodeLatency !== null && (
            <div className="flex items-center gap-1.5">
              <Activity size={12} className="text-status-success" />
              <span className="text-xs text-status-success">{nodeLatency}ms</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
