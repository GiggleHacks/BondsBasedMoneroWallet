import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { encrypt, decrypt } from './crypto.service'
import { SYNC_FILE_NAME, SYNC_VERSION } from '../../shared/constants'
import type { SyncData, Contact } from '../../shared/types'

class CloudSyncService {
  private syncFolder: string | null = null
  private passphrase: string | null = null
  private localData: SyncData = this.getDefaultData()

  private getDefaultData(): SyncData {
    return {
      contacts: [],
      txLabels: {},
      settings: {},
      customNodes: [],
      version: SYNC_VERSION,
      lastModified: Date.now(),
    }
  }

  private getLocalPath(): string {
    return join(app.getPath('userData'), 'sync_data.json')
  }

  async setSyncFolder(folderPath: string): Promise<void> {
    this.syncFolder = folderPath
    // Load and merge
    await this.sync()
  }

  getSyncFolder(): string | null {
    return this.syncFolder
  }

  setPassphrase(passphrase: string): void {
    this.passphrase = passphrase
  }

  async sync(): Promise<void> {
    // Load local data
    this.loadLocal()

    // If sync folder set, try reading cloud file
    if (this.syncFolder && this.passphrase) {
      const cloudPath = join(this.syncFolder, SYNC_FILE_NAME)

      if (existsSync(cloudPath)) {
        try {
          const encryptedContent = readFileSync(cloudPath, 'utf8')
          const decrypted = decrypt(encryptedContent, this.passphrase)
          const cloudData: SyncData = JSON.parse(decrypted)

          // Merge: last modified wins
          if (cloudData.lastModified > this.localData.lastModified) {
            this.localData = { ...cloudData }
          }
        } catch (e) {
          console.warn('Failed to read cloud sync file:', e)
        }
      }

      // Save back to both locations
      this.saveLocal()
      this.saveCloud()
    }
  }

  private loadLocal(): void {
    const localPath = this.getLocalPath()
    if (existsSync(localPath)) {
      try {
        this.localData = JSON.parse(readFileSync(localPath, 'utf8'))
      } catch {
        this.localData = this.getDefaultData()
      }
    }
  }

  private saveLocal(): void {
    const localPath = this.getLocalPath()
    writeFileSync(localPath, JSON.stringify(this.localData, null, 2), 'utf8')
  }

  private saveCloud(): void {
    if (!this.syncFolder || !this.passphrase) return
    const cloudPath = join(this.syncFolder, SYNC_FILE_NAME)

    try {
      if (!existsSync(this.syncFolder)) {
        mkdirSync(this.syncFolder, { recursive: true })
      }
      const encrypted = encrypt(JSON.stringify(this.localData), this.passphrase)
      writeFileSync(cloudPath, encrypted, 'utf8')
    } catch (e) {
      console.warn('Failed to write cloud sync file:', e)
    }
  }

  private markModified(): void {
    this.localData.lastModified = Date.now()
    this.saveLocal()
    this.saveCloud()
  }

  // --- Contacts ---
  getContacts(): Contact[] {
    this.loadLocal()
    return this.localData.contacts
  }

  saveContact(contact: Contact): void {
    const idx = this.localData.contacts.findIndex(c => c.id === contact.id)
    if (idx >= 0) {
      this.localData.contacts[idx] = contact
    } else {
      this.localData.contacts.push(contact)
    }
    this.markModified()
  }

  deleteContact(id: string): void {
    this.localData.contacts = this.localData.contacts.filter(c => c.id !== id)
    this.markModified()
  }

  // --- Tx Labels ---
  getTxLabels(): Record<string, string> {
    this.loadLocal()
    return this.localData.txLabels
  }

  setTxLabel(txHash: string, label: string): void {
    this.localData.txLabels[txHash] = label
    this.markModified()
  }

  // --- Settings ---
  getSetting(key: string): unknown {
    this.loadLocal()
    return this.localData.settings[key]
  }

  setSetting(key: string, value: unknown): void {
    this.localData.settings[key] = value
    this.markModified()
  }
}

export const syncService = new CloudSyncService()
