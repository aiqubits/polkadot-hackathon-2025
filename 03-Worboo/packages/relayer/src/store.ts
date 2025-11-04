import { appendFile, mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, resolve } from 'path'
import { existsSync } from 'fs'
import { appendFile, mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, resolve } from 'path'
import { existsSync } from 'fs'

export type ProcessedEventMetadata = {
  txHash: string
  mintedAt?: number
}

type StoredEventRecord = {
  key: string
  txHash: string
  mintedAt: number
}

export type ProcessedEventStoreOptions = {
  filePath?: string
  maxEntries?: number
}

const DEFAULT_CACHE_PATH = resolve(
  process.cwd(),
  '.cache',
  'processed-events.jsonl'
)

export class ProcessedEventStore {
  private readonly filePath: string
  private readonly maxEntries?: number
  private readonly processed = new Set<string>()
  private readonly order: string[] = []
  private readonly records = new Map<string, StoredEventRecord>()
  private writeChain: Promise<void> = Promise.resolve()

  private constructor(filePath: string, maxEntries?: number) {
    this.filePath = filePath
    this.maxEntries = maxEntries
  }

  static async open(
    options: ProcessedEventStoreOptions = {}
  ): Promise<ProcessedEventStore> {
    const filePath =
      options.filePath ?? process.env.RELAYER_CACHE_PATH ?? DEFAULT_CACHE_PATH
    const store = new ProcessedEventStore(filePath, options.maxEntries)
    await store.initialise()
    return store
  }

  get size(): number {
    return this.processed.size
  }

  get path(): string {
    return this.filePath
  }

  hasProcessed(key: string): boolean {
    return this.processed.has(key)
  }

  async markProcessed(
    key: string,
    meta: ProcessedEventMetadata
  ): Promise<void> {
    if (this.processed.has(key)) {
      return
    }

    const record: StoredEventRecord = {
      key,
      txHash: meta.txHash,
      mintedAt: meta.mintedAt ?? Date.now(),
    }

    this.processed.add(key)
    this.order.push(key)
    this.records.set(key, record)

    await this.enqueueWrite(async () => {
      await this.appendRecord(record)
      if (this.shouldTrim()) {
        await this.trimExcess()
      }
    })
  }

  private async initialise(): Promise<void> {
    await this.ensureDirectory()

    if (!existsSync(this.filePath)) {
      await writeFile(this.filePath, '', { encoding: 'utf-8' })
      return
    }

    const buffer = await readFile(this.filePath, { encoding: 'utf-8' })
    if (!buffer.trim()) {
      return
    }

    buffer.split('\n').forEach((line) => {
      const trimmed = line.trim()
      if (!trimmed) return
      try {
        const parsed = JSON.parse(trimmed) as StoredEventRecord
        if (parsed.key) {
          this.processed.add(parsed.key)
          this.order.push(parsed.key)
          this.records.set(parsed.key, parsed)
        }
      } catch {
        throw new Error(`Failed to parse processed event entry: ${trimmed}`)
      }
    })

    if (this.shouldTrim()) {
      await this.trimExcess()
    }
  }

  private enqueueWrite(task: () => Promise<void>): Promise<void> {
    this.writeChain = this.writeChain.then(task).catch((error) => {
      this.writeChain = Promise.resolve()
      throw error
    })
    return this.writeChain
  }

  private shouldTrim(): boolean {
    if (!this.maxEntries || this.maxEntries <= 0) {
      return false
    }
    return this.order.length > this.maxEntries
  }

  private async trimExcess(): Promise<void> {
    if (!this.maxEntries) return

    let trimmed = false
    while (this.order.length > this.maxEntries) {
      const oldest = this.order.shift()
      if (!oldest) break
      this.processed.delete(oldest)
      this.records.delete(oldest)
      trimmed = true
    }

    if (trimmed) {
      await this.rewriteAllRecords()
    }
  }

  private async ensureDirectory(): Promise<void> {
    const dir = dirname(this.filePath)
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }
  }

  private async appendRecord(record: StoredEventRecord): Promise<void> {
    await appendFile(this.filePath, `${JSON.stringify(record)}\n`, {
      encoding: 'utf-8',
    })
  }

  private async rewriteAllRecords(): Promise<void> {
    await this.ensureDirectory()
    const lines = this.order
      .map((key) => this.records.get(key))
      .filter((value): value is StoredEventRecord => Boolean(value))
      .map((value) => JSON.stringify(value))
      .join('\n')
    await writeFile(
      this.filePath,
      lines.length > 0 ? `${lines}\n` : '',
      'utf-8'
    )
  }
}
