import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from 'fs'
import { getWalletDir, getWalletPath, getAppConfigPath } from '../utils/paths'
import { WALLET_FILENAME } from '../../shared/constants'
import type { WalletInfo, TransactionInfo, TxPreview, WalletCreatedResult, WalletProfile } from '../../shared/types'
import { appLog } from '../utils/logger'
import { isHttps } from '../utils/validators'

// monero-ts WASM (Emscripten) calls document.getElementById(...).textContent during
// certain operations for progress reporting. The main process has no DOM, so we
// provide a minimal stub to prevent "Cannot set properties of null" crashes.
if (typeof (global as any).document === 'undefined') {
  const noop = { textContent: '', innerHTML: '', style: {} }
  ;(global as any).document = {
    getElementById: () => noop,
    createElement: () => noop,
    body: { appendChild: () => {} },
  }
}

// Load monero-ts via require so it works reliably in Electron main process
let moneroTs: any = null
try {
  moneroTs = require('monero-ts')
  console.log('[wallet] monero-ts loaded successfully')
} catch (e) {
  console.error('[wallet] monero-ts failed to load:', e)
}

/** Build daemon server config with proper TLS handling. */
function buildServerConfig(uri: string | undefined): any {
  if (!uri) return undefined
  return {
    uri,
    // Only skip cert validation for HTTP (plain) connections where it's irrelevant.
    // For HTTPS, validate certs to prevent MITM attacks.
    rejectUnauthorized: isHttps(uri),
  }
}

class WalletService {
  private wallet: any = null
  private currentWalletName: string | null = null
  private syncListeners: Array<(progress: any) => void> = []
  private balanceListeners: Array<(balance: any) => void> = []
  private txListeners: Array<() => void> = []
  private paymentListeners: Array<() => void> = []
  private saveInterval: ReturnType<typeof setInterval> | null = null
  private seenIncomingTxHashes: Set<string> = new Set()
  private initialSyncDone: boolean = false

  listWallets(): WalletProfile[] {
    const dir = getWalletDir()
    if (!existsSync(dir)) return []
    try {
      const files = readdirSync(dir)
      return files
        .filter(f => f.endsWith('.keys'))
        .map(f => {
          const filename = f.replace(/\.keys$/, '')
          let lastUsed: number | null = null
          try {
            const stat = statSync(getWalletPath(f))
            lastUsed = stat.mtimeMs
          } catch {}
          return { filename, lastUsed }
        })
        .sort((a, b) => (b.lastUsed ?? 0) - (a.lastUsed ?? 0))
    } catch {
      return []
    }
  }

  getLastWallet(): string | null {
    try {
      const configPath = getAppConfigPath()
      if (!existsSync(configPath)) return null
      const data = JSON.parse(readFileSync(configPath, 'utf-8'))
      return data.lastWallet ?? null
    } catch {
      return null
    }
  }

  setLastWallet(filename: string): void {
    try {
      const configPath = getAppConfigPath()
      let data: any = {}
      if (existsSync(configPath)) {
        try { data = JSON.parse(readFileSync(configPath, 'utf-8')) } catch {}
      }
      data.lastWallet = filename
      writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8')
    } catch (e) {
      console.error('[wallet] setLastWallet error:', e)
    }
  }

  async createWallet(password: string, serverUri?: string, walletName?: string): Promise<WalletCreatedResult> {
    if (!moneroTs) throw new Error('monero-ts is not available. Please run: npm install monero-ts')

    const walletDir = getWalletDir()
    if (!existsSync(walletDir)) {
      mkdirSync(walletDir, { recursive: true })
    }

    const name = walletName || this.generateWalletName()
    const path = getWalletPath(name)

    // Refuse to overwrite existing wallet files — prevents silent data loss (M4 fix)
    if (existsSync(path) || existsSync(path + '.keys')) {
      throw new Error(`A wallet named "${name}" already exists. Choose a different name.`)
    }

    this.wallet = await moneroTs.createWalletFull({
      path,
      password,
      networkType: moneroTs.MoneroNetworkType.MAINNET,
      server: buildServerConfig(serverUri),
    })

    const seed = await this.wallet.getSeed()
    const address = await this.wallet.getPrimaryAddress()

    // Get current chain height for restoreHeight — critical for future wallet recovery (H5 fix)
    let restoreHeight = 0
    try {
      restoreHeight = await this.wallet.getDaemonHeight()
    } catch {
      appLog('warn', 'wallet', 'Could not fetch daemon height for restoreHeight — defaulting to 0')
    }

    await this.wallet.save()
    this.currentWalletName = name
    this.setLastWallet(name)

    return {
      seed,
      primaryAddress: address,
      restoreHeight,
    }
  }

