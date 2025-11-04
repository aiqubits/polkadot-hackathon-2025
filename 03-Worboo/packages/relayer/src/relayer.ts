import { Wallet, Contract, JsonRpcProvider } from 'ethers'
import { loadConfig } from './config'
import registryArtifact from '../../contracts/artifacts/contracts/WorbooRegistry.sol/WorbooRegistry.json'
import tokenArtifact from '../../contracts/artifacts/contracts/WorbooToken.sol/WorbooToken.json'
import { ProcessedEventStore } from './store'
import { createGameRecordedHandler } from './handler'
import { createLogger } from './logger'
import { RelayerMetrics } from './metrics'
import { startHealthServer } from './server'

type GameRecordedEvent = {
  player: string
  dayId: bigint
  wordHash: string
  guesses: number
  victory: boolean
  streak: bigint
  totalGames: bigint
  totalWins: bigint
}

async function main() {
  const cfg = loadConfig()

  const provider = new JsonRpcProvider(cfg.rpcUrl)
  const wallet = new Wallet(cfg.privateKey, provider)

  const logger = createLogger({
    context: { component: 'worboo-relayer' },
    filePath: cfg.logFilePath,
    maxBytes: cfg.logMaxBytes,
    backups: cfg.logBackupCount,
  })

  const registry = new Contract(
    cfg.registryAddress,
    registryArtifact.abi,
    provider
  )
  const token = new Contract(
    cfg.tokenAddress,
    tokenArtifact.abi,
    wallet
  )

  const store = await ProcessedEventStore.open({
    filePath: cfg.cachePath,
    maxEntries: cfg.cacheMaxEntries,
  })
  const metrics = new RelayerMetrics({
    healthPath: RelayerMetrics.resolveDefaultPath(cfg.healthPath),
  })

  const healthServer = await startHealthServer({
    store,
    metrics,
    host: cfg.healthHost,
    port: cfg.healthPort,
    logger,
    corsOrigin: cfg.healthCorsOrigin,
  })

  const handler = createGameRecordedHandler({
    rewardPerWin: cfg.rewardPerWin,
    store,
    token: token as any,
    maxRetries: cfg.maxRetries,
    backoffMs: cfg.backoffMs,
    logger,
    metrics: {
      recordGameVictory: () => metrics.recordGameVictory(),
      recordMintSuccess: () => metrics.recordMintSuccess(),
      recordMintFailure: (error?: unknown) => metrics.recordMintFailure(error),
    },
  })

  logger.info('[relayer] starting Worboo reward listener', {
    registry: cfg.registryAddress,
    token: cfg.tokenAddress,
    reward: cfg.rewardPerWin.toString(),
    operator: wallet.address,
    retries: cfg.maxRetries,
    backoffMs: cfg.backoffMs,
    cache: store.path,
    healthPath: metrics.path,
    healthServerPort: healthServer.address()?.port ?? cfg.healthPort,
    healthCorsOrigin: cfg.healthCorsOrigin ?? 'disabled',
  })

  registry.on(
    'GameRecorded',
    async (
      player: string,
      dayId: bigint,
      wordHash: string,
      guesses: number,
      victory: boolean,
      streak: bigint,
      totalGames: bigint,
      totalWins: bigint,
      event
    ) => {
      const payload: GameRecordedEvent = {
        player,
        dayId,
        wordHash,
        guesses,
        victory,
        streak,
        totalGames,
        totalWins,
      }

      logger.info('[relayer] GameRecorded received', {
        player,
        victory,
        streak: streak.toString(),
        totalWins: totalWins.toString(),
      })

      await handler(payload as any, {
        transactionHash: event.transactionHash,
        logIndex: event.logIndex,
      })
    }
  )

  const shutdown = () => {
    logger.info('Shutting down relayer...')
    registry.removeAllListeners()
    healthServer
      .close()
      .catch((error) => logger.error('[relayer] health server close failed', { error }))
      .finally(() => process.exit(0))
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((error) => {
  console.error('[relayer] fatal error', error)
  process.exit(1)
})
