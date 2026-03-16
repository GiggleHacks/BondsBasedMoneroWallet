import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../shared/types'

const api: ElectronAPI = {
  wallet: {
    create: (password, walletName?) => ipcRenderer.invoke('wallet:create', password, walletName),
    restore: (seed, password, restoreHeight, walletName?) => ipcRenderer.invoke('wallet:restore', seed, password, restoreHeight, walletName),
    open: (password, walletName?) => ipcRenderer.invoke('wallet:open', password, walletName),
    listWallets: () => ipcRenderer.invoke('wallet:list'),
    getLastWallet: () => ipcRenderer.invoke('wallet:getLastWallet'),
    setLastWallet: (filename) => ipcRenderer.invoke('wallet:setLastWallet', filename),
    close: () => ipcRenderer.invoke('wallet:close'),
    getInfo: () => ipcRenderer.invoke('wallet:getInfo'),
    getBalance: () => ipcRenderer.invoke('wallet:getBalance'),
    getAddress: (accountIdx, subaddressIdx) => ipcRenderer.invoke('wallet:getAddress', accountIdx, subaddressIdx),
    createSubaddress: (accountIdx, label) => ipcRenderer.invoke('wallet:createSubaddress', accountIdx, label),
    getTransactions: () => ipcRenderer.invoke('wallet:getTransactions'),
    createTx: (address, amount, priority) => ipcRenderer.invoke('wallet:createTx', address, amount, priority),
    sweepTx: (address, priority) => ipcRenderer.invoke('wallet:sweepTx', address, priority),
    relayTx: (txMetadata) => ipcRenderer.invoke('wallet:relayTx', txMetadata),
    startSync: () => ipcRenderer.invoke('wallet:startSync'),
    stopSync: () => ipcRenderer.invoke('wallet:stopSync'),
    getSeed: (password) => ipcRenderer.invoke('wallet:getSeed', password),
    walletExists: () => ipcRenderer.invoke('wallet:exists'),
    onSyncProgress: (callback) => {
      const handler = (_: any, progress: any) => callback(progress)
      ipcRenderer.on('wallet:syncProgress', handler)
      return () => ipcRenderer.removeListener('wallet:syncProgress', handler)
    },
    onBalanceChanged: (callback) => {
      const handler = (_: any, balance: any) => callback(balance)
      ipcRenderer.on('wallet:balanceChanged', handler)
      return () => ipcRenderer.removeListener('wallet:balanceChanged', handler)
    },
    onTransactionsChanged: (callback) => {
      const handler = () => callback()
      ipcRenderer.on('wallet:transactionsChanged', handler)
      return () => ipcRenderer.removeListener('wallet:transactionsChanged', handler)
    },
    onNewPayment: (callback) => {
      const handler = () => callback()
      ipcRenderer.on('wallet:newPayment', handler)
      return () => ipcRenderer.removeListener('wallet:newPayment', handler)
    },
  },
  node: {
    connect: (uri) => ipcRenderer.invoke('node:connect', uri),
    testConnection: (uri, silent?: boolean) => ipcRenderer.invoke('node:test', uri, silent),
    getBestNode: () => ipcRenderer.invoke('node:getBest'),
    getDefaultNodes: () => ipcRenderer.invoke('node:getDefaults') as any,
    getConnectedNode: () => ipcRenderer.invoke('node:getConnected'),
  },
  lws: {
    setServer: (uri) => ipcRenderer.invoke('lws:setServer', uri),
    getServer: () => ipcRenderer.invoke('lws:getServer'),
    isActive: () => ipcRenderer.invoke('lws:isActive'),
    register: () => ipcRenderer.invoke('lws:register'),
    getBalance: () => ipcRenderer.invoke('lws:getBalance'),
    getTransactions: () => ipcRenderer.invoke('lws:getTransactions'),
    testServer: (uri) => ipcRenderer.invoke('lws:testServer', uri),
  },
  cloudSync: {
    setSyncFolder: (folderPath) => ipcRenderer.invoke('sync:setFolder', folderPath),
    getSyncFolder: () => ipcRenderer.invoke('sync:getFolder'),
    sync: () => ipcRenderer.invoke('sync:sync'),
    getContacts: () => ipcRenderer.invoke('sync:getContacts'),
    saveContact: (contact) => ipcRenderer.invoke('sync:saveContact', contact),
    deleteContact: (id) => ipcRenderer.invoke('sync:deleteContact', id),
    setTxLabel: (txHash, label) => ipcRenderer.invoke('sync:setTxLabel', txHash, label),
    getTxLabels: () => ipcRenderer.invoke('sync:getTxLabels'),
    setSyncPassphrase: (passphrase) => ipcRenderer.invoke('sync:setPassphrase', passphrase),
  },
  app: {
    minimize: () => ipcRenderer.invoke('app:minimize'),
    maximize: () => ipcRenderer.invoke('app:maximize'),
    close: () => ipcRenderer.invoke('app:close'),
    isMaximized: () => ipcRenderer.invoke('app:isMaximized'),
    onMaximizeChange: (callback) => {
      const handler = (_: any, isMaximized: boolean) => callback(isMaximized)
      ipcRenderer.on('window:maximizeChanged', handler)
      return () => ipcRenderer.removeListener('window:maximizeChanged', handler)
    },
    selectFile: () => ipcRenderer.invoke('app:selectFile'),
    selectFolder: () => ipcRenderer.invoke('app:selectFolder'),
    getWalletDir: () => ipcRenderer.invoke('app:getWalletDir'),
    setWalletDir: (dir) => ipcRenderer.invoke('app:setWalletDir', dir),
    openFolder: (path) => ipcRenderer.invoke('app:openFolder', path),
    openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
    getVersion: () => '1.0.0',
    getLogs: () => ipcRenderer.invoke('app:getLogs'),
    clearLogs: () => ipcRenderer.invoke('app:clearLogs'),
    onLog: (callback) => {
      const handler = (_: any, entry: any) => callback(entry)
      ipcRenderer.on('app:log', handler)
      return () => ipcRenderer.removeListener('app:log', handler)
    },
  },
  price: {
    getXmrPrice: () => ipcRenderer.invoke('price:getXmrPrice'),
    getXmrChange24h: () => ipcRenderer.invoke('price:getXmrChange24h'),
    getXmrPriceHistory: (days: string) => ipcRenderer.invoke('price:getXmrPriceHistory', days),
  },
}

contextBridge.exposeInMainWorld('api', api)