  async restoreWallet(seed: string, password: string, restoreHeight: number, serverUri?: string, walletName?: string): Promise<void> {
    if (!moneroTs) throw new Error('monero-ts is not available')

    const walletDir = getWalletDir()
    if (!existsSync(walletDir)) {
      mkdirSync(walletDir, { recursive: true })
    }

    const name = walletName || this.generateWalletName()
    const path = getWalletPath(name)

    // Close any open wallet first
    if (this.wallet) {
      try { await this.wallet.save() } catch {}
      try { await this.wallet.close() } catch {}
      this.wallet = null
    }

    // Refuse to overwrite existing wallet files (M4 fix)
    if (existsSync(path) || existsSync(path + '.keys')) {
      throw new Error(`A wallet named "${name}" already exists. Choose a different name.`)
    }

    this.wallet = await moneroTs.createWalletFull({
      path,
      password,
      networkType: moneroTs.MoneroNetworkType.MAINNET,
      seed,
      restoreHeight,
      server: buildServerConfig(serverUri),
    })

    await this.wallet.save()
    this.currentWalletName = name
    this.setLastWallet(name)
  }

  async openWallet(password: string, serverUri?: string, walletName?: string): Promise<WalletInfo> {
    if (!moneroTs) throw new Error('monero-ts is not available')

    const name = walletName || WALLET_FILENAME
    const path = getWalletPath(name)

    this.wallet = await moneroTs.openWalletFull({
      path,
      password,
      networkType: moneroTs.MoneroNetworkType.MAINNET,
      server: buildServerConfig(serverUri),
    })

    this.currentWalletName = name
    this.setLastWallet(name)

    return this.getInfo()
  }

  async closeWallet(): Promise<void> {
    if (this.saveInterval) { clearInterval(this.saveInterval); this.saveInterval = null }
    if (this.wallet) {
      try { await this.wallet.save() } catch {}
      try { await this.wallet.close() } catch {}
      this.wallet = null
    }
  }

  async getInfo(): Promise<WalletInfo> {
    if (!this.wallet) {
      return {
        isOpen: false,
        primaryAddress: '',
        balance: '0',
        unlockedBalance: '0',
        syncHeight: 0,
        chainHeight: 0,
        isSyncing: false,
        networkType: 'mainnet',
      }
    }

    try {
      const [balance, unlockedBalance, height, daemonHeight, address, syncing] = await Promise.all([
        this.wallet.getBalance(),
        this.wallet.getUnlockedBalance(),
        this.wallet.getHeight(),
        this.wallet.getDaemonHeight().catch(() => 0),
        this.wallet.getPrimaryAddress(),
        this.wallet.isSyncing().catch(() => false),
      ])

      return {
        isOpen: true,
        primaryAddress: address,
        balance: balance.toString(),
        unlockedBalance: unlockedBalance.toString(),
        syncHeight: height,
        chainHeight: daemonHeight,
        isSyncing: syncing,
        networkType: 'mainnet',
      }
    } catch (e) {
      console.error('[wallet] getInfo error:', e)
      return {
        isOpen: true,
        primaryAddress: await this.wallet.getPrimaryAddress().catch(() => ''),
        balance: '0',
        unlockedBalance: '0',
        syncHeight: 0,
        chainHeight: 0,
        isSyncing: false,
        networkType: 'mainnet',
      }
    }
  }

