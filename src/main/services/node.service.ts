import { DEFAULT_NODES } from '../../shared/constants'
import type { NodeInfo } from '../../shared/types'

let moneroTs: any = null
try {
  moneroTs = require('monero-ts')
} catch (e) {
  console.error('[node] monero-ts failed to load:', e)
}

class NodeService {
  private currentUri: string | null = null

  async connect(uri: string): Promise<{ height: number }> {
    if (!moneroTs) { this.currentUri = uri; return { height: 0 } }
    try {
      const daemon = await moneroTs.connectToDaemonRpc({ uri, rejectUnauthorized: false })
      const height = await daemon.getHeight()
      this.currentUri = uri
      return { height }
    } catch (e) {
      console.warn(`[node] Failed to connect to ${uri}:`, e)
      this.currentUri = uri
      return { height: 0 }
    }
  }

  async testConnection(uri: string): Promise<{ latency: number; height: number; isHealthy: boolean }> {
    if (!moneroTs) return { latency: 0, height: 0, isHealthy: false }
    const start = Date.now()
    try {
      const daemon = await moneroTs.connectToDaemonRpc({ uri, rejectUnauthorized: false })
      const height = await daemon.getHeight()
      return { latency: Date.now() - start, height, isHealthy: true }
    } catch {
      return { latency: Date.now() - start, height: 0, isHealthy: false }
    }
  }

  async getBestNode(): Promise<string> {
    if (!moneroTs) {
      this.currentUri = DEFAULT_NODES[0].uri
      return DEFAULT_NODES[0].uri
    }

    const results = await Promise.allSettled(
      DEFAULT_NODES.map(async (node) => {
        const result = await this.testConnection(node.uri)
        return { ...result, uri: node.uri }
      })
    )

    const healthy = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value.isHealthy)
      .map(r => r.value)
      .sort((a, b) => a.latency - b.latency)

    const bestUri = healthy.length > 0 ? healthy[0].uri : DEFAULT_NODES[0].uri
    this.currentUri = bestUri
    return bestUri
  }

  getDefaultNodes(): NodeInfo[] {
    return DEFAULT_NODES
  }

  getCurrentUri(): string | null {
    return this.currentUri
  }

  setCurrentUri(uri: string): void {
    this.currentUri = uri
  }
}

export const nodeService = new NodeService()
