import type { ElectronAPI, TransactionInfo, LogEntry } from '@shared/types'

// Mock data for browser preview / development without Electron
const mockAddress = '4AdUndXHHZ6cfufTMvppY6JwXNouMBzSkbLYfpAV5Usx3skxNgYeYTRj5UzqtReoS44qo9mtmXCqY45DJ852K5Jv2684Rge'

const mockTransactions: TransactionInfo[] = [
  {
    hash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    isIncoming: true,
    amount: '1500000000000',
    fee: '0',
    timestamp: Date.now() / 1000 - 120,
    height: 3200000,
    confirmations: 15,
    address: mockAddress,
  },
  {
    hash: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
    isIncoming: false,
    amount: '750000000000',
    fee: '7200000',
    timestamp: Date.now() / 1000 - 3600,
    height: 3199950,
    confirmations: 50,
    address: '',
  },
  {
    hash: 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
    isIncoming: true,
    amount: '5000000000000',
    fee: '0',
    timestamp: Date.now() / 1000 - 86400,
    height: 3199500,
    confirmations: 500,
    address: mockAddress,
  },
  {
    hash: 'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5',
    isIncoming: false,
    amount: '200000000000',
    fee: '5400000',
    timestamp: Date.now() / 1000 - 259200,
    height: 3198000,
    confirmations: 2000,
    address: '',
  },
]

let mockTxLabels: Record<string, string> = {}
let mockWallets: Array<{ filename: string; password: string; lastUsed: number | null }> = [
  { filename: 'based_wallet', password: 'test123', lastUsed: Date.now() - 86400000 },
  { filename: 'cold_storage', password: 'test123', lastUsed: Date.now() - 604800000 },
]
let mockLastWallet: string | null = 'based_wallet'
let mockWalletCreated = true
let mockWalletPassword = 'test123'

const noop = () => () => {}