  async getBalance(): Promise<{ balance: string; unlockedBalance: string }> {
    if (!this.wallet) return { balance: '0', unlockedBalance: '0' }
    try {
      const balance = await this.wallet.getBalance()
      const unlockedBalance = await this.wallet.getUnlockedBalance()
      return { balance: balance.toString(), unlockedBalance: unlockedBalance.toString() }
    } catch {
      return { balance: '0', unlockedBalance: '0' }
    }
  }

  async getAddress(accountIdx: number, subaddressIdx: number): Promise<string> {
    if (!this.wallet) return ''
    return this.wallet.getAddress(accountIdx, subaddressIdx)
  }

  async createSubaddress(accountIdx: number, label?: string): Promise<{ address: string; index: number }> {
    if (!this.wallet) throw new Error('Wallet not open')
    const subaddress = await this.wallet.createSubaddress(accountIdx, label)
    return {
      address: subaddress.getAddress(),
      index: subaddress.getIndex(),
    }
  }

  async getTransactions(): Promise<TransactionInfo[]> {
    if (!this.wallet) {
      appLog('warn', 'wallet', 'getTransactions called but no wallet is open')
      return []
    }
    try {
      // Log current sync state so we know if wallet has caught up
      const syncH = await this.wallet.getHeight().catch(() => 0)
      const daemonH = await this.wallet.getDaemonHeight().catch(() => 0)
      appLog('debug', 'wallet', `getTransactions — wallet height: ${syncH}, daemon height: ${daemonH}`)

      const txs = await this.wallet.getTxs()
      appLog('info', 'wallet', `getTxs returned ${txs?.length ?? 0} transaction(s)`)

      if (!txs || txs.length === 0) return []

      const result: TransactionInfo[] = []
      for (const tx of txs) {
        try {
          // isIncoming may be a method or a property depending on monero-ts version
          const isIncoming: boolean =
            typeof tx.isIncoming === 'function' ? (tx.isIncoming() ?? false) : (tx.isIncoming ?? false)

          // getIncomingAmount / getOutgoingAmount may return BigInt or undefined
          let amount = '0'
          try {
            const raw = isIncoming ? tx.getIncomingAmount() : tx.getOutgoingAmount()
            if (raw != null) amount = raw.toString()
          } catch {}

          // getFee may return BigInt or undefined
          let fee = '0'
          try {
            const rawFee = tx.getFee()
            if (rawFee != null) fee = rawFee.toString()
          } catch {}

          result.push({
            hash: tx.getHash?.() || tx.hash || '',
            isIncoming,
            amount,
            fee,
            timestamp: tx.getBlock?.()?.getTimestamp?.() || Math.floor(Date.now() / 1000),
            height: tx.getHeight?.() || 0,
            confirmations: tx.getNumConfirmations?.() || 0,
            address: '',
          })
        } catch (e) {
          appLog('warn', 'wallet', `Failed to map tx: ${String(e)}`)
        }
      }

      appLog('info', 'wallet', `Mapped ${result.length} of ${txs.length} transactions successfully`)
      return result
    } catch (e) {
      appLog('error', 'wallet', `getTransactions error: ${String(e)}`)
      return []
    }
  }

  /**
   * Validate a Monero address using monero-ts (cryptographic validation).
   * Throws on invalid address.
   */
  private async validateAddress(address: string): Promise<void> {
    if (!moneroTs) throw new Error('monero-ts is not available')
    try {
      await moneroTs.MoneroUtils.validateAddress(address, moneroTs.MoneroNetworkType.MAINNET)
    } catch {
      throw new Error('Invalid Monero address (failed cryptographic validation)')
    }
  }

  async createTx(address: string, amount: string, priority: number): Promise<TxPreview> {
    if (!this.wallet) throw new Error('Wallet not open')
    // Server-side address validation before constructing the tx
    await this.validateAddress(address)
    const tx = await this.wallet.createTx({
      accountIndex: 0,
      address,
      amount: BigInt(amount),
      priority,
      relay: false,
    })
    return {
      amount,
      fee: tx.getFee().toString(),
      totalAmount: (BigInt(amount) + tx.getFee()).toString(),
      txMetadata: tx.getMetadata(),
    }
  }

