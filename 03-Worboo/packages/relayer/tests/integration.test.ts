import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join, resolve } from 'path'
import { tmpdir } from 'os'

import { ProcessedEventStore } from '../src/store'
import { RelayerMetrics } from '../src/metrics'
import { createGameRecordedHandler } from '../src/handler'
import { createLogger } from '../src/logger'

const createTempPaths = () => {
  const dir = mkdtempSync(join(tmpdir(), 'worboo-integration-'))
  const cachePath = resolve(dir, 'events.jsonl')
  const healthPath = resolve(dir, 'health.json')
  return { dir, cachePath, healthPath }
}

const waitFor = async (
  predicate: () => Promise<boolean> | boolean,
  timeoutMs = 5000,
  intervalMs = 100
): Promise<void> => {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const result = await predicate()
    if (result) return
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  throw new Error('Condition not met within timeout')
}

describe('relayer integration', () => {
  it('mints rewards on GameRecorded events', async () => {
    const originalCwd = process.cwd()
    const contractsDir = resolve(__dirname, '../../contracts')
    process.chdir(contractsDir)
    process.env.TS_NODE_TRANSPILE_ONLY = 'true'
    process.env.TS_NODE_PROJECT = resolve(contractsDir, 'tsconfig.json')
    await import('ts-node/register/transpile-only')
    const hre = await import('hardhat')
    await hre.run('compile', { quiet: true })
    const { ethers } = hre

    const { dir, cachePath, healthPath } = createTempPaths()

    const [deployer, relayerSigner, player] = await ethers.getSigners()

    const tokenFactory = await ethers.getContractFactory('WorbooToken', deployer)
    const token = await tokenFactory.deploy()
    await token.waitForDeployment()

    const registryFactory = await ethers.getContractFactory('WorbooRegistry', deployer)
    const registry = await registryFactory.deploy()
    await registry.waitForDeployment()

    const role = await token.GAME_MASTER_ROLE()
    await token.grantRole(role, await relayerSigner.getAddress())

    const store = await ProcessedEventStore.open({ filePath: cachePath })
    const metrics = new RelayerMetrics({ healthPath })
    const logger = createLogger({ infoWriter: () => undefined, errorWriter: () => undefined })

    const rewardPerWin = ethers.parseUnits('10', 18)
    const handler = createGameRecordedHandler({
      rewardPerWin,
      store,
      token: token.connect(relayerSigner) as any,
      maxRetries: 3,
      backoffMs: 100,
      logger,
      metrics: {
        recordGameVictory: () => metrics.recordGameVictory(),
        recordMintSuccess: () => metrics.recordMintSuccess(),
        recordMintFailure: (error?: unknown) => metrics.recordMintFailure(error),
      },
    })

    registry.on(
      'GameRecorded',
      async (
        playerAddr: string,
        dayId: bigint,
        wordHash: string,
        guesses: number,
        victory: boolean,
        streak: bigint,
        totalGames: bigint,
        totalWins: bigint,
        event
      ) => {
        await handler(
          {
            player: playerAddr,
            dayId,
            wordHash,
            guesses,
            victory,
            streak,
            totalGames,
            totalWins,
          } as any,
          {
            transactionHash: event.transactionHash,
            logIndex: event.logIndex,
          }
        )
      }
    )

    await registry.connect(player).register()
    const dayId = 1n
    const wordHash = ethers.encodeBytes32String('integration')
    await registry.connect(player).recordGame(dayId, wordHash, 3, true)

    try {
      await waitFor(async () => {
        const balance = await token.balanceOf(await player.getAddress())
        return balance === rewardPerWin
      })

      expect(store.size).toBe(1)
      const snapshot = metrics.snapshot()
      expect(snapshot.queueDepth).toBe(0)
      expect(snapshot.totalMinted).toBe(1)
    } finally {
      registry.removeAllListeners()
      rmSync(dir, { recursive: true, force: true })
      process.chdir(originalCwd)
    }
  }, 40000)
})
