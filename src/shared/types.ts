export interface WalletInfo {
  isOpen: boolean
  primaryAddress: string
  balance: string // atomic units as string (bigint serialization)
  unlockedBalance: string
  syncHeight: number
  chainHeight: number
  isSyncing: boolean
  networkType: 'mainnet' | 'stagenet' | 'testnet'
}

export interface TransactionInfo {
  hash: string
  isIncoming: boolean
  amount: string
  fee: string
  timestamp: number
  height: number
  confirmations: number
  address: string
  label?: string
  note?: string
}

export interface Contact {
  id: string
  name: string
  address: string
  notes?: string
  createdAt: number
  updatedAt: number
}

export interface NodeInfo {
  uri: string
  label: string
  isCustom?: boolean
}

export interface TxPreview {
  amount: string
  fee: string
  totalAmount: string
  txMetadata: string
}

export interface SyncData {
  contacts: Contact[]
  txLabels: Record<string, string>
  settings: Record<string, unknown>
  customNodes: NodeInfo[]
  version: number
  lastModified: number
}

export interface WalletCreatedResult {
  seed: string
  primaryAddress: string
  restoreHeight: number
}

export interface WalletProfile {
  filename: string      // e.g. "based_wallet" (without .keys)
  lastUsed: number | null // unix timestamp ms
}

export interface LogEntry {
  id: number
  timestamp: number
  level: 'info' | 'warn' | 'error' | 'debug'
  source: string
  message: string
}

// IPC API types
export interface WalletAPI {
  create: (password: string, walletName?: string) => Promise<WalletCreatedResult>
  restore: (seed: string, password: string, restoreHeight: number, walletName?: string) => Promise<void>
  open: (password: string, walletName?: string) => Promise<WalletInfo>
  close: () => Promise<void>
  listWallets: () => Promise<WalletProfile[]>
  getLastWallet: () => Promise<string | null>
  setLastWallet: (filename: string) => Promise<void>
  getInfo: () => Promise<WalletInfo>
  getBalance: () => Promise<{ balance: string; unlockedBalance: string }>
  getAddress: (accountIdx: number, subaddressIdx: number) => Promise<string>
  createSubaddress: (accountIdx: number, label?: string) => Promise<{ address: string; index: number }>
  getTransactions: () => Promise<TransactionInfo[]>
  createTx: (address: string, amount: string, priority: number) => Promise<TxPreview>
  sweepTx: (address: string, priority: number) => Promise<TxPreview>
  relayTx: (txMetadata: string) => Promise<string>
  startSync: () => Promise<void>
  stopSync: () => Promise<void>
  getSeed: (password: string) => Promise<string>
  walletExists: () => Promise<boolean>
  onSyncProgress: (callback: (progress: { height: number; startHeight: number; endHeight: number; percent: number }) => void) => () => void
  onBalanceChanged: (callback: (balance: { balance: string; unlockedBalance: string }) => void) => () => void
  onTransactionsChanged: (callback: () => void) => () => void
  onNewPayment: (callback: () => void) => () => void
}

export interface NodeAPI {
  connect: (uri: string) => Promise<{ height: number }>
  testConnection: (uri: string, silent?: boolean) => Promise<{ latency: number; height: number; isHealthy: boolean }>
  getBestNode: () => Promise<string>
  getDefaultNodes: () => NodeInfo[]
  getConnectedNode: () => Promise<string | null>
}

export interface LwsAPI {
  setServer: (uri: string) => Promise<void>
  getServer: () => Promise<string | null>
  isActive: () => Promise<boolean>
  register: () => Promise<{ newAddress: boolean; startHeight: number }>
  getBalance: () => Promise<{ balance: string; unlockedBalance: string; scannedHeight: number; blockchainHeight: number }>
  getTransactions: () => Promise<TransactionInfo[]>
  testServer: (uri: string) => Promise<{ ok: boolean; latency: number }>
}

export interface CloudSyncAPI {
  setSyncFolder: (folderPath: string) => Promise<void>
  getSyncFolder: () => Promise<string | null>
  sync: () => Promise<void>
  getContacts: () => Promise<Contact[]>
  saveContact: (contact: Contact) => Promise<void>
  deleteContact: (id: string) => Promise<void>
  setTxLabel: (txHash: string, label: string) => Promise<void>
  getTxLabels: () => Promise<Record<string, string>>
  setSyncPassphrase: (passphrase: string) => Promise<void>
}

export interface AppAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void
  selectFolder: () => Promise<string | null>
  getWalletDir: () => Promise<string>
  setWalletDir: (dir: string) => Promise<void>
  openFolder: (path: string) => Promise<void>
  getVersion: () => string
  getLogs: () => Promise<LogEntry[]>
  clearLogs: () => Promise<void>
  onLog: (callback: (entry: LogEntry) => void) => () => void
}

export interface PriceHistoryPoint {
  timestamp: number
  price: number
}

export type PriceTimeframe = '1' | '7' | '30' | '90' | '180' | '365' | 'max'

export interface PriceAPI {
  getXmrPrice: () => Promise<number | null>
  getXmrChange24h: () => Promise<number | null>
  getXmrPriceHistory: (days: PriceTimeframe) => Promise<PriceHistoryPoint[]>
}

export interface ElectronAPI {
  wallet: WalletAPI
  node: NodeAPI
  lws: LwsAPI
  cloudSync: CloudSyncAPI
  app: AppAPI
  price: PriceAPI
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
