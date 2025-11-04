import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { describe, expect, beforeEach, it, afterEach } from 'vitest'

import { loadConfig } from '../src/config'

const ORIGINAL_ENV = { ...process.env };

describe('loadConfig', () => {
  let tempDir: string | null = null

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.RELAYER_RPC_URL;
    delete process.env.RELAYER_PRIVATE_KEY;
    delete process.env.RELAYER_REGISTRY_ADDRESS;
    delete process.env.RELAYER_TOKEN_ADDRESS;
    delete process.env.RELAYER_REWARD_PER_WIN;
    delete process.env.RELAYER_MAX_RETRIES;
    delete process.env.RELAYER_BACKOFF_MS;
    delete process.env.RELAYER_CACHE_PATH;
    delete process.env.RELAYER_CACHE_MAX_ENTRIES;
    delete process.env.RELAYER_HEALTH_PATH;
    delete process.env.RELAYER_HEALTH_PORT;
    delete process.env.RELAYER_HEALTH_HOST;
    delete process.env.RELAYER_LOG_FILE;
    delete process.env.RELAYER_LOG_MAX_BYTES;
    delete process.env.RELAYER_LOG_BACKUPS;
    delete process.env.RELAYER_CONFIG_PATH;
    tempDir = null
  });

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
      tempDir = null
    }
  })

  const withTempConfig = (contents: Record<string, unknown>) => {
    tempDir = mkdtempSync(join(tmpdir(), 'worboo-config-test-'))
    const filePath = resolve(tempDir, 'relayer.config.json')
    writeFileSync(filePath, JSON.stringify(contents, null, 2), 'utf-8')
    process.env.RELAYER_CONFIG_PATH = filePath
  }

  it('throws when required variables are missing', () => {
    expect(() => loadConfig()).toThrow(/RELAYER_RPC_URL/);

    process.env.RELAYER_RPC_URL = 'https://rpc.example';
    expect(() => loadConfig()).toThrow(/RELAYER_PRIVATE_KEY/);
  });

  it('normalises addresses and applies defaults', () => {
    process.env.RELAYER_RPC_URL = 'https://rpc.example';
    process.env.RELAYER_PRIVATE_KEY = '0xabc1234567890abc1234567890abc1234567890abc1234567890abc1234567';
    process.env.RELAYER_REGISTRY_ADDRESS = '0x1111111111111111111111111111111111111111';
    process.env.RELAYER_TOKEN_ADDRESS = '0x2222222222222222222222222222222222222222';

    const config = loadConfig();
    expect(config.rpcUrl).toBe('https://rpc.example');
    expect(config.registryAddress).toBe('0x1111111111111111111111111111111111111111');
    expect(config.tokenAddress).toBe('0x2222222222222222222222222222222222222222');
    expect(config.rewardPerWin.toString()).toBe('10000000000000000000'); // 10 WBOO default
    expect(config.maxRetries).toBe(3);
    expect(config.backoffMs).toBe(1000);
    expect(config.cachePath).toBeUndefined();
    expect(config.cacheMaxEntries).toBeUndefined();
    expect(config.healthPath).toBeUndefined();
    expect(config.healthPort).toBe(8787);
    expect(config.healthHost).toBe('0.0.0.0');
    expect(config.healthCorsOrigin).toBe('*');
    expect(config.logFilePath).toBeUndefined();
    expect(config.logMaxBytes).toBe(5 * 1024 * 1024);
    expect(config.logBackupCount).toBe(5);
    expect(config.logHttpEndpoint).toBeUndefined();
  });

  it('honours custom reward amounts', () => {
    process.env.RELAYER_RPC_URL = 'https://rpc.example';
    process.env.RELAYER_PRIVATE_KEY = '0xabc1234567890abc1234567890abc1234567890abc1234567890abc1234567';
    process.env.RELAYER_REGISTRY_ADDRESS = '0x1111111111111111111111111111111111111111';
    process.env.RELAYER_TOKEN_ADDRESS = '0x2222222222222222222222222222222222222222';
    process.env.RELAYER_REWARD_PER_WIN = '42.5';

    const config = loadConfig();
    expect(config.rewardPerWin.toString()).toBe('42500000000000000000'); // 42.5 WBOO
  });

  it('parses retry/backoff overrides, cache path, and health settings', () => {
    process.env.RELAYER_RPC_URL = 'https://rpc.example';
    process.env.RELAYER_PRIVATE_KEY = '0xabc1234567890abc1234567890abc1234567890abc1234567890abc1234567';
    process.env.RELAYER_REGISTRY_ADDRESS = '0x1111111111111111111111111111111111111111';
    process.env.RELAYER_TOKEN_ADDRESS = '0x2222222222222222222222222222222222222222';
    process.env.RELAYER_MAX_RETRIES = '5';
    process.env.RELAYER_BACKOFF_MS = '1500';
    process.env.RELAYER_CACHE_PATH = '/tmp/custom.jsonl';
    process.env.RELAYER_CACHE_MAX_ENTRIES = '2000';
    process.env.RELAYER_HEALTH_PATH = '/tmp/health.json';
    process.env.RELAYER_HEALTH_PORT = '9999';
    process.env.RELAYER_HEALTH_HOST = '127.0.0.1';
    process.env.RELAYER_HEALTH_CORS_ORIGIN = 'https://example.com';
    process.env.RELAYER_LOG_FILE = '/var/log/worboo.jsonl';
    process.env.RELAYER_LOG_MAX_BYTES = '1048576';
    process.env.RELAYER_LOG_BACKUPS = '7';
    process.env.RELAYER_LOG_HTTP_ENDPOINT = 'https://logs.example/ship';

    const config = loadConfig();
    expect(config.maxRetries).toBe(5);
    expect(config.backoffMs).toBe(1500);
    expect(config.cachePath).toBe('/tmp/custom.jsonl');
    expect(config.cacheMaxEntries).toBe(2000);
    expect(config.healthPath).toBe('/tmp/health.json');
    expect(config.healthPort).toBe(9999);
    expect(config.healthHost).toBe('127.0.0.1');
    expect(config.healthCorsOrigin).toBe('https://example.com');
    expect(config.logHttpEndpoint).toBe('https://logs.example/ship');
    expect(config.logFilePath).toBe('/var/log/worboo.jsonl');
    expect(config.logMaxBytes).toBe(1_048_576);
    expect(config.logBackupCount).toBe(7);
  });

  it('loads configuration from file when env variables are absent', () => {
    withTempConfig({
      rpcUrl: 'https://file-rpc.example',
      privateKey: '0xabc1234567890abc1234567890abc1234567890abc1234567890abc1234567',
      registryAddress: '0x3333333333333333333333333333333333333333',
      tokenAddress: '0x4444444444444444444444444444444444444444',
      rewardPerWin: '25',
      maxRetries: 6,
      backoffMs: 2500,
      cachePath: 'C:/cache/events.jsonl',
      cacheMaxEntries: 500,
      healthPath: 'C:/cache/health.json',
      healthPort: 9797,
      healthHost: '127.0.0.1',
      healthCorsOrigin: 'https://cors.example',
      logFilePath: 'C:/logs/relayer.log',
      logMaxBytes: 2048,
      logBackupCount: 2,
      logHttpEndpoint: 'https://logs.file/hooks',
    })

    const config = loadConfig()
    expect(config.rpcUrl).toBe('https://file-rpc.example')
    expect(config.registryAddress.toLowerCase()).toBe(
      '0x3333333333333333333333333333333333333333'
    )
    expect(config.tokenAddress.toLowerCase()).toBe(
      '0x4444444444444444444444444444444444444444'
    )
    expect(config.rewardPerWin.toString()).toBe('25000000000000000000')
    expect(config.maxRetries).toBe(6)
    expect(config.backoffMs).toBe(2500)
    expect(config.cachePath).toBe('C:/cache/events.jsonl')
    expect(config.cacheMaxEntries).toBe(500)
    expect(config.healthPath).toBe('C:/cache/health.json')
    expect(config.healthPort).toBe(9797)
    expect(config.healthHost).toBe('127.0.0.1')
    expect(config.healthCorsOrigin).toBe('https://cors.example')
    expect(config.logFilePath).toBe('C:/logs/relayer.log')
    expect(config.logMaxBytes).toBe(2048)
    expect(config.logBackupCount).toBe(2)
    expect(config.logHttpEndpoint).toBe('https://logs.file/hooks')
  })

  it('prefers environment variables over file values', () => {
    withTempConfig({
      rpcUrl: 'https://file.example',
      privateKey: '0x2222',
      registryAddress: '0x1111111111111111111111111111111111111111',
      tokenAddress: '0x2222222222222222222222222222222222222222',
      maxRetries: 1,
    })

    process.env.RELAYER_RPC_URL = 'https://env.example'
    process.env.RELAYER_PRIVATE_KEY = '0xbeef'
    process.env.RELAYER_REGISTRY_ADDRESS = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    process.env.RELAYER_TOKEN_ADDRESS = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    process.env.RELAYER_MAX_RETRIES = '9'
    process.env.RELAYER_CACHE_MAX_ENTRIES = '300'
    process.env.RELAYER_HEALTH_CORS_ORIGIN = 'disable'

    const config = loadConfig()
    expect(config.rpcUrl).toBe('https://env.example')
    expect(config.privateKey).toBe('0xbeef')
    expect(config.registryAddress.toLowerCase()).toBe(
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    )
    expect(config.tokenAddress.toLowerCase()).toBe(
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    )
    expect(config.maxRetries).toBe(9)
    expect(config.cacheMaxEntries).toBe(300)
    expect(config.healthCorsOrigin).toBeUndefined()
  })
});



