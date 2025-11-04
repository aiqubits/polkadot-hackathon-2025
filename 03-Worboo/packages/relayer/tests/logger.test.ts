import { mkdtempSync, readFileSync, rmSync } from 'fs'
import { join, resolve } from 'path'
import { tmpdir } from 'os'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createLogger } from '../src/logger'

describe('createLogger', () => {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  let originalFetch: typeof fetch | undefined

  afterEach(() => {
    if (originalFetch) {
      // @ts-expect-error restore
      global.fetch = originalFetch
      originalFetch = undefined
    }
  })

  it('emits structured info records', () => {
    const lines: string[] = []
    const logger = createLogger({
      context: { component: 'relayer' },
      infoWriter: (line) => lines.push(line),
      errorWriter: (line) => lines.push(line),
    })

    logger.info('boot', { retries: 3 })

    expect(lines).toHaveLength(1)
    const record = JSON.parse(lines[0])
    expect(record.level).toBe('info')
    expect(record.message).toBe('boot')
    expect(record.context).toEqual({ component: 'relayer' })
    expect(record.meta).toEqual({ retries: 3 })
    expect(typeof record.ts).toBe('string')
  })

  it('routes warn/error to error writer', () => {
    const infoWriter = vi.fn()
    const errorWriter = vi.fn()
    const logger = createLogger({ infoWriter, errorWriter })

    logger.warn('retry', { attempt: 2 })
    logger.error('fatal', { reason: 'boom' })

    expect(infoWriter).not.toHaveBeenCalled()
    expect(errorWriter).toHaveBeenCalledTimes(2)
    const warnRecord = JSON.parse(errorWriter.mock.calls[0][0])
    const errorRecord = JSON.parse(errorWriter.mock.calls[1][0])
    expect(warnRecord.level).toBe('warn')
    expect(errorRecord.level).toBe('error')
  })

  it('writes to file and rotates when exceeding size', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'worboo-logger-'))
    const filePath = resolve(dir, 'relayer.log')
    const logger = createLogger({
      filePath,
      maxBytes: 256,
      backups: 1,
      infoWriter: () => undefined,
      errorWriter: () => undefined,
    })

    for (let index = 0; index < 20; index += 1) {
      logger.info('message', { index })
    }

    await new Promise((resolve) => setTimeout(resolve, 200))

    const contents = readFileSync(filePath, 'utf-8').trim().split('\n')
    expect(contents.length).toBeGreaterThan(0)
    expect(readFileSync(`${filePath}.1`, 'utf-8').length).toBeGreaterThan(0)

    rmSync(dir, { recursive: true, force: true })
  })

  it('ships logs to an HTTP endpoint when configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    // @ts-expect-error override test runtime fetch
    originalFetch = global.fetch
    // @ts-expect-error assign mock
    global.fetch = fetchMock

    const logger = createLogger({
      httpEndpoint: 'https://example.com/logs',
      infoWriter: () => undefined,
      errorWriter: () => undefined,
    })

    logger.info('hello', { test: true })
    await sleep(10)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('https://example.com/logs')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      keepalive: true,
    })
    const payload = fetchMock.mock.calls[0][1]?.body?.toString() ?? ''
    expect(payload).toContain('"message":"hello"')
    expect(payload).toContain('"test":true')
  })

  it('logs shipping failures without retry loops', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'))
    // @ts-expect-error override fetch
    originalFetch = global.fetch
    // @ts-expect-error assign mock
    global.fetch = fetchMock

    const errorWriter = vi.fn()
    const logger = createLogger({
      httpEndpoint: 'https://example.com/logs',
      infoWriter: () => undefined,
      errorWriter,
    })

    logger.info('message')
    await sleep(10)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    // warning about failure should be emitted exactly once
    const warnLogs = errorWriter.mock.calls
      .map(([line]) => JSON.parse(line as string))
      .filter((record) => record.message === '[relayer] log shipping failed')
    expect(warnLogs).toHaveLength(1)
  })
})
