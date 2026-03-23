import { motion } from 'framer-motion'
import { ExternalLink, ShieldAlert } from 'lucide-react'

export default function Swap() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        padding: '28px 32px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: "'IBM Plex Mono', monospace",
      }}
    >
      {/* Header */}
      <h1 style={{
        fontSize: '22px',
        fontWeight: 700,
        color: '#f26822',
        marginBottom: '6px',
        letterSpacing: '0.04em',
        textAlign: 'center',
      }}>
        Swap
      </h1>
      <p style={{
        fontSize: '13px',
        color: '#888',
        marginBottom: '20px',
        textAlign: 'center',
      }}>
        Exchange XMR for other cryptocurrencies
      </p>

      {/* Third-party disclaimer */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '12px 14px',
        background: 'rgba(242, 104, 34, 0.06)',
        border: '1px solid rgba(242, 104, 34, 0.18)',
        borderRadius: '8px',
        marginBottom: '20px',
        width: '350px',
      }}>
        <ShieldAlert size={16} style={{ color: '#f26822', flexShrink: 0, marginTop: '1px' }} />
        <span style={{ fontSize: '12px', color: '#b0b0b0', lineHeight: 1.5 }}>
          This swap is powered by <strong style={{ color: '#e0e0e0' }}>Exolix</strong>, a third-party
          non-custodial exchange. Trades are processed entirely outside this wallet.
          Bond's Based Monero Wallet does not hold, custody, or control any funds during the swap.
        </span>
      </div>

      {/* Widget — no container border, iframe bg blends with page */}
      <iframe
        title="Exolix widget"
        src="https://exolix.com/widget/XMR:XMR-ETH:ETH?a=1&locale=en&t=CLs9ZMueekLYNp3X8Y4ADaqMWGIdgcFUr0dbpvBsRlHoxiRx1h5mfVOieADbMJdZ&template=wobrand"
        width="560"
        height="376"
        frameBorder="0"
        scrolling="yes"
        style={{ border: 'none', display: 'block', borderRadius: '8px' }}
      />

      {/* Track order link */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginTop: '16px',
      }}>
        <button
          onClick={() => window.api.app.openExternal('https://exolix.com/transaction')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: 'transparent',
            border: '1px solid rgba(242, 104, 34, 0.3)',
            borderRadius: '6px',
            color: '#f26822',
            fontSize: '12px',
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '0.03em',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(242, 104, 34, 0.08)'
            e.currentTarget.style.borderColor = 'rgba(242, 104, 34, 0.5)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.borderColor = 'rgba(242, 104, 34, 0.3)'
          }}
        >
          <ExternalLink size={13} />
          Track order on Exolix
        </button>
      </div>

      {/* Fine print */}
      <p style={{
        fontSize: '11px',
        color: '#555',
        textAlign: 'center',
        marginTop: '14px',
        lineHeight: 1.5,
      }}>
        By using this widget you agree to Exolix's terms of service.
        Exchange rates and availability are determined by the provider.
      </p>
    </motion.div>
  )
}
