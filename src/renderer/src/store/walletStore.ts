import { create } from 'zustand'
import type { TransactionInfo, PriceHistoryPoint } from '@shared/types'

interface WalletState {
  // Connection state
  isOpen: boolean
  isLocked: boolean
  isLoading: boolean

  // Wallet data
  primaryAddress: string
  balance: string
  unlockedBalance: string
  syncHeight: number
  chainHeight: number
  isSyncing: boolean
  transactions: TransactionInfo[]
  seed: string | null
  currentWalletName: string | null
  xmrPriceUsd: number | null
  xmrChange24h: number | null
  priceHistory24h: PriceHistoryPoint[] | null

  // Actions
  setWalletOpen: (isOpen: boolean) => void
  setCurrentWalletName: (name: string | null) => void
  setLocked: (isLocked: boolean) => void
  setLoading: (isLoading: boolean) => void
  setAddress: (address: string) => void
  setBalance: (balance: string, unlockedBalance: string) => void
  setSyncProgress: (height: number, chainHeight: number) => void
  setSyncing: (isSyncing: boolean) => void
  setTransactions: (txs: TransactionInfo[]) => void
  setSeed: (seed: string | null) => void
  setXmrPrice: (price: number | null) => void
  setXmrChange24h: (change: number | null) => void
  setPriceHistory24h: (history: PriceHistoryPoint[]) => void
  reset: () => void
}

const initialState = {
  isOpen: false,
  isLocked: true,
  isLoading: false,
  primaryAddress: '',
  balance: '0',
  unlockedBalance: '0',
  syncHeight: 0,
  chainHeight: 0,
  isSyncing: false,
  transactions: [],
  seed: null,
  currentWalletName: null,
  xmrPriceUsd: null,
  xmrChange24h: null,
  priceHistory24h: null,
}

export const useWalletStore = create<WalletState>((set) => ({
  ...initialState,

  setWalletOpen: (isOpen) => set({ isOpen }),
  setCurrentWalletName: (currentWalletName) => set({ currentWalletName }),
  setLocked: (isLocked) => set({ isLocked }),
  setLoading: (isLoading) => set({ isLoading }),
  setAddress: (primaryAddress) => set({ primaryAddress }),
  setBalance: (balance, unlockedBalance) => set({ balance, unlockedBalance }),
  setSyncProgress: (syncHeight, chainHeight) => set({ syncHeight, chainHeight }),
  setSyncing: (isSyncing) => set({ isSyncing }),
  setTransactions: (transactions) => set({ transactions }),
  setSeed: (seed) => set({ seed }),
  setXmrPrice: (xmrPriceUsd) => set({ xmrPriceUsd }),
  setXmrChange24h: (xmrChange24h) => set({ xmrChange24h }),
  setPriceHistory24h: (priceHistory24h) => set({ priceHistory24h }),
  reset: () => set(initialState),
}))
