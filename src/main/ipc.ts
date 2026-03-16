import { ipcMain, dialog, BrowserWindow, shell } from 'electron'
import { walletService } from './services/wallet.service'
import { nodeService } from './services/node.service'
import { lwsService } from './services/lws.service'
import { syncService } from './services/sync.service'
import { priceService } from './services/price.service'
import { getWalletDir, setWalletDir, getLastNode, setLastNode } from './utils/paths'
import { appLog, getLogs, clearLogs } from './utils/logger'

export function registerIpcHandlers(): void {
  appLog('info', 'app', "Bond's Based Monero Wallet started")
  // --- Wallet ---
  ipcMain.handle('wallet:create', async (_, password: string, walletName?: string) => {
    appLog('info', 'wallet', `Creating new wallet${walletName ? ` "${walletName}"` : ''}`)
    const bestNode = await nodeService.getBestNode()
    const result = await walletService.createWallet(password, bestNode, walletName)
    setLastNode(bestNode)
    appLog('info', 'wallet', `Wallet created — address: ${result.primaryAddress.slice(0, 16)}...`)
    return result
  })

  ipcMain.handle('wallet:restore', async (_, seed: string, password: string, restoreHeight: number, walletName?: string) => {
    appLog('info', 'wallet', `Restoring wallet from seed${restoreHeight ? ` (height: ${restoreHeight})` : ''}`)
    const bestNode = await nodeService.getBestNode()
    await walletService.restoreWallet(seed, password, restoreHeight, bestNode, walletName)
    setLastNode(bestNode)
    appLog('info', 'wallet', 'Wallet restored successfully')
  })

  ipcMain.handle('wallet:open', async (_, password: string, walletName?: string) => {
    appLog('info', 'wallet', `Opening wallet${walletName ? ` "${walletName}"` : ''}`)
    let nodeUri: string
    const lastNode = getLastNode()
    if (lastNode) {
      appLog('info', 'node', `Trying last node: ${lastNode}`)
      const test = await nodeService.testConnection(lastNode)
      if (test.isHealthy) {
        nodeUri = lastNode
        appLog('info', 'node', `Last node online (${test.latency}ms) — skipping node search`)
      } else {
        appLog('warn', 'node', `Last node offline, finding best node...`)
        nodeUri = await nodeService.getBestNode()
      }
    } else {
      nodeUri = await nodeService.getBestNode()
    }
    nodeService.setCurrentUri(nodeUri)
    const info = await walletService.openWallet(password, nodeUri, walletName)
    setLastNode(nodeUri)
    appLog('info', 'wallet', `Wallet open — height: ${info.syncHeight}, balance: ${(BigInt(info.balance) / 1000000000000n).toString()} XMR`)
    return info
  })

  ipcMain.handle('wallet:list', async () => {
    return walletService.listWallets()
  })

  ipcMain.handle('wallet:getLastWallet', async () => {
    return walletService.getLastWallet()
  })

  ipcMain.handle('wallet:setLastWallet', async (_, filename: string) => {
    return walletService.setLastWallet(filename)
  })

  ipcMain.handle('wallet:close', async () => {
    return walletService.closeWallet()
  })

  ipcMain.handle('wallet:getInfo', async () => {
    return walletService.getInfo()
  })

  ipcMain.handle('wallet:getBalance', async () => {
    return walletService.getBalance()
  })

  ipcMain.handle('wallet:getAddress', async (_, accountIdx: number, subaddressIdx: number) => {
    return walletService.getAddress(accountIdx, subaddressIdx)
  })

  ipcMain.handle('wallet:createSubaddress', async (_, accountIdx: number, label?: string) => {
    return walletService.createSubaddress(accountIdx, label)
  })

  ipcMain.handle('wallet:getTransactions', async () => {
    return walletService.getTransactions()
  })

  ipcMain.handle('wallet:createTx', async (_, address: string, amount: string, priority: number) => {
    return walletService.createTx(address, amount, priority)
  })

  ipcMain.handle('wallet:sweepTx', async (_, address: string, priority: number) => {
    appLog('info', 'wallet', 'Creating sweep transaction...')
    return walletService.createSweepTx(address, priority)
  })

  ipcMain.handle('wallet:relayTx', async (_, txMetadata: string) => {
    appLog('info', 'wallet', 'Broadcasting transaction...')
    const hash = await walletService.relayTx(txMetadata)
    appLog('info', 'wallet', `TX broadcast — hash: ${hash.slice(0, 16)}...`)
    return hash
  })

  ipcMain.handle('wallet:startSync', async () => {
    appLog('info', 'wallet', 'Starting sync...')
    walletService.onSyncProgress((progress) => {
      const win = BrowserWindow.getAllWindows()[0]
      if (win) win.webContents.send('wallet:syncProgress', progress)
      if (progress.percent === 1) {
        appLog('info', 'wallet', `Sync complete at height ${progress.height}`)
      } else if (progress.height % 10000 === 0 && progress.height > 0) {
        appLog('debug', 'wallet', `Syncing... ${Math.round(progress.percent * 100)}% (${progress.height}/${progress.endHeight})`)
      }
    })

    walletService.onBalanceChanged((balance) => {
      const win = BrowserWindow.getAllWindows()[0]
      if (win) win.webContents.send('wallet:balanceChanged', balance)
      appLog('info', 'wallet', `Balance updated: ${(BigInt(balance.balance) / 1000000000000n).toString()} XMR`)
    })

    walletService.onTransactionsChanged(() => {
      const win = BrowserWindow.getAllWindows()[0]
      if (win) win.webContents.send('wallet:transactionsChanged')
    })

    walletService.onNewPayment(() => {
      const win = BrowserWindow.getAllWindows()[0]
      if (win) win.webContents.send('wallet:newPayment')
    })

    return walletService.startSync()
  })

  ipcMain.handle('wallet:stopSync', async () => {
    return walletService.stopSync()
  })

  ipcMain.handle('wallet:getSeed', async (_, password: string) => {
    return walletService.getSeed(password)
  })

  ipcMain.handle('wallet:exists', async () => {
    return walletService.walletExists()
  })

  // --- Node ---
  ipcMain.handle('node:connect', async (_, uri: string) => {
    appLog('info', 'node', `Connecting to ${uri}`)
    const result = await nodeService.connect(uri)
    appLog('info', 'node', `Connected to ${uri} — chain height: ${result.height}`)
    return result
  })

  // silent=true skips the log entry (used for automatic background health-checks)
  ipcMain.handle('node:test', async (_, uri: string, silent = false) => {
    const result = await nodeService.testConnection(uri)
    if (!silent) {
      appLog('debug', 'node', `Tested ${uri} — ${result.isHealthy ? `${result.latency}ms, height ${result.height}` : 'OFFLINE'}`)
    }
    return result
  })

  ipcMain.handle('node:getBest', async () => {
    const best = await nodeService.getBestNode()
    appLog('info', 'node', `Best node selected: ${best}`)
    return best
  })

  ipcMain.handle('node:getDefaults', () => {
    return nodeService.getDefaultNodes()
  })

  ipcMain.handle('node:getConnected', () => {
    return nodeService.getCurrentUri()
  })

  // --- Light Wallet Server ---
  ipcMain.handle('lws:setServer', async (_, uri: string) => {
    if (!uri) {
      appLog('info', 'lws', 'LWS disconnected')
      lwsService.setServer(uri)
      return
    }
    appLog('info', 'lws', `Connecting to LWS: ${uri}`)
    lwsService.setServer(uri)
    try {
      const address = await walletService.getPrimaryAddress()
      const viewKey = await walletService.getPrivateViewKey()
      lwsService.setKeys(address, viewKey)
      await lwsService.login()
      appLog('info', 'lws', `Registered with LWS — sharing view key for ${address.slice(0, 16)}...`)
    } catch (e: any) {
      appLog('warn', 'lws', `LWS registration failed: ${e?.message || e}`)
    }
  })

  ipcMain.handle('lws:getServer', () => {
    return lwsService.getServer()
  })

  ipcMain.handle('lws:isActive', () => {
    return lwsService.isConfigured() && lwsService.isRegistered()
  })

  ipcMain.handle('lws:register', async () => {
    const address = await walletService.getPrimaryAddress()
    const viewKey = await walletService.getPrivateViewKey()
    lwsService.setKeys(address, viewKey)
    return lwsService.login()
  })

  ipcMain.handle('lws:getBalance', async () => {
    return lwsService.getAddressInfo()
  })

  ipcMain.handle('lws:getTransactions', async () => {
    return lwsService.getTransactions()
  })

  ipcMain.handle('lws:testServer', async (_, uri: string) => {
    return lwsService.testConnection(uri)
  })

  // --- Cloud Sync ---
  ipcMain.handle('sync:setFolder', async (_, folderPath: string) => {
    return syncService.setSyncFolder(folderPath)
  })

  ipcMain.handle('sync:getFolder', () => {
    return syncService.getSyncFolder()
  })

  ipcMain.handle('sync:sync', async () => {
    return syncService.sync()
  })

  ipcMain.handle('sync:getContacts', () => {
    return syncService.getContacts()
  })

  ipcMain.handle('sync:saveContact', (_, contact) => {
    return syncService.saveContact(contact)
  })

  ipcMain.handle('sync:deleteContact', (_, id: string) => {
    return syncService.deleteContact(id)
  })

  ipcMain.handle('sync:setTxLabel', (_, txHash: string, label: string) => {
    return syncService.setTxLabel(txHash, label)
  })

  ipcMain.handle('sync:getTxLabels', () => {
    return syncService.getTxLabels()
  })

  ipcMain.handle('sync:setPassphrase', (_, passphrase: string) => {
    syncService.setPassphrase(passphrase)
  })

  // --- App ---
  ipcMain.handle('app:getLogs', () => getLogs())
  ipcMain.handle('app:clearLogs', () => clearLogs())
  ipcMain.handle('app:openExternal', (_, url: string) => shell.openExternal(url))

  ipcMain.handle('app:minimize', () => {
    BrowserWindow.getFocusedWindow()?.minimize()
  })

  ipcMain.handle('app:maximize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })

  ipcMain.handle('app:close', () => {
    BrowserWindow.getFocusedWindow()?.close()
  })

  ipcMain.handle('app:isMaximized', () => {
    return BrowserWindow.getFocusedWindow()?.isMaximized() || false
  })

  ipcMain.handle('app:getWalletDir', () => {
    return getWalletDir()
  })

  ipcMain.handle('app:setWalletDir', (_, dir: string) => {
    setWalletDir(dir)
  })

  ipcMain.handle('app:openFolder', async (_, folderPath: string) => {
    await shell.openPath(folderPath)
  })

  ipcMain.handle('app:selectFile', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      title: 'Open Monero Wallet File',
      filters: [{ name: 'Monero Wallet', extensions: ['keys'] }],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('app:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Cloud Sync Folder',
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // --- Price ---
  ipcMain.handle('price:getXmrPrice', () => priceService.getXmrPrice())
  ipcMain.handle('price:getXmrChange24h', () => priceService.getXmrChange24h())
  ipcMain.handle('price:getXmrPriceHistory', (_e, days: string) => priceService.getXmrPriceHistory(days))
}
