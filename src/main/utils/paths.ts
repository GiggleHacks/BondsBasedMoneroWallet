import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'

export function getWalletDir(): string {
  try {
    const configPath = getAppConfigPath()
    if (existsSync(configPath)) {
      const data = JSON.parse(readFileSync(configPath, 'utf-8'))
      if (data.walletDir && existsSync(data.walletDir)) {
        return data.walletDir
      }
    }
  } catch {}
  return join(app.getPath('userData'), 'wallets')
}

export function setWalletDir(dir: string): void {
  const configPath = getAppConfigPath()
  let data: any = {}
  try {
    if (existsSync(configPath)) {
      data = JSON.parse(readFileSync(configPath, 'utf-8'))
    }
  } catch {}
  data.walletDir = dir
  writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8')
}

export function getWalletPath(filename: string): string {
  return join(getWalletDir(), filename)
}

export function getConfigPath(): string {
  return join(app.getPath('userData'), 'config')
}

export function getAppConfigPath(): string {
  return join(app.getPath('userData'), 'app-config.json')
}

export function getLastNode(): string | null {
  try {
    const configPath = getAppConfigPath()
    if (!existsSync(configPath)) return null
    const data = JSON.parse(readFileSync(configPath, 'utf-8'))
    return data.lastNode ?? null
  } catch { return null }
}

export function setLastNode(uri: string): void {
  const configPath = getAppConfigPath()
  let data: any = {}
  try {
    if (existsSync(configPath)) data = JSON.parse(readFileSync(configPath, 'utf-8'))
  } catch {}
  data.lastNode = uri
  writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8')
}
