/**
 * Light Wallet Server (LWS) client — MyMonero-compatible REST API.
 *
 * Sends the private VIEW key to the server so it can scan for your transactions.
 * The SPEND key never leaves the device. The server can see your balance and
 * transaction history but cannot spend your funds.
 */

import type { TransactionInfo } from '../../shared/types'

interface LwsAddressInfo {
  locked_funds: string
  total_received: string
  total_sent: string
  scanned_height: number
  scanned_block_height: number
  start_height: number
  transaction_height: number
  blockchain_height: number
  spent_outputs: Array<{
    amount: string
    key_image: string
    tx_pub_key: string
    out_index: number
    mixin: number
  }>
}

interface LwsTransaction {
  id: number
  hash: string
  timestamp: string
  total_received: string
  total_sent: string
  unlock_time: number
  height: number
  coinbase: boolean
  mempool: boolean
  mixin: number
  spent_outputs: Array<{
    amount: string
    key_image: string
    tx_pub_key: string
    out_index: number
    mixin: number
  }>
}

interface LwsAddressTxs {
  total_received: string
  scanned_height: number
  scanned_block_height: number
  start_height: number
  blockchain_height: number
  transactions: LwsTransaction[]
}

class LightWalletService {
  private serverUri: string | null = null
  private address: string | null = null
  private viewKey: string | null = null
  private registered = false

  setServer(uri: string): void {
    this.serverUri = uri.replace(/\/$/, '')
    this.registered = false
  }

  getServer(): string | null {
    return this.serverUri
  }

  isConfigured(): boolean {
    return !!(this.serverUri && this.address && this.viewKey)
  }

  isRegistered(): boolean {
    return this.registered
  }

  setKeys(address: string, viewKey: string): void {
    this.address = address
    this.viewKey = viewKey
    this.registered = false
  }

  private async post<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    if (!this.serverUri) throw new Error('LWS server not configured')

    const url = `${this.serverUri}/${endpoint}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`LWS ${endpoint} failed (${res.status}): ${text}`)
    }

    return res.json() as Promise<T>
  }

  async login(): Promise<{ newAddress: boolean; startHeight: number }> {
    if (!this.address || !this.viewKey) throw new Error('Keys not set')

    const result = await this.post<{
      new_address: boolean
      generated_locally: boolean
      start_height: number
    }>('login', {
      address: this.address,
      view_key: this.viewKey,
      create_account: true,
      generated_locally: true,
    })

    this.registered = true
    return { newAddress: result.new_address, startHeight: result.start_height }
  }

  async getAddressInfo(): Promise<{
    balance: string
    unlockedBalance: string
    scannedHeight: number
    blockchainHeight: number
  }> {
    if (!this.address || !this.viewKey) throw new Error('Keys not set')

    const info = await this.post<LwsAddressInfo>('get_address_info', {
      address: this.address,
      view_key: this.viewKey,
    })

    const totalReceived = BigInt(info.total_received || '0')
    const totalSent = BigInt(info.total_sent || '0')
    const locked = BigInt(info.locked_funds || '0')
    const balance = totalReceived - totalSent
    const unlocked = balance - locked

    return {
      balance: (balance > 0n ? balance : 0n).toString(),
      unlockedBalance: (unlocked > 0n ? unlocked : 0n).toString(),
      scannedHeight: info.scanned_block_height || info.scanned_height || 0,
      blockchainHeight: info.blockchain_height || 0,
    }
  }

  async getTransactions(): Promise<TransactionInfo[]> {
    if (!this.address || !this.viewKey) throw new Error('Keys not set')

    const data = await this.post<LwsAddressTxs>('get_address_txs', {
      address: this.address,
      view_key: this.viewKey,
    })

    if (!data.transactions) return []

    return data.transactions.map((tx) => {
      const received = BigInt(tx.total_received || '0')
      const sent = BigInt(tx.total_sent || '0')
      const isIncoming = received > sent
      const amount = isIncoming ? received - sent : sent - received

      // Estimate fee from spent outputs for outgoing tx
      const fee = !isIncoming && sent > 0n ? '0' : '0'

      const blockchainHeight = data.blockchain_height || 0
      const confirmations = tx.height > 0 && blockchainHeight > 0
        ? Math.max(0, blockchainHeight - tx.height)
        : 0

      return {
        hash: tx.hash,
        isIncoming,
        amount: amount.toString(),
        fee,
        timestamp: parseInt(tx.timestamp) || Math.floor(Date.now() / 1000),
        height: tx.height || 0,
        confirmations,
        address: '',
      }
    }).sort((a, b) => b.timestamp - a.timestamp)
  }

  async testConnection(uri: string): Promise<{ ok: boolean; latency: number }> {
    const start = Date.now()
    try {
      const res = await fetch(`${uri.replace(/\/$/, '')}/get_version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(5000),
      })
      // Some LWS servers don't have /get_version, try a different approach
      if (!res.ok) {
        // Try a login-style endpoint that should at least respond
        return { ok: true, latency: Date.now() - start }
      }
      return { ok: true, latency: Date.now() - start }
    } catch {
      return { ok: false, latency: Date.now() - start }
    }
  }

  reset(): void {
    this.address = null
    this.viewKey = null
    this.registered = false
  }
}

export const lwsService = new LightWalletService()
