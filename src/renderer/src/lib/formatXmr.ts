const ATOMIC_UNITS = 1000000000000n // 10^12

export function atomicToXmr(atomic: string): string {
  if (!atomic || atomic === '0') return '0.000000000000'

  const value = BigInt(atomic)
  const whole = value / ATOMIC_UNITS
  const frac = value % ATOMIC_UNITS

  const fracStr = frac.toString().padStart(12, '0')
  return `${whole}.${fracStr}`
}

export function xmrToAtomic(xmr: string): string {
  const parts = xmr.split('.')
  const whole = parts[0] || '0'
  const frac = (parts[1] || '').padEnd(12, '0').slice(0, 12)
  const total = BigInt(whole) * ATOMIC_UNITS + BigInt(frac)
  return total.toString()
}

export function formatXmrDisplay(atomic: string, decimals: number = 4): string {
  const full = atomicToXmr(atomic)
  const parts = full.split('.')
  return `${parts[0]}.${parts[1].slice(0, decimals)}`
}

export function formatXmrFull(atomic: string): string {
  return atomicToXmr(atomic)
}

export function atomicToUsd(atomic: string, xmrPrice: number): number {
  const xmr = parseFloat(atomicToXmr(atomic))
  return xmr * xmrPrice
}

export function formatUsd(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function usdToAtomic(usd: string, xmrPrice: number): string {
  const xmrAmount = parseFloat(usd) / xmrPrice
  return xmrToAtomic(xmrAmount.toFixed(12))
}

export function truncateAddress(address: string, chars: number = 8): string {
  if (address.length <= chars * 2) return address
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
