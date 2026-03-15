import type { NodeInfo } from './types'

export const APP_NAME = "Bond's Based Monero Wallet"
export const APP_SUBTITLE = 'For GigaChads'

export const DEFAULT_NODES: NodeInfo[] = [
  { uri: 'https://node.sethforprivacy.com:443', label: 'Seth For Privacy' },
  { uri: 'http://nodes.hashvault.pro:18081', label: 'HashVault' },
  { uri: 'http://node3.monerodevs.org:18089', label: 'MoneroDevs' },
  { uri: 'http://nodex.monerujo.io:18081', label: 'Monerujo' },
  { uri: 'https://monero.stackwallet.com:18081', label: 'Stack Wallet' },
  { uri: 'https://xmr-node.cakewallet.com:18081', label: 'Cake Wallet' },
]

export const WALLET_FILENAME = 'based_wallet'
export const APP_CONFIG_FILENAME = 'app-config.json'

export const MONERO_GENESIS_TIMESTAMP = 1397818193 // April 18, 2014
export const MONERO_BLOCK_TIME = 120 // seconds

export const ATOMIC_UNITS_PER_XMR = 1000000000000n // 10^12

export const TX_PRIORITIES = [
  { value: 0, label: 'Default', description: 'Normal speed' },
  { value: 1, label: 'Low', description: 'Slower, lower fee' },
  { value: 2, label: 'Medium', description: 'Balanced' },
  { value: 3, label: 'High', description: 'Fastest, higher fee' },
]

export const SYNC_FILE_NAME = 'based-monero-sync.enc'
export const SYNC_VERSION = 1

export const AUTO_LOCK_TIMEOUT = 5 * 60 * 1000 // 5 minutes

// Light Wallet Servers (MyMonero-compatible LWS API)
// These servers receive your VIEW KEY (not spend key) to scan the chain for you.
// Trade-off: instant sync, but the server can see your balance & transaction history.
export const DEFAULT_LWS_SERVERS = [
  { uri: 'https://lws.xmr.to', label: 'XMR.to LWS' },
  { uri: 'https://lwsr.zelcash.online', label: 'Zel LWS' },
]
