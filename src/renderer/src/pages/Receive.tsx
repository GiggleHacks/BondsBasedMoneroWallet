import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Copy, Check, Plus, QrCode, X } from 'lucide-react'
import { useWalletStore } from '../store/walletStore'

export default function Receive() {
  const navigate = useNavigate()
  const { primaryAddress } = useWalletStore()
  const [copied, setCopied] = useState(false)
  const [subaddresses, setSubaddresses] = useState<{ address: string; index: number; label?: string }[]>([])
  const [selectedAddress, setSelectedAddress] = useState(primaryAddress)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [newLabel, setNewLabel] = useState('')

  useEffect(() => {
    generateQR(selectedAddress)
  }, [selectedAddress])

  const generateQR = async (address: string) => {
    try {
      const QRCode = await import('qrcode')
      const url = await QRCode.toDataURL(`monero:${address}`, {
        width: 220,
        margin: 2,
        color: {
          dark: '#d4d4d4',
          light: '#0a0a0a',
        },
      })
      setQrDataUrl(url)
    } catch {
      setQrDataUrl('')
    }
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(selectedAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const createSubaddress = async () => {
    try {
      const result = await window.api.wallet.createSubaddress(0, newLabel || undefined)
      setSubaddresses(prev => [...prev, { ...result, label: newLabel || undefined }])
      setSelectedAddress(result.address)
      setNewLabel('')
    } catch (e) {
      console.error('Failed to create subaddress:', e)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Receive XMR</h2>
          <button
            onClick={() => navigate(-1)}
            className="text-text-muted hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-bg-hover"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* QR Code */}
        <div className="glass-card p-6 flex flex-col items-center">
          {qrDataUrl ? (
            <motion.img
              key={selectedAddress}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              src={qrDataUrl}
              alt="QR Code"
              className="w-56 h-56 rounded-xl mb-4"
            />
          ) : (
            <div className="w-56 h-56 rounded-xl bg-bg-primary flex items-center justify-center mb-4">
              <QrCode size={48} className="text-text-muted" />
            </div>
          )}

          <p className="text-xs text-text-muted mb-2">Your Monero Address</p>
          <div className="bg-bg-primary rounded-lg p-3 w-full">
            <code className="text-xs font-mono text-text-secondary break-all leading-relaxed">
              {selectedAddress}
            </code>
          </div>

          <button
            onClick={copyAddress}
            className="btn-primary mt-4 flex items-center gap-2"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy Address'}
          </button>
        </div>

        {/* Subaddresses */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-primary">Subaddresses</h3>
            <p className="text-xs text-text-muted">For enhanced privacy</p>
          </div>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label (optional)"
              className="input-field text-sm flex-1"
            />
            <button onClick={createSubaddress} className="btn-secondary flex items-center gap-1.5">
              <Plus size={14} />
              New
            </button>
          </div>

          {/* Primary address */}
          <button
            onClick={() => setSelectedAddress(primaryAddress)}
            className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${
              selectedAddress === primaryAddress
                ? 'bg-accent-primary/10 border border-accent-primary/30'
                : 'hover:bg-bg-hover'
            }`}
          >
            <p className="text-sm font-medium text-text-primary">Primary Address</p>
            <p className="text-xs text-text-muted font-mono truncate">{primaryAddress}</p>
          </button>

          {/* Subaddresses list */}
          {subaddresses.map((sub) => (
            <button
              key={sub.index}
              onClick={() => setSelectedAddress(sub.address)}
              className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${
                selectedAddress === sub.address
                  ? 'bg-accent-primary/10 border border-accent-primary/30'
                  : 'hover:bg-bg-hover'
              }`}
            >
              <p className="text-sm font-medium text-text-primary">
                {sub.label || `Subaddress #${sub.index}`}
              </p>
              <p className="text-xs text-text-muted font-mono truncate">{sub.address}</p>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
