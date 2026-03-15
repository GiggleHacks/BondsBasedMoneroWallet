import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  Search,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react'
import { useWalletStore } from '../store/walletStore'
import { formatXmrDisplay, formatTimestamp, truncateAddress, atomicToUsd, formatUsd } from '../lib/formatXmr'

export default function Transactions() {
  const { transactions, setTransactions, xmrPriceUsd } = useWalletStore()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'in' | 'out'>('all')
  const [selectedTx, setSelectedTx] = useState<string | null>(null)
  const [copiedHash, setCopiedHash] = useState(false)
  const [txLabels, setTxLabels] = useState<Record<string, string>>({})

  const fetchTxs = () => {
    window.api.wallet.getTransactions().then(setTransactions).catch(() => {})
  }

  useEffect(() => {
    fetchTxs()
    window.api.cloudSync.getTxLabels().then(setTxLabels).catch(() => {})

    // Re-fetch when a new output is received (new tx confirmed)
    const unsubTx = window.api.wallet.onTransactionsChanged(fetchTxs)

    // Also poll every 30s as a fallback
    const interval = setInterval(fetchTxs, 30_000)

    return () => {
      unsubTx()
      clearInterval(interval)
    }
  }, [])

  const filtered = transactions
    .filter(tx => {
      if (filter === 'in' && !tx.isIncoming) return false
      if (filter === 'out' && tx.isIncoming) return false
      if (search) {
        const label = txLabels[tx.hash] || ''
        return tx.hash.includes(search.toLowerCase()) || label.toLowerCase().includes(search.toLowerCase())
      }
      return true
    })
    .slice()
    .sort((a, b) => (b.timestamp || b.height || 0) - (a.timestamp || a.height || 0))

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash)
    setCopiedHash(true)
    setTimeout(() => setCopiedHash(false), 2000)
  }

  return (
    <div className="max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold mb-6">Transaction History</h2>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by hash or label..."
              className="input-field pl-10 text-sm"
            />
          </div>
          <div className="flex bg-bg-surface rounded-lg border border-border">
            {(['all', 'in', 'out'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm transition-colors ${
                  filter === f
                    ? 'text-accent-primary bg-accent-primary/10'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {f === 'all' ? 'All' : f === 'in' ? 'Received' : 'Sent'}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction list */}
        <div className="glass-card divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-text-secondary">No transactions found</p>
            </div>
          ) : (
            filtered.map((tx, i) => (
              <motion.div
                key={tx.hash}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
              >
                <button
                  onClick={() => setSelectedTx(selectedTx === tx.hash ? null : tx.hash)}
                  className="w-full text-left p-4 hover:bg-bg-hover/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
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
                          {txLabels[tx.hash] || (tx.isIncoming ? 'Received' : 'Sent')}
                        </p>
                        <p className="text-xs text-text-muted">
                          {formatTimestamp(tx.timestamp)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`text-sm font-mono font-medium ${
                        tx.isIncoming ? 'text-status-success' : 'text-text-primary'
                      }`}>
                        {tx.isIncoming ? '+' : '-'}{formatXmrDisplay(tx.amount, 6)} XMR
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
                          {tx.confirmations >= 10 ? 'Confirmed' : `${tx.confirmations} conf.`}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded details */}
                {selectedTx === tx.hash && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-4"
                  >
                    <div className="bg-bg-primary rounded-lg p-4 space-y-3">
                      <div>
                        <p className="text-xs text-text-muted mb-1">Transaction Hash</p>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono text-text-secondary break-all">{tx.hash}</code>
                          <button onClick={() => copyHash(tx.hash)} className="text-text-muted hover:text-text-primary shrink-0">
                            {copiedHash ? <Check size={12} className="text-status-success" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-text-muted mb-0.5">Fee</p>
                          <p className="text-sm font-mono text-text-primary">{formatXmrDisplay(tx.fee, 6)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-muted mb-0.5">Block Height</p>
                          <p className="text-sm font-mono text-text-primary">{tx.height.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-muted mb-0.5">Confirmations</p>
                          <p className="text-sm font-mono text-text-primary">{tx.confirmations.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  )
}
