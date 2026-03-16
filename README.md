
```
██████╗  ██████╗ ███╗   ██╗██████╗ ███████╗
██╔══██╗██╔═══██╗████╗  ██║██╔══██╗██╔════╝
██████╔╝██║   ██║██╔██╗ ██║██║  ██║███████╗
██╔══██╗██║   ██║██║╚██╗██║██║  ██║╚════██║
██████╔╝╚██████╔╝██║ ╚████║██████╔╝███████║
╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚═════╝ ╚══════╝

██████╗  █████╗ ███████╗███████╗██████╗
██╔══██╗██╔══██╗██╔════╝██╔════╝██╔══██╗
██████╔╝███████║███████╗█████╗  ██║  ██║
██╔══██╗██╔══██║╚════██║██╔══╝  ██║  ██║
██████╔╝██║  ██║███████║███████╗██████╔╝
╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚═════╝

███╗   ███╗ ██████╗ ███╗   ██╗███████╗██████╗  ██████╗
████╗ ████║██╔═══██╗████╗  ██║██╔════╝██╔══██╗██╔═══██╗
██╔████╔██║██║   ██║██╔██╗ ██║█████╗  ██████╔╝██║   ██║
██║╚██╔╝██║██║   ██║██║╚██╗██║██╔══╝  ██╔══██╗██║   ██║
██║ ╚═╝ ██║╚██████╔╝██║ ╚████║███████╗██║  ██║╚██████╔╝
╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝

██╗    ██╗ █████╗ ██╗     ██╗     ███████╗████████╗
██║    ██║██╔══██╗██║     ██║     ██╔════╝╚══██╔══╝
██║ █╗ ██║███████║██║     ██║     █████╗     ██║
██║███╗██║██╔══██║██║     ██║     ██╔══╝     ██║
╚███╔███╔╝██║  ██║███████╗███████╗███████╗   ██║
 ╚══╝╚══╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝   ╚═╝
```

<div align="center">

# 🟠 Bond's Based Monero Wallet

### *For GigaChads Who Value Their Privacy*

