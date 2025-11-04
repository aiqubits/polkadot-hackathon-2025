import { mkdtempSync, rmSync } from 'fs'
import { join, resolve } from 'path'
import { tmpdir } from 'os'
import { describe, expect, it, beforeEach, afterEach } from 'vitest'

import { ProcessedEventStore } from '../src/store'

const createTempPath = () => {
  const dir = mkdtempSync(join(tmpdir(), 'worboo-relayer-'))
  const file = resolve(dir, 'events.jsonl')
  return { dir, file }
}

describe('ProcessedEventStore', () => {
  let tempDir: string
  let filePath: string

  beforeEach(() => {
    const tmp = createTempPath()
    tempDir = tmp.dir
    filePath = tmp.file
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('persists processed keys across instances', async () => {
    const first = await ProcessedEventStore.open({ filePath })
    expect(first.hasProcessed('0xabc:1')).toBe(false)

    await first.markProcessed('0xabc:1', { txHash: '0xmint' })
    expect(first.hasProcessed('0xabc:1')).toBe(true)

    const second = await ProcessedEventStore.open({ filePath })
    expect(second.hasProcessed('0xabc:1')).toBe(true)
  })

  it('does not duplicate entries when marking the same key twice', async () => {
    const store = await ProcessedEventStore.open({ filePath })
    await store.markProcessed('0xdef:0', { txHash: '0xhash' })
    await store.markProcessed('0xdef:0', { txHash: '0xhash' })

    const reloaded = await ProcessedEventStore.open({ filePath })
    expect(reloaded.size).toBe(1)
    expect(reloaded.hasProcessed('0xdef:0')).toBe(true)
  })

  it('trims oldest entries when maxEntries is exceeded', async () => {
    const store = await ProcessedEventStore.open({
      filePath,
      maxEntries: 2,
    })

    await store.markProcessed('0xaaa:0', { txHash: '0x1' })
    await store.markProcessed('0xbbb:0', { txHash: '0x2' })
    await store.markProcessed('0xccc:0', { txHash: '0x3' })

    const reloaded = await ProcessedEventStore.open({
      filePath,
      maxEntries: 2,
    })

    expect(reloaded.size).toBe(2)
    expect(reloaded.hasProcessed('0xaaa:0')).toBe(false)
    expect(reloaded.hasProcessed('0xbbb:0')).toBe(true)
    expect(reloaded.hasProcessed('0xccc:0')).toBe(true)
  })

  it('applies trimming on initial load when cache exceeds limit', async () => {
    const store = await ProcessedEventStore.open({ filePath })
    await store.markProcessed('0x111:0', { txHash: '0xa' })
    await store.markProcessed('0x222:0', { txHash: '0xb' })
    await store.markProcessed('0x333:0', { txHash: '0xc' })

    const limited = await ProcessedEventStore.open({
      filePath,
      maxEntries: 1,
    })

    expect(limited.size).toBe(1)
    expect(limited.hasProcessed('0x333:0')).toBe(true)
    expect(limited.hasProcessed('0x222:0')).toBe(false)
    expect(limited.hasProcessed('0x111:0')).toBe(false)
  })
})
