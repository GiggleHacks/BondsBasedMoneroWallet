import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import fffsendSound from '@/assets/sounds/fffsend.mp3'
import alertSeedSound from '@/assets/sounds/alertseed.wav'
import startupSound from '@/assets/sounds/startup3.mp3'
import clickySound from '@/assets/sounds/clicky2.mp3'
import moneySound from '@/assets/sounds/money.mp3'
import sendSound from '@/assets/sounds/sound1.mp3'
import thatsGoodSound from '@/assets/sounds/thatsgood.mp3'
import { playSound } from '@/lib/playSound'
import { useSoundStore, SOUND_META, type SoundKey } from '@/store/soundStore'
import {
  Server,
  Shield,
  Key,
  RefreshCw,
  AlertTriangle,
  Loader2,
  FolderOpen,
  Zap,
  Terminal,
  Trash2,
  Volume2,
  VolumeX,
  Play,
} from 'lucide-react'
import { DEFAULT_NODES, DEFAULT_LWS_SERVERS } from '@shared/constants'
import type { LogEntry } from '@shared/types'

// Map each SoundKey to its imported asset URL for previewing
const SOUND_ASSETS: Record<SoundKey, string> = {
  startup:    startupSound,
  click:      clickySound,
  receive:    moneySound,
  send:       sendSound,
  testNodes:  fffsendSound,
  revealSeed: alertSeedSound,
  spinModel:  thatsGoodSound,
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'nodes' | 'lws' | 'security' | 'sounds' | 'logs'>('nodes')
  const { masterEnabled, sounds, setMaster, setSound } = useSoundStore()
  const [nodeResults, setNodeResults] = useState<Record<string, { latency: number; healthy: boolean; testing: boolean }>>({})
  const [testingAll, setTestingAll] = useState(false)
  const [connectedNode, setConnectedNode] = useState('')
  const [customNodeUri, setCustomNodeUri] = useState('')

  // LWS
  const [lwsActive, setLwsActive] = useState(false)
  const [lwsServer, setLwsServer] = useState<string | null>(null)
  const [customLwsUri, setCustomLwsUri] = useState('')
  const [lwsResults, setLwsResults] = useState<Record<string, { latency: number; ok: boolean; testing: boolean }>>({})
  const [lwsConnecting, setLwsConnecting] = useState<string | null>(null)

  // Security
  const [showSeed, setShowSeed] = useState(false)
  const [seedPassword, setSeedPassword] = useState('')
  const [revealedSeed, setRevealedSeed] = useState('')
  const [seedError, setSeedError] = useState('')
  const [seedLoading, setSeedLoading] = useState(false)
  const [walletDir, setWalletDir] = useState('')

  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [logFilter, setLogFilter] = useState<string>('all')
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.api.app.getWalletDir().then(setWalletDir).catch(() => {})
    window.api.lws.isActive().then(setLwsActive).catch(() => {})
    window.api.lws.getServer().then(setLwsServer).catch(() => {})
    // Load existing logs
    window.api.app.getLogs().then(setLogs).catch(() => {})
    // Subscribe to new logs
    const unsubscribe = window.api.app.onLog((entry) => {
      setLogs(prev => [...prev.slice(-499), entry])
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (activeTab === 'logs') {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, activeTab])

  const testNode = async (uri: string) => {
    setNodeResults(prev => ({ ...prev, [uri]: { latency: 0, healthy: false, testing: true } }))
    try {
      const result = await window.api.node.testConnection(uri)
      setNodeResults(prev => ({ ...prev, [uri]: { latency: result.latency, healthy: result.isHealthy, testing: false } }))
    } catch {
      setNodeResults(prev => ({ ...prev, [uri]: { latency: 0, healthy: false, testing: false } }))
    }
  }

  const connectNode = async (uri: string) => {
    try {
      await window.api.node.connect(uri)
      setConnectedNode(uri)
    } catch {}
  }

  const testAllNodes = async () => {
    if (testingAll) return
    setTestingAll(true)
    playSound(fffsendSound, 'testNodes', 0.8)
    await Promise.all(DEFAULT_NODES.map(n => testNode(n.uri)))
    setTestingAll(false)
  }

  const revealSeed = async () => {
    if (!seedPassword) {
      setSeedError('Enter your wallet password')
      return
    }
    setSeedLoading(true)
    setSeedError('')
    try {
      const seed = await window.api.wallet.getSeed(seedPassword)
      setRevealedSeed(seed)
      playSound(alertSeedSound, 'revealSeed', 0.8)
      setSeedError('')
    } catch {
      setSeedError('Incorrect password')
    } finally {
      setSeedLoading(false)
    }
  }

  const testLws = async (uri: string) => {
    setLwsResults(prev => ({ ...prev, [uri]: { latency: 0, ok: false, testing: true } }))
    try {
      const result = await window.api.lws.testServer(uri)
      setLwsResults(prev => ({ ...prev, [uri]: { latency: result.latency, ok: result.ok, testing: false } }))
    } catch {
      setLwsResults(prev => ({ ...prev, [uri]: { latency: 0, ok: false, testing: false } }))
    }
  }

  const connectLws = async (uri: string) => {
    setLwsConnecting(uri)
    try {
      await window.api.lws.setServer(uri)
      setLwsServer(uri)
      setLwsActive(true)
    } catch {}
    setLwsConnecting(null)
  }

  const disconnectLws = async () => {
    try {
      await window.api.lws.setServer('')
      setLwsServer(null)
      setLwsActive(false)
    } catch {}
  }

  const tabs = [
    { id: 'nodes',    label: 'Nodes',        icon: Server   },
    { id: 'lws',      label: 'Light Wallet', icon: Zap      },
    { id: 'security', label: 'Security',     icon: Shield   },
    { id: 'sounds',   label: 'Sounds',       icon: Volume2  },
    { id: 'logs',     label: 'Logs',         icon: Terminal },
  ] as const

  return (
    <div className="max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold mb-6">Settings</h2>

        {/* Tabs */}
        <div className="flex gap-1 bg-bg-surface rounded-lg p-1 mb-6 border border-border">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-bg-hover text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Nodes Tab */}
        {activeTab === 'nodes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary">Connect to a public Monero remote node</p>
              <button
                onClick={testAllNodes}
                disabled={testingAll}
                className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={14} className={testingAll ? 'animate-spin' : ''} />
                {testingAll ? 'Testing...' : 'Test All'}
              </button>
            </div>

            <div className="glass-card divide-y divide-border">
              {DEFAULT_NODES.map(node => {
                const result = nodeResults[node.uri]
                return (
                  <div key={node.uri} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{node.label}</p>
                      <p className="text-xs text-text-muted font-mono">{node.uri}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {result && (
                        <span className={`text-xs ${result.healthy ? 'text-status-success' : 'text-status-error'}`}>
                          {result.testing ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : result.healthy ? (
                            `${result.latency}ms`
                          ) : (
                            'Offline'
                          )}
                        </span>
                      )}
                      <button
                        onClick={() => connectNode(node.uri)}
                        className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                          connectedNode === node.uri
                            ? 'bg-status-success/10 text-status-success'
                            : 'bg-bg-hover text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {connectedNode === node.uri ? 'Connected' : 'Connect'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Custom node */}
            <div className="glass-card p-4">
              <p className="text-sm font-medium text-text-primary mb-3">Custom Node</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customNodeUri}
                  onChange={(e) => setCustomNodeUri(e.target.value)}
                  placeholder="https://your-node:18081"
                  className="input-field text-sm flex-1"
                />
                <button
                  onClick={() => customNodeUri && connectNode(customNodeUri)}
                  className="btn-secondary text-sm"
                >
                  Connect
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Light Wallet Tab */}
        {activeTab === 'lws' && (
          <div className="space-y-4">
            <div className="bg-status-warning/10 border border-status-warning/30 rounded-lg p-3 mb-2">
              <div className="flex gap-2">
                <AlertTriangle size={16} className="text-status-warning shrink-0 mt-0.5" />
                <div className="text-sm text-status-warning">
                  <p className="font-medium mb-1">Privacy trade-off</p>
                  <p className="text-xs opacity-80">
                    LWS gives instant sync but sends your <strong>view key</strong> to the server.
                    The server can see your balance and transaction history, but <strong>cannot spend</strong> your funds.
                  </p>
                </div>
              </div>
            </div>

            {lwsActive && lwsServer && (
              <div className="glass-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-status-success bg-status-success/10 px-2 py-1 rounded-full">
                    <Zap size={10} />
                    Connected
                  </span>
                  <span className="text-sm font-mono text-text-secondary">{lwsServer}</span>
                </div>
                <button onClick={disconnectLws} className="btn-secondary text-sm">
                  Disconnect
                </button>
              </div>
            )}

            <div className="glass-card divide-y divide-border">
              {DEFAULT_LWS_SERVERS.map(server => {
                const result = lwsResults[server.uri]
                const isConnected = lwsServer === server.uri && lwsActive
                return (
                  <div key={server.uri} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{server.label}</p>
                      <p className="text-xs text-text-muted font-mono">{server.uri}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {result && (
                        <span className={`text-xs ${result.ok ? 'text-status-success' : 'text-status-error'}`}>
                          {result.testing ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : result.ok ? (
                            `${result.latency}ms`
                          ) : (
                            'Offline'
                          )}
                        </span>
                      )}
                      <button
                        onClick={() => testLws(server.uri)}
                        className="text-xs px-2 py-1 rounded-md bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
                      >
                        Test
                      </button>
                      <button
                        onClick={() => isConnected ? disconnectLws() : connectLws(server.uri)}
                        disabled={lwsConnecting === server.uri}
                        className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                          isConnected
                            ? 'bg-status-success/10 text-status-success'
                            : 'bg-bg-hover text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {lwsConnecting === server.uri ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : isConnected ? 'Connected' : 'Connect'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Custom LWS */}
            <div className="glass-card p-4">
              <p className="text-sm font-medium text-text-primary mb-3">Custom LWS Server</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customLwsUri}
                  onChange={(e) => setCustomLwsUri(e.target.value)}
                  placeholder="https://your-lws-server:8443"
                  className="input-field text-sm flex-1"
                />
                <button
                  onClick={() => customLwsUri && connectLws(customLwsUri)}
                  disabled={!customLwsUri || lwsConnecting === customLwsUri}
                  className="btn-secondary text-sm"
                >
                  Connect
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <div className="glass-card p-5 space-y-4">
              <div>
                <h3 className="font-semibold text-text-primary mb-1">Recovery Seed</h3>
                <p className="text-xs text-text-muted">
                  Enter your wallet password to reveal your 25-word seed phrase.
                </p>
              </div>

              {!revealedSeed ? (
                <div className="space-y-3">
                  <input
                    type="password"
                    value={seedPassword}
                    onChange={(e) => setSeedPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && revealSeed()}
                    placeholder="Wallet password"
                    className="input-field"
                  />
                  {seedError && <p className="text-sm text-status-error">{seedError}</p>}
                  <button
                    onClick={revealSeed}
                    disabled={seedLoading}
                    className="btn-secondary flex items-center gap-2"
                  >
                    {seedLoading ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
                    {seedLoading ? 'Verifying...' : 'Reveal Seed'}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="bg-bg-primary rounded-lg p-4 mb-3">
                    <div className="grid grid-cols-5 gap-2">
                      {revealedSeed.split(' ').map((word, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-sm">
                          <span className="text-text-muted text-xs w-4 text-right">{i + 1}</span>
                          <span className="font-mono text-text-primary">{word}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => { setRevealedSeed(''); setSeedPassword('') }}
                    className="btn-secondary text-sm"
                  >
                    Hide Seed
                  </button>
                </div>
              )}
            </div>

            <div className="bg-status-warning/10 border border-status-warning/30 rounded-lg p-3">
              <div className="flex gap-2">
                <AlertTriangle size={16} className="text-status-warning shrink-0 mt-0.5" />
                <p className="text-sm text-status-warning">
                  Never share your seed phrase. Anyone with these words has full access to your funds.
                </p>
              </div>
            </div>

            {/* Wallet file location */}
            {walletDir && (
              <div className="glass-card p-4">
                <h3 className="font-semibold text-text-primary mb-2 text-sm">Wallet File Location</h3>
                <div className="flex items-center gap-2 mb-3">
                  <FolderOpen size={14} className="text-text-muted shrink-0" />
                  <code className="text-xs text-text-secondary font-mono break-all flex-1">{walletDir}</code>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.api.app.openFolder(walletDir)}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <FolderOpen size={12} /> Open Folder
                  </button>
                  <button
                    onClick={async () => {
                      const selected = await window.api.app.selectFolder()
                      if (selected) {
                        await window.api.app.setWalletDir(selected)
                        setWalletDir(selected)
                      }
                    }}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    Change Directory
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sounds Tab */}
        {activeTab === 'sounds' && (
          <div className="space-y-4">
            {/* Master toggle */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {masterEnabled
                    ? <Volume2 size={20} className="text-accent-primary" />
                    : <VolumeX  size={20} className="text-text-muted"    />
                  }
                  <div>
                    <p className="font-semibold text-text-primary">Sound Effects</p>
                    <p className="text-xs text-text-muted mt-0.5">Master switch for all app sounds</p>
                  </div>
                </div>
                {/* Toggle pill */}
                <button
                  onClick={() => setMaster(!masterEnabled)}
                  style={{
                    width: '48px',
                    height: '26px',
                    borderRadius: '13px',
                    border: 'none',
                    background: masterEnabled ? '#f26822' : 'rgba(255,255,255,0.1)',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '3px',
                    left: masterEnabled ? '25px' : '3px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                  }} />
                </button>
              </div>
            </div>

            {/* Per-sound rows */}
            <div className="glass-card divide-y divide-border">
              {(Object.keys(SOUND_META) as SoundKey[]).map((key) => {
                const meta = SOUND_META[key]
                const enabled = sounds[key]
                const dimmed = !masterEnabled || !enabled
                return (
                  <div
                    key={key}
                    className="p-4 flex items-center justify-between gap-4"
                    style={{ opacity: dimmed ? 0.45 : 1, transition: 'opacity 0.2s' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">{meta.label}</p>
                      <p className="text-xs text-text-muted mt-0.5">{meta.description}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Preview button */}
                      <button
                        onClick={() => {
                          const audio = new Audio(SOUND_ASSETS[key])
                          audio.volume = 0.7
                          audio.play().catch(() => {})
                        }}
                        title="Preview"
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.08)',
                          background: 'rgba(255,255,255,0.04)',
                          color: '#888',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'color 0.15s, background 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          ;(e.currentTarget as HTMLButtonElement).style.color = '#f26822'
                          ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(242,104,34,0.1)'
                        }}
                        onMouseLeave={(e) => {
                          ;(e.currentTarget as HTMLButtonElement).style.color = '#888'
                          ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'
                        }}
                      >
                        <Play size={12} />
                      </button>
                      {/* Per-sound toggle */}
                      <button
                        onClick={() => setSound(key, !enabled)}
                        disabled={!masterEnabled}
                        style={{
                          width: '40px',
                          height: '22px',
                          borderRadius: '11px',
                          border: 'none',
                          background: enabled && masterEnabled ? '#f26822' : 'rgba(255,255,255,0.1)',
                          position: 'relative',
                          cursor: masterEnabled ? 'pointer' : 'not-allowed',
                          transition: 'background 0.2s',
                          flexShrink: 0,
                        }}
                      >
                        <span style={{
                          position: 'absolute',
                          top: '2px',
                          left: enabled ? '20px' : '2px',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: '#fff',
                          transition: 'left 0.2s',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
                        }} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="text-xs text-text-muted px-1">
              Click <Play size={10} className="inline mb-0.5" /> to preview any sound. Settings are saved automatically.
            </p>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (() => {
          const LOG_LEVEL_COLOR: Record<string, string> = {
            info: '#b0c4b0',
            warn: '#f0c040',
            error: '#e05050',
            debug: '#666',
          }
          const SOURCE_COLOR: Record<string, string> = {
            wallet: '#f26822',
            node: '#4a9eff',
            lws: '#a78bfa',
            sync: '#34d399',
            app: '#888',
          }
          const filtered = logFilter === 'all' ? logs : logs.filter(e => e.source === logFilter)
          const sources = ['all', ...Array.from(new Set(logs.map(e => e.source)))]

          const fmtTime = (ts: number) => {
            const d = new Date(ts)
            return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}.${d.getMilliseconds().toString().padStart(3,'0')}`
          }

          return (
            <div className="space-y-3">
              {/* Toolbar */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1 flex-wrap">
                  {sources.map(s => (
                    <button
                      key={s}
                      onClick={() => setLogFilter(s)}
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: `1px solid ${logFilter === s ? (SOURCE_COLOR[s] || '#f26822') : 'rgba(255,255,255,0.08)'}`,
                        background: logFilter === s ? `${SOURCE_COLOR[s] || '#f26822'}15` : 'transparent',
                        color: logFilter === s ? (SOURCE_COLOR[s] || '#f26822') : '#666',
                        fontFamily: "'IBM Plex Mono', monospace",
                        cursor: 'pointer',
                        transition: 'all 0.12s',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { window.api.app.clearLogs(); setLogs([]) }}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-status-error transition-colors"
                >
                  <Trash2 size={12} />
                  Clear
                </button>
              </div>

              {/* Terminal */}
              <div style={{
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '8px',
                height: '420px',
                overflowY: 'auto',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                padding: '12px',
              }}>
                {filtered.length === 0 ? (
                  <div style={{ color: '#444', paddingTop: '8px' }}>No log entries yet.</div>
                ) : (
                  filtered.map(entry => (
                    <div key={entry.id} style={{ display: 'flex', gap: '8px', marginBottom: '3px', lineHeight: 1.5 }}>
                      <span style={{ color: '#444', flexShrink: 0, fontSize: '11px' }}>{fmtTime(entry.timestamp)}</span>
                      <span style={{
                        color: SOURCE_COLOR[entry.source] || '#888',
                        flexShrink: 0,
                        minWidth: '48px',
                        fontSize: '11px',
                      }}>
                        [{entry.source}]
                      </span>
                      <span style={{ color: LOG_LEVEL_COLOR[entry.level] || '#b0c4b0', wordBreak: 'break-word' }}>
                        {entry.message}
                      </span>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>

              <p style={{ fontSize: '11px', color: '#444', fontFamily: "'IBM Plex Mono', monospace" }}>
                {filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'} · max 500 retained
              </p>
            </div>
          )
        })()}
      </motion.div>
    </div>
  )
}
