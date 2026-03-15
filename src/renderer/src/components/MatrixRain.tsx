import { useEffect, useRef } from 'react'

// Code fragments pulled from this app's source — they drip down the screen
const CODE_POOL = [
  // keywords
  'const','async','await','import','export','return','function','interface',
  'type','void','null','true','false','new','class','private','readonly',
  // wallet domain
  'wallet','monero','balance','syncHeight','hash','XMR','fee','address',
  'node','height','confirmations','atomic','unlock','seed','viewKey',
  'encrypt','decrypt','relay','output','input','subaddress','ring',
  // actual function names
  'getBalance','getTxs','startSync','stopSync','relayTx','createTx',
  'sweepUnlocked','onOutputReceived','notifyNewPayment','walletService',
  'getUnlockedBalance','getPrimaryAddress','getNumConfirmations',
  // ipc / electron
  'ipcMain','ipcRenderer','contextBridge','BrowserWindow','webContents',
  'ipcMain.handle','ipcRenderer.invoke','preload',
  // react
  'useEffect','useState','useRef','useCallback','useFrame','useGLTF',
  // operators / punctuation
  '=>','||','&&','!==','===','...','{}','()','[]','=>{','0n','??','?.','::',
  // numbers that look like blockchain data
  '3630484','3630492','0.009819','0.0048','1200000','14400000',
  'MAINNET','monero-ts','bigint','Promise','Set','Map',
  // crypto feel
  '48VXA','NmoixNgE','ae7f3c','b82d19','0x00','SHA3','keccak',
  'ring_size','stealth','Pedersen','Bulletproof','CLSAG',
]

// Build a flat character array — single chars drawn per cell, with occasional
// short "word" bursts injected via a separate overlay pass
const CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' +
  '{}[]()<>=!;:.,|&$_/\\*+-@#%^~'

function randomChar() {
  // 15% chance of pulling from code pool (first char of a token)
  if (Math.random() < 0.15) {
    const token = CODE_POOL[Math.floor(Math.random() * CODE_POOL.length)]
    return token[0]
  }
  return CHARS[Math.floor(Math.random() * CHARS.length)]
}

interface Column {
  x: number        // pixel x
  y: number        // current head row (in cells)
  speed: number    // rows per frame tick
  length: number   // trail length
  tick: number     // frame accumulator
  // occasionally write a full token word at head
  word: string
  wordPos: number
}

export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const FONT_SIZE = 13
    const LINE_H = 18

    let W = 0, H = 0, cols = 0, rows = 0
    const columns: Column[] = []

    function resize() {
      const rect = canvas!.parentElement!.getBoundingClientRect()
      W = canvas!.width  = rect.width
      H = canvas!.height = rect.height
      cols = Math.floor(W / FONT_SIZE)
      rows = Math.floor(H / LINE_H)
      ctx!.clearRect(0, 0, W, H)

      // Rebuild columns preserving count
      columns.length = 0
      for (let i = 0; i < cols; i++) {
        columns.push(makeColumn(i, true))
      }
    }

    function makeColumn(colIdx: number, randomStart: boolean): Column {
      const word = CODE_POOL[Math.floor(Math.random() * CODE_POOL.length)]
      return {
        x: colIdx * FONT_SIZE,
        y: randomStart ? Math.floor(Math.random() * rows) : -Math.floor(Math.random() * 12),
        speed: 0.3 + Math.random() * 0.55,
        length: 8 + Math.floor(Math.random() * 18),
        tick: 0,
        word,
        wordPos: 0,
      }
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement!)
    resize()

    let frameId: number
    let lastTime = 0
    const INTERVAL = 42 // ~24 fps — slower drip feels more cinematic

    function draw(now: number) {
      frameId = requestAnimationFrame(draw)
      if (now - lastTime < INTERVAL) return
      lastTime = now

      // Fade previous frame — very transparent black wash gives the trail
      ctx!.fillStyle = 'rgba(0, 0, 0, 0.08)'
      ctx!.fillRect(0, 0, W, H)

      ctx!.font = `${FONT_SIZE}px "IBM Plex Mono", monospace`
      ctx!.textBaseline = 'top'

      for (const col of columns) {
        col.tick += col.speed
        if (col.tick < 1) continue
        col.tick -= 1

        const headRow = Math.floor(col.y)
        const headY = headRow * LINE_H

        // Pick character at head — prefer next char of current token word
        let headChar: string
        if (col.wordPos < col.word.length) {
          headChar = col.word[col.wordPos]
          col.wordPos++
        } else {
          // Possibly start a new word
          if (Math.random() < 0.06) {
            col.word = CODE_POOL[Math.floor(Math.random() * CODE_POOL.length)]
            col.wordPos = 0
            headChar = col.word[0]
          } else {
            headChar = randomChar()
          }
        }

        // Bright head — near white-orange
        ctx!.fillStyle = 'rgba(255, 220, 180, 0.85)'
        ctx!.fillText(headChar, col.x, headY)

        // Second char below head — mid bright
        ctx!.fillStyle = 'rgba(242, 104, 34, 0.55)'
        ctx!.fillText(randomChar(), col.x, headY + LINE_H)

        // Advance head
        col.y += col.speed

        // Reset when head exits bottom
        if (headRow > rows + col.length) {
          // Reassign same column slot
          const idx = Math.floor(col.x / FONT_SIZE)
          const fresh = makeColumn(idx, false)
          Object.assign(col, fresh)
        }
      }
    }

    frameId = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(frameId)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        opacity: 0.22,          // faint — content stays readable
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}
