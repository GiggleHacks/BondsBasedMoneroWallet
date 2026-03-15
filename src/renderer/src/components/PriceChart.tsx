import { useEffect, useRef, useCallback } from 'react'

export interface PriceHistoryPoint {
  timestamp: number
  price: number
}

interface Props {
  data: PriceHistoryPoint[]
  loading: boolean
  timeframe: string
}

const PADDING = { top: 20, right: 16, bottom: 32, left: 68 }

function formatPriceLabel(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (price >= 10) return `$${price.toFixed(2)}`
  return `$${price.toFixed(4)}`
}

function formatTimeLabel(ts: number, timeframe: string): string {
  const d = new Date(ts)
  if (timeframe === '1') {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  if (timeframe === '7') {
    return d.toLocaleDateString('en-US', { weekday: 'short' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTooltipDate(ts: number, timeframe: string): string {
  const d = new Date(ts)
  if (timeframe === '1') {
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function PriceChart({ data, loading, timeframe }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hoverIdx = useRef<number | null>(null)
  const rafPending = useRef(false)
  const sizeRef = useRef({ w: 0, h: 0 })

  const draw = useCallback(() => {
    rafPending.current = false
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = sizeRef.current.w
    const H = sizeRef.current.h
    const dpr = window.devicePixelRatio || 1

    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Background
    ctx.fillStyle = 'rgba(12, 12, 12, 0.6)'
    ctx.fillRect(0, 0, W, H)

    if (data.length < 2) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
      ctx.font = '13px "IBM Plex Mono", monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(loading ? 'Loading chart data...' : 'No data available', W / 2, H / 2)
      return
    }

    const chartW = W - PADDING.left - PADDING.right
    const chartH = H - PADDING.top - PADDING.bottom

    // Price range with 5% padding
    const prices = data.map(d => d.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const range = maxPrice - minPrice || 1
    const yMin = minPrice - range * 0.05
    const yMax = maxPrice + range * 0.05
    const yRange = yMax - yMin

    const xMin = data[0].timestamp
    const xMax = data[data.length - 1].timestamp
    const xRange = xMax - xMin || 1

    const toX = (ts: number) => PADDING.left + ((ts - xMin) / xRange) * chartW
    const toY = (price: number) => PADDING.top + (1 - (price - yMin) / yRange) * chartH

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)'
    ctx.lineWidth = 1
    ctx.font = '10px "IBM Plex Mono", monospace'
    ctx.textBaseline = 'middle'

    // Y-axis grid + labels
    const ySteps = 5
    ctx.textAlign = 'right'
    for (let i = 0; i <= ySteps; i++) {
      const price = yMin + (yRange / ySteps) * i
      const y = toY(price)
      ctx.beginPath()
      ctx.moveTo(PADDING.left, y)
      ctx.lineTo(W - PADDING.right, y)
      ctx.stroke()
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.fillText(formatPriceLabel(price), PADDING.left - 8, y)
    }

    // X-axis labels
    const labelCount = Math.min(6, data.length)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.floor((i / (labelCount - 1)) * (data.length - 1))
      const x = toX(data[idx].timestamp)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
      ctx.fillText(formatTimeLabel(data[idx].timestamp, timeframe), x, H - PADDING.bottom + 10)
    }

    // Price line
    ctx.beginPath()
    ctx.moveTo(toX(data[0].timestamp), toY(data[0].price))
    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(toX(data[i].timestamp), toY(data[i].price))
    }
    ctx.strokeStyle = '#f26822'
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.stroke()

    // Gradient fill under line
    const grad = ctx.createLinearGradient(0, PADDING.top, 0, H - PADDING.bottom)
    grad.addColorStop(0, 'rgba(242, 104, 34, 0.25)')
    grad.addColorStop(1, 'rgba(242, 104, 34, 0)')
    ctx.lineTo(toX(data[data.length - 1].timestamp), H - PADDING.bottom)
    ctx.lineTo(toX(data[0].timestamp), H - PADDING.bottom)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()

    // Hover indicator
    const hi = hoverIdx.current
    if (hi !== null && hi >= 0 && hi < data.length) {
      const hx = toX(data[hi].timestamp)
      const hy = toY(data[hi].price)

      // Vertical dashed line
      ctx.save()
      ctx.setLineDash([4, 4])
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(hx, PADDING.top)
      ctx.lineTo(hx, H - PADDING.bottom)
      ctx.stroke()
      ctx.restore()

      // Dot
      ctx.beginPath()
      ctx.arc(hx, hy, 5, 0, Math.PI * 2)
      ctx.fillStyle = '#f26822'
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 220, 180, 0.8)'
      ctx.lineWidth = 2
      ctx.stroke()

      // Outer glow
      ctx.beginPath()
      ctx.arc(hx, hy, 10, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(242, 104, 34, 0.15)'
      ctx.fill()

      // Tooltip
      const label = `$${data[hi].price.toFixed(2)}  ${formatTooltipDate(data[hi].timestamp, timeframe)}`
      ctx.font = '11px "IBM Plex Mono", monospace'
      const metrics = ctx.measureText(label)
      const tw = metrics.width + 16
      const th = 26
      let tx = hx - tw / 2
      if (tx < PADDING.left) tx = PADDING.left
      if (tx + tw > W - PADDING.right) tx = W - PADDING.right - tw
      let ty = hy - th - 14
      if (ty < PADDING.top) ty = hy + 14

      ctx.fillStyle = 'rgba(20, 20, 20, 0.92)'
      ctx.strokeStyle = 'rgba(242, 104, 34, 0.4)'
      ctx.lineWidth = 1
      const r = 6
      ctx.beginPath()
      ctx.moveTo(tx + r, ty)
      ctx.lineTo(tx + tw - r, ty)
      ctx.quadraticCurveTo(tx + tw, ty, tx + tw, ty + r)
      ctx.lineTo(tx + tw, ty + th - r)
      ctx.quadraticCurveTo(tx + tw, ty + th, tx + tw - r, ty + th)
      ctx.lineTo(tx + r, ty + th)
      ctx.quadraticCurveTo(tx, ty + th, tx, ty + th - r)
      ctx.lineTo(tx, ty + r)
      ctx.quadraticCurveTo(tx, ty, tx + r, ty)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = '#e0e0e0'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, tx + tw / 2, ty + th / 2)
    }
  }, [data, loading, timeframe])

  // Setup canvas + ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    const resize = () => {
      const rect = parent.getBoundingClientRect()
      sizeRef.current = { w: rect.width, h: rect.height }
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      draw()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(parent)
    resize()

    return () => ro.disconnect()
  }, [draw])

  // Redraw when data changes
  useEffect(() => { draw() }, [draw])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (data.length < 2) return
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const W = sizeRef.current.w
    const chartW = W - PADDING.left - PADDING.right

    // Map mouse X to data index
    const ratio = (mouseX - PADDING.left) / chartW
    const idx = Math.round(ratio * (data.length - 1))
    const clamped = Math.max(0, Math.min(data.length - 1, idx))

    if (hoverIdx.current !== clamped) {
      hoverIdx.current = clamped
      if (!rafPending.current) {
        rafPending.current = true
        requestAnimationFrame(draw)
      }
    }
  }, [data, draw])

  const handleMouseLeave = useCallback(() => {
    hoverIdx.current = null
    if (!rafPending.current) {
      rafPending.current = true
      requestAnimationFrame(draw)
    }
  }, [draw])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {loading && data.length === 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1,
        }}>
          <div style={{
            width: '32px', height: '32px',
            border: '2px solid rgba(242, 104, 34, 0.3)',
            borderTopColor: '#f26822',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      )}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          borderRadius: '8px',
          cursor: data.length > 1 ? 'crosshair' : 'default',
        }}
      />
    </div>
  )
}