  /**
   * Lightweight fee estimate based on priority without constructing a full tx.
   * Uses monero-ts fee estimation if available, otherwise a simple lookup.
   */
  async estimateFee(priority: number): Promise<string> {
    if (!this.wallet) throw new Error('Wallet not open')
    // Base fee estimation: ~0.000012 XMR for a typical 2-input tx at default priority
    // Priority multipliers: 0=1x, 1=1x, 2=5x, 3=25x (approximate)
    const baseFeeAtomic = 12000000n // ~0.000012 XMR
    const multipliers = [1n, 1n, 5n, 25n]
    const mult = multipliers[priority] ?? 1n
    return (baseFeeAtomic * mult).toString()
  }

  async createSweepTx(address: string, priority: number): Promise<TxPreview> {
    if (!this.wallet) throw new Error('Wallet not open')
    await this.validateAddress(address)
    const txs = await this.wallet.sweepUnlocked({ address, accountIndex: 0, priority, relay: false })
    if (!txs || txs.length === 0) throw new Error('No spendable outputs')
    const totalFee = txs.reduce((sum: bigint, tx: any) => sum + tx.getFee(), 0n)
    const unlockedBal = await this.wallet.getUnlockedBalance()
    const sendAmount = unlockedBal - totalFee
    return {
      amount: sendAmount.toString(),
      fee: totalFee.toString(),
      totalAmount: unlockedBal.toString(),
      txMetadata: JSON.stringify(txs.map((tx: any) => tx.getMetadata())),
    }
  }

  async relayTx(txMetadata: string): Promise<string> {
    if (!this.wallet) throw new Error('Wallet not open')
    if (txMetadata.trim().startsWith('[')) {
      const list: string[] = JSON.parse(txMetadata)
      const hashes: string[] = []
      for (const meta of list) hashes.push(await this.wallet.relayTx(meta))
      return hashes[0]
    }
    return this.wallet.relayTx(txMetadata)
  }

  async startSync(): Promise<void> {
    if (!this.wallet) return

    // Reset state for fresh start
    this.seenIncomingTxHashes.clear()
    this.initialSyncDone = false

    // Remove any existing listeners to prevent accumulation across re-syncs
    try { await this.wallet.removeAllListeners() } catch {}

    const listener = new moneroTs.MoneroWalletListener()
    listener.onSyncProgress = async (height: number, startHeight: number, endHeight: number, percentDone: number) => {
      this.syncListeners.forEach(cb => cb({ height, startHeight, endHeight, percent: percentDone }))

      // Once we reach the chain tip, snapshot all existing txs so we
      // don't play the sound for anything the user already had.
      if (!this.initialSyncDone && percentDone >= 1.0) {
        await this.markInitialSyncDone()
      }
    }
    listener.onOutputReceived = (output: any) => {
      this.notifyBalanceChange()
      this.notifyTxChange()
      // Only notify about new payments after the initial sync catches up
      if (this.initialSyncDone) {
        // Extract tx hash directly from the output event to avoid
        // re-scanning all transactions (M1 performance fix)
        const txHash = output?.getTx?.()?.getHash?.()
        if (txHash) {
          this.notifyNewPaymentForTx(txHash)
        }
      }
    }
    listener.onOutputSpent = () => { this.notifyBalanceChange(); this.notifyTxChange() }

    await this.wallet.addListener(listener)
    await this.wallet.startSyncing(10000)

    // If the wallet is already at chain tip, onSyncProgress may not fire for up
    // to 10 s (the sync interval). Check immediately so payment detection works
    // right away for a wallet that opened already-synced.
    try {
      const height = await this.wallet.getHeight()
      const daemonHeight = await this.wallet.getDaemonHeight().catch(() => 0)
      if (daemonHeight > 0 && height >= daemonHeight - 2) {
        appLog('debug', 'wallet', `Wallet already at chain tip (${height}/${daemonHeight}) — marking sync done`)
        await this.markInitialSyncDone()
      }
    } catch {}

    // Periodically save wallet to persist sync progress
    if (this.saveInterval) clearInterval(this.saveInterval)
    this.saveInterval = setInterval(async () => {
      if (this.wallet) {
        try { await this.wallet.save() } catch (e) {
          console.error('[wallet] periodic save failed:', e)
        }
      }
    }, 120_000)
  }