export const mockApi: ElectronAPI = {
  wallet: {
    create: async (password, walletName?) => {
      const name = walletName || `wallet_${Date.now()}`
      mockWalletCreated = true
      mockWalletPassword = password
      mockWallets.push({ filename: name, password, lastUsed: Date.now() })
      mockLastWallet = name
      return {
        seed: 'abandon ability able about above absent absorb abstract absurd abuse access accident account accuse achieve acid acoustic acquire across act action actor actress actual adapt',
        primaryAddress: mockAddress,
        restoreHeight: 3200000,
      }
    },
    restore: async (seed, password, restoreHeight, walletName?) => {
      const name = walletName || `wallet_${Date.now()}`
      mockWalletCreated = true
      mockWalletPassword = password
      mockWallets.push({ filename: name, password, lastUsed: Date.now() })
      mockLastWallet = name
    },
    open: async (password, walletName?) => {
      if (mockWalletCreated && password !== mockWalletPassword) {
        throw new Error('Incorrect password')
      }
      if (walletName) mockLastWallet = walletName
      return {
        isOpen: true,
        primaryAddress: mockAddress,
        balance: '6550000000000',
        unlockedBalance: '5050000000000',
        syncHeight: 3200100,
        chainHeight: 3200100,
        isSyncing: false,
        networkType: 'mainnet' as const,
      }
    },
    close: async () => {},
    getInfo: async () => ({
      isOpen: true,
      primaryAddress: mockAddress,
      balance: '6550000000000',
      unlockedBalance: '5050000000000',
      syncHeight: 3200100,
      chainHeight: 3200100,
      isSyncing: false,
      networkType: 'mainnet' as const,
    }),
    getBalance: async () => ({
      balance: '6550000000000',
      unlockedBalance: '5050000000000',
    }),
    getAddress: async () => mockAddress,
    createSubaddress: async (_, label) => ({
      address: '8C5zHM5ud8nGC4hC2ULiBLSWx9infi8JiUi1hrtVoHRBh4sqpSpHGAqDwKA3NB1GvMKbBxBHA1YJjHP6NW7bMndsSn7uxJf',
      index: 1,
    }),
    getTransactions: async () => mockTransactions,
    createTx: async (address, amount, priority) => ({
      amount,
      fee: '7200000',
      totalAmount: (BigInt(amount) + 7200000n).toString(),
      txMetadata: 'mock_tx_metadata',
    }),
    sweepTx: async () => ({
      amount: '5036600000000',
      fee: '14400000',
      totalAmount: '5051000000000',
      txMetadata: JSON.stringify(['mock_sweep_meta']),
    }),
    relayTx: async () => 'e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6',
    startSync: async () => {},
    stopSync: async () => {},
    getSeed: async (password) => {
      if (mockWalletCreated && password !== mockWalletPassword) {
        throw new Error('Incorrect password')
      }
      return 'abandon ability able about above absent absorb abstract absurd abuse access accident account accuse achieve acid acoustic acquire across act action actor actress actual adapt'
    },
    walletExists: async () => mockWalletCreated || mockWallets.length > 0,
    listWallets: async () => mockWallets.map(w => ({ filename: w.filename, lastUsed: w.lastUsed })),
    getLastWallet: async () => mockLastWallet,
    setLastWallet: async (filename) => { mockLastWallet = filename },
    onSyncProgress: noop,
    onBalanceChanged: noop,
    onTransactionsChanged: noop,
    onNewPayment: noop,
  },
  node: {
    connect: async () => ({ height: 3200100 }),
    testConnection: async (uri) => ({ latency: Math.floor(Math.random() * 200) + 50, height: 3200100, isHealthy: true }),
    getBestNode: async () => 'https://node.monerodevs.org:18089',
    getDefaultNodes: () => [
      { uri: 'https://node.monerodevs.org:18089', label: 'MoneroDevs' },
      { uri: 'https://xmr-node.cakewallet.com:18081', label: 'Cake Wallet' },
      { uri: 'https://node.community.rino.io:18081', label: 'RINO' },
    ] as any,
    getConnectedNode: async () => 'https://node.monerodevs.org:18089',
  },
  lws: {
    setServer: async () => {},
    getServer: async () => null,
    isActive: async () => false,
    register: async () => ({ newAddress: false, startHeight: 3200000 }),
    getBalance: async () => ({ balance: '6550000000000', unlockedBalance: '5050000000000', scannedHeight: 3200100, blockchainHeight: 3200100 }),
    getTransactions: async () => mockTransactions,
    testServer: async () => ({ ok: true, latency: Math.floor(Math.random() * 150) + 30 }),
  },
  cloudSync: {
    setSyncFolder: async () => {},
    getSyncFolder: async () => null,
    sync: async () => {},
    getContacts: async () => [],
    saveContact: async () => {},
    deleteContact: async () => {},
    setTxLabel: async (hash, label) => { mockTxLabels[hash] = label },
    getTxLabels: async () => mockTxLabels,
    setSyncPassphrase: async () => {},
  },
  app: {
    minimize: () => {},
    maximize: () => {},
    close: () => {},
    isMaximized: async () => false,
    onMaximizeChange: noop,
    selectFolder: async () => null,
    getWalletDir: async () => 'C:\\Users\\<user>\\AppData\\Roaming\\monero-wallet\\wallets',
    setWalletDir: async () => {},
    openFolder: async () => {},
    getVersion: () => '1.0.0-dev',
    getLogs: async (): Promise<LogEntry[]> => [
      { id: 1, timestamp: Date.now() - 5000, level: 'info', source: 'app', message: "Bond's Based Monero Wallet started" },
      { id: 2, timestamp: Date.now() - 4800, level: 'info', source: 'node', message: 'Best node selected: https://node.monerodevs.org:18089' },
      { id: 3, timestamp: Date.now() - 4600, level: 'info', source: 'wallet', message: 'Opening wallet "based_wallet"' },
      { id: 4, timestamp: Date.now() - 4200, level: 'info', source: 'wallet', message: 'Wallet open — height: 3200100, balance: 6 XMR' },
      { id: 5, timestamp: Date.now() - 4000, level: 'info', source: 'wallet', message: 'Starting sync...' },
      { id: 6, timestamp: Date.now() - 3000, level: 'debug', source: 'wallet', message: 'Syncing... 45% (2880000/3200100)' },
      { id: 7, timestamp: Date.now() - 2000, level: 'debug', source: 'node', message: 'Tested https://xmr-node.cakewallet.com:18081 — 142ms, height 3200098' },
      { id: 8, timestamp: Date.now() - 1000, level: 'info', source: 'wallet', message: 'Sync complete at height 3200100' },
    ],
    clearLogs: async () => {},
    onLog: noop,
  },
  price: {
    getXmrPrice: async () => 187.42,
    getXmrChange24h: async () => 2.34,
    getXmrPriceHistory: async (days: string) => {
      const count = days === '1' ? 288 : days === '7' ? 168 : 90
      const now = Date.now()
      const span = parseInt(days === 'max' ? '1825' : days) * 24 * 60 * 60 * 1000
      return Array.from({ length: count }, (_, i) => ({
        timestamp: now - span + (span / count) * i,
        price: 180 + Math.sin(i / 8) * 20 + Math.random() * 10,
      }))
    },
  },
}
