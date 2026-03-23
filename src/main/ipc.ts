import { ipcMain, dialog, BrowserWindow, shell } from 'electron'
import { walletService } from './services/wallet.service'
import { nodeService } from './services/node.service'
import { lwsService } from './services/lws.service'
import { syncService } from './services/sync.service'
import { priceService } from './services/price.service'
import { getWalletDir, setWalletDir, getLastNode, setLastNode } from './utils/paths'
import { appLog, getLogs, clearLogs } from './utils/logger'
import {
  validatePassword,
  validateSeed,
  validateRestoreHeight,
  validateMoneroAddress,
  validateAtomicAmount,
  validatePriority,
  validateUri,
  sanitizeWalletName,
  assertString,
  assertOptionalString,
} from './utils/validators'

// Track whether sync listeners have been registered to prevent accumulation
let syncListenersRegistered = false

export function registerIpcHandlers(): void {
  appLog('info', 'app', "Bond's Based Monero Wallet started")
  // --- Wallet ---
  ipcMain.handle('wallet:create', async (_, password: unknown, walletName?: unknown) => {
    const pw = validatePassword(password)
    const name = walletName != null ? sanitizeWalletName(walletName) : undefined
    appLog('info', 'wallet', `Creating new wallet${name ? ` "${name}"` : ''}`)
    const bestNode = await nodeService.getBestNode()
    const result = await walletService.createWallet(pw, bestNode, name)
    setLastNode(bestNode)
    appLog('info', 'wallet', `Wallet created — address: ${result.primaryAddress.slice(0, 16)}...`)
    return result
  })

  ipcMain.handle('wallet:restore', async (_, seed: unknown, password: unknown, restoreHeight: unknown, walletName?: unknown) => {
    const s = validateSeed(seed)
    const pw = validatePassword(password)
    const rh = validateRestoreHeight(restoreHeight)
    const name = walletName != null ? sanitizeWalletName(walletName) : undefined
    appLog('info', 'wallet', `Restoring wallet from seed${rh ? ` (height: ${rh})` : ''}`)
    const bestNode = await nodeService.getBestNode()
    await walletService.restoreWallet(s, pw, rh, bestNode, name)
    setLastNode(bestNode)
    appLog('info', 'wallet', 'Wallet restored successfully')
  })

  ipcMain.handle('wallet:open', async (_, password: unknown, walletName?: unknown) => {
    const pw = validatePassword(password)
    const name = walletName != null ? sanitizeWalletName(walletName) : undefined
    appLog('info', 'wallet', `Opening wallet${name ? ` "${name}"` : ''}`)
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
    const info = await walletService.openWallet(pw, nodeUri, name)
    setLastNode(nodeUri)
    appLog('info', 'wallet', `Wallet open — height: ${info.syncHeight}`)
    return info
  })

  ipcMain.handle('wallet:list', async () => {
    return walletService.listWallets()
  })

  ipcMain.handle('wallet:getLastWallet', async () => {
    return walletService.getLastWallet()
  })

  ipcMain.handle('wallet:setLastWallet', async (_, filename: unknown) => {
    const name = sanitizeWalletName(filename)
    return walletService.setLastWallet(name)
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

  ipcMain.handle('wallet:getAddress', async (_, accountIdx: unknown, subaddressIdx: unknown) => {
    if (typeof accountIdx !== 'number' || typeof subaddressIdx !== 'number') {
      throw new Error('accountIdx and subaddressIdx must be numbers')
    }
    return walletService.getAddress(accountIdx, subaddressIdx)
  })

  ipcMain.handle('wallet:createSubaddress', async (_, accountIdx: unknown, label?: unknown) => {
    if (typeof accountIdx !== 'number') throw new Error('accountIdx must be a number')
    assertOptionalString(label, 'label')
    return walletService.createSubaddress(accountIdx, label)
  })

  ipcMain.handle('wallet:getTransactions', async () => {
    return walletService.getTransactions()
  })

  ipcMain.handle('wallet:createTx', async (_, address: unknown, amount: unknown, priority: unknown) => {
    const addr = validateMoneroAddress(address)
    const amt = validateAtomicAmount(amount)
    const pri = validatePriority(priority)
    return walletService.createTx(addr, amt, pri)
  })

  ipcMain.handle('wallet:estimateFee', async (_, priority: unknown) => {
    const pri = validatePriority(priority)
    return walletService.estimateFee(pri)
  })

  ipcMain.handle('wallet:sweepTx', async (_, address: unknown, priority: unknown) => {
    const addr = validateMoneroAddress(address)
    const pri = validatePriority(priority)
    appLog('info', 'wallet', 'Creating sweep transaction...')
    return walletService.createSweepTx(addr, pri)
  })

  ipcMain.handle('wallet:relayTx', async (_, txMetadata: unknown) => {
    assertString(txMetadata, 'txMetadata')
    appLog('info', 'wallet', 'Broadcasting transaction...')
    const hash = await walletService.relayTx(txMetadata)
    appLog('info', 'wallet', `TX broadcast — hash: ${hash.slice(0, 16)}...`)
    return hash
  })

  ipcMain.handle('wallet:startSync', async () => {
    appLog('info', 'wallet', 'Starting sync...')

    // Register IPC→renderer forwarding listeners only once to prevent
    // accumulation across repeated startSync calls (H1 fix)
    if (!syncListenersRegistered) {
      syncListenersRegistered = true

      walletService.onSyncProgress((progress) => {
        const win = BrowserWindow.getAllWindows()[0]
        if (win) win.webContents.send('wallet:syncProgress', progress)
        if (progress.percent === 1) {
          appLog('info', 'wallet', `Sync complete at height ${progress.height}`)
        } else if (progress.height % 10000 === 0 && progress.height > 0) {
          appLog('debug', 'wallet', `Syncing... ${Math.round(progress.percent * 100)}% (${progress.height}/${progress.endHeight})`)
        }
      })

      walletService.onBalanceChanged((_balance) => {
        const win = BrowserWindow.getAllWindows()[0]
        if (win) win.webContents.send('wallet:balanceChanged', _balance)
        appLog('info', 'wallet', 'Balance updated')
      })

      walletService.onTransactionsChanged(() => {
        const win = BrowserWindow.getAllWindows()[0]
        if (win) win.webContents.send('wallet:transactionsChanged')
      })

      walletService.onNewPayment(() => {
        const win = BrowserWindow.getAllWindows()[0]
        if (win) win.webContents.send('wallet:newPayment')
      })
    }

    return walletService.startSync()
  })

  ipcMain.handle('wallet:stopSync', async () => {
    return walletService.stopSync()
  })

  ipcMain.handle('wallet:getSeed', async (_, password: unknown) => {
    const pw = validatePassword(password)
    return walletService.getSeed(pw)
  })

  ipcMain.handle('wallet:exists', async () => {
    return walletService.walletExists()
  })

  // --- Node ---
  ipcMain.handle('node:connect', async (_, uri: unknown) => {
    const u = validateUri(uri)
    appLog('info', 'node', `Connecting to ${u}`)
    const result = await nodeService.connect(u)
    // Also switch the wallet's daemon connection so it actually uses the new node
    try {
      await walletService.setDaemon(u)
    } catch {
      // Wallet may not be open yet — that's OK, it'll use this node when it opens
    }
    nodeService.setCurrentUri(u)
    setLastNode(u)
    appLog('info', 'node', `Connected — chain height: ${result.height}`)
    return result
  })

  // silent=true skips the log entry (used for automatic background health-checks)
  ipcMain.handle('node:test', async (_, uri: unknown, silent = false) => {
    const u = validateUri(uri)
    const result = await nodeService.testConnection(u)
    if (!silent) {
      appLog('debug', 'node', `Tested node — ${result.isHealthy ? `${result.latency}ms, height ${result.height}` : 'OFFLINE'}`)
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
  ipcMain.handle('lws:setServer', async (_, uri: unknown) => {
    assertString(uri, 'uri')
    if (!uri) {
      appLog('info', 'lws', 'LWS disconnected')
      lwsService.setServer(uri)
      return
    }
    const u = validateUri(uri)
    // Enforce HTTPS for LWS — view key is sent to the server
    if (!u.startsWith('https://')) {
      throw new Error('LWS server must use HTTPS — your private view key would be sent in cleartext over HTTP')
    }
    appLog('info', 'lws', 'Connecting to LWS server...')
    lwsService.setServer(u)
    try {
      const address = await walletService.getPrimaryAddress()
      const viewKey = await walletService.getPrivateViewKey()
      lwsService.setKeys(address, viewKey)
      await lwsService.login()
      appLog('info', 'lws', `Registered with LWS — address: ${address.slice(0, 16)}...`)
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

  ipcMain.handle('lws:testServer', async (_, uri: unknown) => {
    const u = validateUri(uri)
    return lwsService.testConnection(u)
  })

  // --- Cloud Sync ---
  ipcMain.handle('sync:setFolder', async (_, folderPath: unknown) => {
    assertString(folderPath, 'folderPath')
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

  ipcMain.handle('sync:saveContact', (_, contact: unknown) => {
    if (!contact || typeof contact !== 'object') throw new Error('contact must be an object')
    return syncService.saveContact(contact as any)
  })

  ipcMain.handle('sync:deleteContact', (_, id: unknown) => {
    assertString(id, 'id')
    return syncService.deleteContact(id)
  })

  ipcMain.handle('sync:setTxLabel', (_, txHash: unknown, label: unknown) => {
    assertString(txHash, 'txHash')
    assertString(label, 'label')
    return syncService.setTxLabel(txHash, label)
  })

  ipcMain.handle('sync:getTxLabels', () => {
    return syncService.getTxLabels()
  })

  ipcMain.handle('sync:setPassphrase', (_, passphrase: unknown) => {
    assertString(passphrase, 'passphrase')
    if (passphrase.length < 8) throw new Error('Sync passphrase must be at least 8 characters')
    syncService.setPassphrase(passphrase)
  })

  // --- App ---
  ipcMain.handle('app:getLogs', () => getLogs())
  ipcMain.handle('app:clearLogs', () => clearLogs())

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

  ipcMain.handle('app:setWalletDir', (_, dir: unknown) => {
    assertString(dir, 'dir')
    setWalletDir(dir)
  })

  ipcMain.handle('app:openFolder', async (_, folderPath: unknown) => {
    assertString(folderPath, 'folderPath')
    await shell.openPath(folderPath)
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
