import { app, BrowserWindow, Menu, shell } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc'
import { walletService } from './services/wallet.service'

// Ensure consistent userData path in both dev and prod
app.setName('bonds-based-monero-wallet')

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 890,
    minWidth: 720,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0a',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Try Mica material on Windows 11
  try {
    ;(mainWindow as any).setBackgroundMaterial?.('mica')
  } catch {
    // Not available on older Windows
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximizeChanged', true)
  })

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximizeChanged', false)
  })

  // Enable right-click context menu (copy/paste/cut)
  mainWindow.webContents.on('context-menu', (_, params) => {
    const menuItems: Electron.MenuItemConstructorOptions[] = []
    if (params.isEditable) {
      menuItems.push(
        { label: 'Cut', role: 'cut', enabled: params.editFlags.canCut },
        { label: 'Copy', role: 'copy', enabled: params.editFlags.canCopy },
        { label: 'Paste', role: 'paste', enabled: params.editFlags.canPaste },
        { type: 'separator' },
        { label: 'Select All', role: 'selectAll' },
      )
    } else if (params.selectionText) {
      menuItems.push({ label: 'Copy', role: 'copy' })
    }
    if (menuItems.length > 0) {
      Menu.buildFromTemplate(menuItems).popup()
    }
  })

  // Block external navigation
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Load the renderer
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
})

let isQuitting = false
app.on('before-quit', async (e) => {
  if (!isQuitting) {
    e.preventDefault()
    isQuitting = true
    try {
      await walletService.closeWallet()
    } catch (err) {
      console.error('[app] Error saving wallet on quit:', err)
    }
    app.quit()
  }
})

app.on('window-all-closed', () => {
  app.quit()
})

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}