  private async markInitialSyncDone(): Promise<void> {
    if (this.initialSyncDone) return // Already done — guard against double-call
    this.initialSyncDone = true
    try {
      const txs = await this.wallet.getTxs()
      for (const tx of txs) {
        const hash = tx.getHash?.()
        if (hash) this.seenIncomingTxHashes.add(hash)
      }
      appLog('debug', 'wallet', `Initial sync done — seeded ${this.seenIncomingTxHashes.size} tx hash(es)`)
    } catch {}
  }

  async stopSync(): Promise<void> {
    if (this.saveInterval) { clearInterval(this.saveInterval); this.saveInterval = null }
    if (!this.wallet) return
    try { await this.wallet.stopSyncing() } catch {}
  }

  async getSeed(password: string): Promise<string> {
    if (!this.wallet) throw new Error('Wallet not open')
    if (!moneroTs) throw new Error('monero-ts is not available')

    // Validate password by attempting to open with it, but close immediately
    // to minimize key material in memory (C2 fix)
    const path = getWalletPath(this.currentWalletName || WALLET_FILENAME)
    let testWallet: any = null
    try {
      testWallet = await moneroTs.openWalletFull({
        path,
        password,
        networkType: moneroTs.MoneroNetworkType.MAINNET,
      })
      const seed = await testWallet.getSeed()
      // Close test wallet immediately — don't keep two wallet instances in memory
      await testWallet.close()
      testWallet = null
      return seed
    } catch {
      // Ensure cleanup even on error
      if (testWallet) {
        try { await testWallet.close() } catch {}
      }
      throw new Error('Incorrect password')
    }
  }

  async setDaemon(uri: string): Promise<void> {
    if (!this.wallet) throw new Error('Wallet not open')
    await this.wallet.setDaemonConnection(buildServerConfig(uri))
    appLog('info', 'wallet', 'Daemon connection switched')
  }

  async getPrivateViewKey(): Promise<string> {
    if (!this.wallet) throw new Error('Wallet not open')
    return this.wallet.getPrivateViewKey()
  }

  async getPrimaryAddress(): Promise<string> {
    if (!this.wallet) throw new Error('Wallet not open')
    return this.wallet.getPrimaryAddress()
  }

  walletExists(): boolean {
    return this.listWallets().length > 0
  }

  private generateWalletName(): string {
    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `wallet_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  }

  onSyncProgress(callback: (progress: any) => void): void {
    this.syncListeners.push(callback)
  }

  onBalanceChanged(callback: (balance: any) => void): void {
    this.balanceListeners.push(callback)
  }

  onTransactionsChanged(callback: () => void): void {
    this.txListeners.push(callback)
  }

  onNewPayment(callback: () => void): void {
    this.paymentListeners.push(callback)
  }

  private async notifyBalanceChange(): Promise<void> {
    const balance = await this.getBalance()
    this.balanceListeners.forEach(cb => cb(balance))
  }

  private notifyTxChange(): void {
    this.txListeners.forEach(cb => cb())
  }

  /**
   * Optimized payment notification — checks a single tx hash from the output event
   * instead of re-scanning the entire transaction history (M1 fix).
   */
  private notifyNewPaymentForTx(txHash: string): void {
    if (!txHash || this.seenIncomingTxHashes.has(txHash)) return
    this.seenIncomingTxHashes.add(txHash)
    appLog('debug', 'wallet', `New incoming tx: ${txHash.slice(0, 16)}...`)
    appLog('info', 'wallet', 'New incoming payment detected!')
    this.paymentListeners.forEach(cb => cb())
  }
}

export const walletService = new WalletService()
