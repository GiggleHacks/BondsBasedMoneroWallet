import { appLog } from '../utils/logger'
import type { PriceHistoryPoint } from '../../shared/types'

// CryptoCompare free public API — no key required, generous rate limits
const BASE = 'https://min-api.cryptocompare.com/data'

// Map our timeframe key → { endpoint, limit }
// histohour  = one point per hour
// histoday   = one point per day
function historyEndpoint(days: string): { url: string; pointCount: number } {
  switch (days) {
    case '1':   return { url: `${BASE}/v2/histohour?fsym=XMR&tsym=USD&limit=24`,   pointCount: 24 }
    case '7':   return { url: `${BASE}/v2/histohour?fsym=XMR&tsym=USD&limit=168`,  pointCount: 168 }
    case '30':  return { url: `${BASE}/v2/histoday?fsym=XMR&tsym=USD&limit=30`,    pointCount: 30 }
    case '90':  return { url: `${BASE}/v2/histoday?fsym=XMR&tsym=USD&limit=90`,    pointCount: 90 }
    case '180': return { url: `${BASE}/v2/histoday?fsym=XMR&tsym=USD&limit=180`,   pointCount: 180 }
    case '365': return { url: `${BASE}/v2/histoday?fsym=XMR&tsym=USD&limit=365`,   pointCount: 365 }
    case 'max': return { url: `${BASE}/v2/histoday?fsym=XMR&tsym=USD&limit=2000`,  pointCount: 2000 }
    default:    return { url: `${BASE}/v2/histoday?fsym=XMR&tsym=USD&limit=30`,    pointCount: 30 }
  }
}

class PriceService {
  private price: number | null = null
  private change24h: number | null = null
  private lastFetch: number = 0
  private readonly CACHE_MS = 4.5 * 60 * 1000 // 4.5 min — always fresh when dashboard polls every 5 min

  // Per-timeframe cache for historical data
  private historyCache = new Map<string, { data: PriceHistoryPoint[]; fetchedAt: number }>()

  private async fetchFresh(): Promise<void> {
    // Single call returns price + 24h change
    const res = await fetch(
      `${BASE}/pricemultifull?fsyms=XMR&tsyms=USD`,
      { signal: AbortSignal.timeout(10000) }
    )
    const json = await res.json()
    const raw = json?.RAW?.XMR?.USD
    this.price = raw?.PRICE ?? null
    this.change24h = raw?.CHANGEPCT24HOUR ?? null
    this.lastFetch = Date.now()
    if (this.price) appLog('info', 'app', `XMR price: $${this.price.toFixed(2)}, 24h: ${this.change24h?.toFixed(2) ?? '?'}%`)
  }

  private async ensureFresh(): Promise<void> {
    const now = Date.now()
    if (this.price !== null && now - this.lastFetch < this.CACHE_MS) return
    try {
      await this.fetchFresh()
    } catch (e) {
      appLog('warn', 'app', `Price fetch failed: ${e}`)
    }
  }

  async getXmrPrice(): Promise<number | null> {
    await this.ensureFresh()
    return this.price
  }

  async getXmrChange24h(): Promise<number | null> {
    await this.ensureFresh()
    return this.change24h
  }

  async getXmrPriceHistory(days: string): Promise<PriceHistoryPoint[]> {
    // Tiered TTL: short timeframes refresh more often
    const ttl = days === '1' ? 5 * 60 * 1000
              : days === '7' || days === '30' ? 15 * 60 * 1000
              : 60 * 60 * 1000

    const cached = this.historyCache.get(days)
    if (cached && Date.now() - cached.fetchedAt < ttl) {
      return cached.data
    }

    try {
      const { url } = historyEndpoint(days)
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
      const json = await res.json()

      // CryptoCompare response: { Data: { Data: [{ time, close, ... }] } }
      const points: any[] = json?.Data?.Data ?? []
      const data: PriceHistoryPoint[] = points
        .filter(p => p.close > 0) // skip empty/future buckets
        .map(p => ({
          timestamp: p.time * 1000, // seconds → milliseconds
          price: p.close,
        }))

      if (data.length > 0) {
        this.historyCache.set(days, { data, fetchedAt: Date.now() })
        appLog('info', 'app', `Price history fetched: ${data.length} points (${days}d)`)
        return data
      }
    } catch (e) {
      appLog('warn', 'app', `Price history fetch failed (${days}d): ${e}`)
    }

    return cached?.data ?? []
  }
}

export const priceService = new PriceService()