[![Electron](https://img.shields.io/badge/Electron-41.0.2-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Monero](https://img.shields.io/badge/Monero-XMR-FF6600?style=for-the-badge&logo=monero&logoColor=white)](https://getmonero.org)
[![Platform](https://img.shields.io/badge/Platform-Windows-0078D4?style=for-the-badge&logo=windows&logoColor=white)](https://microsoft.com/windows)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**A privacy-first, fully-featured Monero desktop wallet built with Electron + React.**
**No KYC. No telemetry. No compromises.**

[Download Portable EXE](#download) · [Build from Source](#building) · [Feature Overview](#features) · [Screenshots](#screenshots)

---

</div>

## ⚡ What Is This?

**Bond's Based Monero Wallet** is a desktop application for Windows that lets you send, receive, and manage Monero (XMR) with zero compromise on privacy or user experience.

It was built from the ground up for people who actually understand why financial privacy matters — not as a talking point, but as a fundamental human right.

Under the hood it uses **monero-ts** (the official Monero JavaScript library) running inside Electron, giving you a true wallet with full cryptographic verification, not just a front-end to a centralized API.

---

## 🎯 Core Philosophy

```
┌─────────────────────────────────────────────────────────┐
│  YOUR keys.  YOUR coins.  YOUR business.                │
│                                                         │
│  ✗ No accounts         ✗ No phone home                 │
│  ✗ No KYC              ✗ No tracking                   │
│  ✗ No seed uploads     ✗ No server dependency          │
└─────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 💸 Wallet Core
- **Create & restore** wallets with 25-word Monero seed phrases
- **Multi-wallet support** — manage multiple wallets from one app
- **Send XMR** with full priority control (Low / Medium / High / Default)
- **Receive XMR** with QR code generation (standard `monero:` URI scheme)
- **Subaddresses** — create labeled receiving addresses for privacy
- **Sweep wallet** — send entire balance in one click
- **Live fee estimation** before broadcasting
- **USD ↔ XMR** amount toggle on the send screen

### 🔄 Dual Sync Modes

| Mode | Speed | Privacy | How It Works |
|------|-------|---------|--------------|
| **Full Node** | Moderate | ████████ Maximum | Your wallet talks directly to a Monero RPC node. Nobody sees your transactions. |
| **Light Wallet (LWS)** | ⚡ Instant | ████░░░░ Good | Shares your *view key only* with a trusted LWS server. Spend key stays local. |

Switch between modes in Settings at any time.

### 📊 Price Tracker
- Real-time **XMR/USD price** via CryptoCompare (free API, no key required)
- Interactive **price chart** with 7 timeframes: 24H · 1W · 1M · 3M · 6M · 1Y · ALL
- Hover crosshair with price tooltip
- Period percentage change display
- Click the price badge on Dashboard to jump straight to the chart

### 🌐 Node Management
- **6 default trusted nodes** pre-configured:
  - Seth For Privacy
  - HashVault
  - MoneroDevs
  - Monerujo
  - Stack Wallet
  - Cake Wallet
- **Latency testing** — test any node and see ms + block height
- **"Test All"** — benchmark all nodes simultaneously
- **Auto best-node selection** — picks the fastest healthy node on startup
- **Custom node** — point the wallet at your own node

### 🔊 Sound System
Full **per-sound toggle** system with a master on/off switch:

| Event | Sound File |
|-------|-----------|
| App startup | `startup3.mp3` |
| Button click | `clicky2.mp3` |
| Money received 🤑 | `money.mp3` |
| Transaction sent | `sound1.mp3` |
| Test all nodes | `fffsend.mp3` |
| Reveal seed phrase | `alertseed.wav` |
| 3D model fast spin | `thatsgood.mp3` |

All sounds individually toggled in **Settings → Sounds**.

### 🔒 Security
- **Password-protected wallets** — AES encryption via monero-ts
- **Seed phrase reveal** is gated behind password re-entry
- **View key isolation** — LWS mode never exposes your spend key
- **Context isolation** — Electron renderer runs in a secure sandbox
- **No Node.js in renderer** — strict Electron security model enforced

### 📖 Address Book
- Save contacts with names and Monero addresses
- Search, edit, delete contacts
- Cloud sync support for contacts across devices (via local folder)

### 🖥️ Transaction History
- Full incoming and outgoing transaction list
- Search by transaction hash
- Filter by direction (in / out)
- Add **custom labels** to transactions for bookkeeping
- Confirmation status with block height

### 📝 Logs & Diagnostics
- Real-time in-app log viewer (no log files to hunt)
- Filter by source: `wallet` · `node` · `lws` · `sync` · `app`
- Color-coded by severity level
- Max 500 log entries — rotating window, never bloats

---

## 🎨 UI / UX Highlights

```
┌──────────────────────────────────────────────────────────┐
│  ■ Based Monero Wallet                         — □ ✕     │
├──────────┬───────────────────────────────────────────────┤
│          │                                               │
│  [Logo]  │            DASHBOARD                          │
│          │  ╔═══════════════════════════╗                │
│ Dashboard│  ║  Balance: 4.206900 XMR   ║                │
│ Send XMR │  ║  ≈ $682.14 USD           ║                │
│ Receive  │  ╚═══════════════════════════╝                │
│ TX Hist  │                                               │
│ Settings │  Node: xmr-node.cakewallet.com  104ms ●      │
│ Price    │  Sync: ████████████████████░ 99.8%            │
│          │                                               │
│ [3D Model│  Recent Transactions...                       │
│  Spin Me]│                                               │
└──────────┴───────────────────────────────────────────────┘
```

- **Frameless window** with custom titlebar (minimize / maximize / close)
- **Matrix rain animation** on the welcome screen (with crypto-specific character sets)
- **Interactive 3D model** in the sidebar — drag to spin, flick for momentum
- **IBM Plex Mono** throughout — consistent terminal/hacker aesthetic
- **Orange accent** (`#f26822`) on dark near-black (`#0a0a0a`) background
- **Glass-morphism cards** with blur backdrop effects
- **Framer Motion** page transitions throughout
- **Typewriter effect** on onboarding intro text

---

## 🛠️ Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│  APPLICATION LAYER                                      │
│  ├── Electron 41         (desktop runtime)              │
│  ├── electron-vite 2.3   (dev server + build)           │
│  └── electron-builder    (NSIS + portable packaging)    │
├─────────────────────────────────────────────────────────┤
│  FRONTEND                                               │
│  ├── React 19            (UI framework)                 │
│  ├── TypeScript 5.8      (type safety)                  │
│  ├── React Router 7      (SPA navigation)               │
│  ├── Zustand 5           (global state)                 │
│  ├── Framer Motion       (animations)                   │
│  ├── Three.js + R3F      (3D model rendering)           │
│  ├── Tailwind CSS 3      (utility styles)               │
│  └── Lucide React        (icons)                        │
├─────────────────────────────────────────────────────────┤
│  MONERO LAYER                                           │
│  └── monero-ts 0.11.8    (full wallet + RPC client)     │
├─────────────────────────────────────────────────────────┤
│  DATA                                                   │
│  ├── CryptoCompare API   (XMR price + history)          │
│  ├── electron-store      (persistent config)            │
│  └── QRCode 1.5.4        (address QR generation)        │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Download

> ⚠️ **Important:** Monero is used for private transactions. Only download wallet software from sources you trust. Always verify checksums.

### Portable (Recommended)
Download `Based Monero Wallet-1.0.0-portable.exe` from the [Releases](https://github.com/yourusername/based-monero-wallet/releases) page.

- No installation required
- Run from any folder, USB drive, or network share
- Stores wallet data in `%APPDATA%\Based Monero Wallet`
- Works on Windows 10 and Windows 11

### Installer
Download `Based Monero Wallet Setup 1.0.0.exe` for a traditional installation with Start Menu shortcut and uninstaller.

---

## 🔨 Building

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+
- **Windows** (the build produces Windows-only executables)
- **Git**

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/based-monero-wallet.git
cd based-monero-wallet

# Install dependencies
npm install

# Start in development mode (hot reload)
npm run dev
```

### Build Commands

```bash
# Production build only (no packaging)
npm run build

# Build + create installer and portable exe
npm run package

# Build + create portable exe only (faster)
npm run package:portable
```

### Output

After `npm run package`, your executables are in `dist/`:

```
dist/
├── Based Monero Wallet Setup 1.0.0.exe       ← NSIS installer
├── Based Monero Wallet-1.0.0-portable.exe    ← Portable (send this)
└── win-unpacked/                             ← Unpacked app directory
```

---

## 🗂️ Project Structure

```
monero-wallet/
├── src/
│   ├── main/                    ← Electron main process
│   │   ├── index.ts             ← App entry, window creation
│   │   ├── ipc.ts               ← All IPC handlers
│   │   └── services/
│   │       ├── wallet.service.ts   ← monero-ts wallet logic
│   │       ├── node.service.ts     ← Node connection + testing
│   │       ├── price.service.ts    ← CryptoCompare API
│   │       ├── lws.service.ts      ← Light Wallet Server
│   │       └── sync.service.ts     ← Cloud sync / contacts
│   ├── preload/
│   │   └── index.ts             ← Secure contextBridge API
│   ├── renderer/
│   │   └── src/
│   │       ├── pages/           ← Route-level page components
│   │       │   ├── Dashboard.tsx
│   │       │   ├── Send.tsx
│   │       │   ├── Receive.tsx
│   │       │   ├── Transactions.tsx
│   │       │   ├── Price.tsx
│   │       │   └── Settings.tsx
│   │       ├── components/      ← Reusable UI components
│   │       │   ├── layout/
│   │       │   │   ├── Sidebar.tsx
│   │       │   │   └── AppLayout.tsx
│   │       │   ├── PriceChart.tsx
│   │       │   ├── MatrixRain.tsx
│   │       │   └── Sidebar3DModel.tsx
│   │       ├── store/           ← Zustand state
│   │       │   ├── walletStore.ts
│   │       │   └── soundStore.ts
│   │       └── assets/
│   │           ├── sounds/      ← .mp3 / .wav files
│   │           └── *.png        ← Images and logos
│   └── shared/
│       ├── types.ts             ← Shared TypeScript interfaces
│       └── constants.ts         ← Default nodes, config
├── resources/
│   └── icon.png                 ← App icon
└── package.json                 ← Build config + scripts
```

---

## 🔑 First-Time Setup

1. **Launch the app** — the Matrix rain welcome screen appears
2. Choose **Create New Wallet** or **Restore from Seed**
3. **Set a strong password** — this encrypts your wallet file locally
4. The app auto-selects the **fastest available Monero node**
5. Your wallet begins syncing — progress shown in the sidebar
6. Once synced, you're ready to send and receive XMR

> 💡 **Tip:** For instant balance display, enable **Light Wallet Server** in Settings → Light Wallet. Your view key is shared with the LWS server, but your spend key and seed never leave your machine.

---

## 🔐 Security Model

```
┌─────────────────────────────────────────────────────────────┐
│  WHAT STAYS ON YOUR MACHINE          WHAT LEAVES (optional) │
│  ────────────────────────────        ──────────────────────  │
│  ✓ Spend key (always)                • View key (LWS mode)  │
│  ✓ Seed phrase (always)              • Transactions (node)  │
│  ✓ Wallet password (always)          • IP address (node)    │
│  ✓ Transaction signing (always)                             │
└─────────────────────────────────────────────────────────────┘
```

**Electron Security:**
- Renderer process runs in a **sandboxed context** with no Node.js access
- All wallet operations happen in the **main process only**
- The preload script exposes a typed, minimal API surface via `contextBridge`
- No `eval()`, no `nodeIntegration: true`, no exceptions

---

## ⚙️ Settings Overview

| Tab | What You Can Configure |
|-----|------------------------|
| **Nodes** | Connect to default or custom Monero RPC nodes, test latency |
| **Light Wallet** | Connect to an LWS server for instant sync |
| **Security** | Reveal seed phrase (password-gated), change wallet directory |
| **Sounds** | Master on/off toggle + per-sound individual toggles with preview |
| **Logs** | Real-time app logs filtered by component, clearable |

---

## 🌍 Supported Environments

| Environment | Status |
|-------------|--------|
| Windows 11 | ✅ Fully supported |
| Windows 10 | ✅ Fully supported |
| Windows Server 2019+ | ✅ Works |
| Virtual Machines | ✅ Works (3D model may have reduced performance) |
| Fresh systems (no VC++ / .NET) | ✅ All runtimes bundled |
| Air-gapped machines | ⚠️ Can create/restore wallets, no price data or sync |

All required DLLs, WASM files, and native modules are **bundled inside the executable**. No separate runtime installation needed.

---

## 🤝 Acknowledgements

- [**Monero Project**](https://getmonero.org) — for building the best privacy coin
- [**monero-ts**](https://github.com/monero-ecosystem/monero-ts) — JavaScript Monero library
- [**Seth For Privacy**](https://sethforprivacy.com) — public node
- [**CryptoCompare**](https://cryptocompare.com) — free price API
- Everyone running public Monero nodes — you make this possible

---

## ⚠️ Disclaimer

This software is provided **as-is** without warranty of any kind. Monero is a volatile cryptocurrency. You are solely responsible for the security of your seed phrase and wallet. Never share your seed phrase with anyone. The developers are not responsible for any loss of funds.

This is **not** an official Monero Project product.

---

<div align="center">

**Built with 🟠 for the privacy-conscious.**

*"Not your keys, not your coins."*

</div>
