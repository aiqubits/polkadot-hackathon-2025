# Worboo on Polkadot

An on-chain, gameified Wordle experience for the **Dot Your Future** hackathon. Players solve daily word challenges in the browser, submit results to smart contracts running on **Moonbase Alpha (Polkadot’s EVM testnet)**, earn the `WBOO` reward token, and unlock cosmetic collectibles inside the Worboo shop.

---

## Highlights

- **Multi-package monorepo**
  - `packages/contracts`: Hardhat + TypeScript workspace with Worboo smart contracts and tests.
  - `react-wordle`: React/RainbowKit frontend, now wired to Moonbase via wagmi + ethers v6.
- **Core contracts (v1 MVP)**
  - `WorbooRegistry`: tracks player registration, daily submissions, streaks.
  - `WorbooToken`: ERC‑20 reward currency with role-gated mint/burn.
  - `WorbooShop`: ERC‑1155 collectibles redeemed with WBOO.
- **TDD first**: Hardhat/Jest specs accompany every contract and service; see the [implementation plan](doc/implementation-plan.md).
- **Hackathon ready docs**: Technical roadmap, deployment notes, and Polkadot background inside `doc/`.

---

## Architecture

```mermaid
graph TD
    subgraph Frontend
        A[React Wordle App]
        B[useRelayerNotifications]
        C[useRelayerHealth]
    end

    subgraph Relayer
        D[GameRecorded Listener]
        E[Metrics & Persistent Cache]
        F[/healthz & status CLI]
        G[Structured Logger]
    end

    subgraph Contracts
        H[WorbooRegistry]
        I[WorbooToken]
        J[WorbooShop]
    end

    A --> B
    A --> C
    B --> D
    C --> F
    D --> H
    D --> I
    E --> F
    G --> F
    D --> E

    H --> I
    I --> J
```

```mermaid
sequenceDiagram
    participant Player
    participant Frontend
    participant Registry
    participant Relayer
    participant Token

    Player->>Frontend: recordGame(dayId, guesses, victory)
    Frontend->>Registry: recordGame(...)
    Registry->>Relayer: emit GameRecorded
    Relayer-->>Relayer: dedupe & enqueue
    Relayer->>Token: mintTo(player)
    Token-->>Player: WBOO balance +
    Relayer-->>Frontend: /healthz queueDepth ↓
```\n## Repository Map

| Path | Purpose |
| --- | --- |
| `packages/contracts/` | Hardhat workspace (contracts, tests, Ignition deployment module, TypeChain outputs). |
| `react-wordle/` | Frontend app with wallet connectivity, Moonbase integration, and UI for the Worboo shop. |
| `doc/` | Hackathon collateral: architecture notes, migration research, implementation plan, and onboarding docs. |

---

## Quick Start

### 1. Prerequisites
- Node.js 18+ (recommended LTS).
- npm 8+ (uv-supported environment OK).
- Rust toolchain (only needed if you want to rebuild the Halo2 WASM workers).
- A Moonbase Alpha funded wallet (grab DEV tokens from [Moonbeam faucet](https://docs.moonbeam.network/builders/get-started/networks/moonbase/faucet/)).

### 2. Install dependencies
From repository root:

```bash
npm install --ignore-scripts
# or install each workspace individually:
npm install --prefix packages/contracts
npm install --prefix packages/relayer
npm install --ignore-scripts --prefix react-wordle
```

> The root install pulls in shared lint/format tooling. `--ignore-scripts` keeps Husky from running when the repo is checked out outside Git. If you still see Husky errors, set `HUSKY=0` (or `HUSKY_SKIP_INSTALL=1`) before installing.

### 3. Configure environment

Create `packages/contracts/.env` (copy from `.env.example`) and set:

```ini
PRIVATE_KEY=0xYOUR_PRIVATE_KEY
MOONBASE_RPC=https://rpc.api.moonbase.moonbeam.network
MOONBEAM_RPC=https://rpc.api.moonbeam.network # optional mainnet promotion
```

For the frontend (`react-wordle/.env`), fill in contract addresses after deployment:

```ini
REACT_APP_WORBOO_REGISTRY=0x...
REACT_APP_WORBOO_TOKEN=0x...
REACT_APP_WORBOO_SHOP=0x...
REACT_APP_RELAYER_HEALTH_URL=http://localhost:8787/healthz
```

> If `REACT_APP_RELAYER_HEALTH_URL` is omitted, the frontend defaults to `/healthz` on the same origin, so local dev can rely on the health server port defined above.

### 4. Compile & test contracts

```bash
cd packages/contracts
npm run compile
npm run test
```

The test suite covers registration edge cases, streak logic, token permissions, and shop purchase flows.

### 5. Deploy to Moonbase Alpha

```bash
# from packages/contracts
npx hardhat ignition deploy ./ignition/modules/WorbooModule.ts --network moonbase
npm run export:addresses
```

Populate the frontend `.env` addresses with the resulting deployment output.

### 6. Run the frontend

```bash
cd react-wordle
npm start
```

RainbowKit presents Moonbase Alpha by default. Connect a wallet, register on-chain, and start purchasing items with WBOO.

### 7. (Optional) Start the reward relayer

Grant the `GAME_MASTER_ROLE` to the relayer wallet (so it can mint rewards):

```bash
cd packages/contracts
npx hardhat run --network moonbase scripts/grantGameMaster.ts <tokenAddress> <relayerAddress>
```

Then create a config file (JSON) and launch the listener:

```bash
cd ../relayer
cp config/relayer.config.json.example config/relayer.config.json
# edit config/relayer.config.json with RPC URL, private key, registry & token addresses
npm run start
```

Config keys mirror the environment variables (which still work for quick overrides):

```json
{
  "rpcUrl": "https://rpc.api.moonbase.moonbeam.network",
  "privateKey": "0xRELAYER_PRIVATE_KEY",
  "registryAddress": "0x...",
  "tokenAddress": "0x...",
  "rewardPerWin": "10",
  "maxRetries": 3,
  "backoffMs": 1000,
  "cachePath": ".cache/processed-events.jsonl",
  "cacheMaxEntries": 1000,
  "healthPath": ".cache/health.json",
  "healthHost": "0.0.0.0",
  "healthCorsOrigin": "*",
  "healthPort": 8787,
  "logFilePath": ".logs/worboo-relayer.log",
  "logMaxBytes": 5242880,
  "logBackupCount": 5
}
```

Set `RELAYER_CONFIG_PATH` if you store the file outside `packages/relayer/config/`.
> Container deploy: `docker build -f packages/relayer/Dockerfile -t worboo-relayer .` then run with your mounted `relayer.config.json`. Process manager: `pm2 start packages/relayer/ecosystem.config.cjs`.

Processed event caches are capped via `cacheMaxEntries` (or `RELAYER_CACHE_MAX_ENTRIES`); oldest entries are trimmed automatically to prevent unbounded growth while preserving restart safety. Use `RELAYER_LOG_HTTP_ENDPOINT` to forward JSON log lines to an external collector.

Use `healthCorsOrigin: "disable"` (or `RELAYER_HEALTH_CORS_ORIGIN=disable`) if you need to omit the `Access-Control-Allow-Origin` header entirely.

The relayer watches `GameRecorded` events, persists processed hashes to disk (safe for restarts), and mints `WBOO` for victorious players using the reward amount defined in the config. The UI navbar displays relayer status so players see pending wins and successful mints in real time. To inspect relayer health from the CLI run:

```bash
cd packages/relayer
npm run status
```

An HTTP endpoint is also exposed at `http://localhost:8787/healthz` (configurable via env) so dashboards or the frontend can read queue depth and heartbeat information.

---

## Testing & Quality Gates

| Layer | Command | Notes |
| --- | --- | --- |
| Monorepo lint | `npm run lint` | Shared ESLint config covering the contracts and relayer packages. |
| Smart contracts | `npm run test` (in `packages/contracts`) | Hardhat + ethers v6, deterministic tests for registry/token/shop. |
| Frontend services | `npm test -- --watch=false --testPathPattern="(shop|contracts|words)"` | Runs the curated unit tests (shop utilities, contract config, word helpers). Legacy CRA tests currently require additional polyfills (see “Known Issues”). |
| Relayer service | `npm test` (in `packages/relayer`) | Vitest suite covering config parsing, persistence store, and mint retry handler. |
| Relayer health | `npm run status` (in `packages/relayer`) | Prints JSON snapshot covering queue depth, last mint, and cache size. |

### Known Issues

- `react-wordle` ships original ZK worker code that relies on `import.meta`. CRA/Jest defaults stumble on this syntax. We are keeping the original tests untouched; run targeted test patterns as shown above until the test harness is modernised.
- Existing word-list snapshot tests may fail due to timezone/locale; see `src/lib/words.test.ts` for context if you need deterministic indices.

---

## Smart-Contract Overview

| Contract | Responsibility | Notable Functions |
| --- | --- | --- |
| `WorbooRegistry` | Player lifecycle & streak tracking | `register`, `recordGame`, `getProfile` |
| `WorbooToken` | ERC-20 reward currency (`WBOO`) | `mintTo`, `spend`, `GAME_MASTER_ROLE` |
| `WorbooShop` | ERC-1155 cosmetics & chests | `setItemConfig`, `purchase`, `balanceOfBatch` |

Contracts are designed for hackathon velocity: upgraded via redeploy, role-managed with OpenZeppelin `AccessControl`, and extensively unit-tested in Foundry-style Hardhat tests.

For a deeper design discussion see [`doc/mvp-architecture.md`](doc/mvp-architecture.md) and [`doc/polkadot-target.md`](doc/polkadot-target.md).

---

## Frontend Notes

- Wallet connection via RainbowKit/wagmi (Moonbase Alpha chain configured in `src/lib/wagmi.ts`).
- Contract accessors encapsulated in `src/services/contracts.ts`.
- Player data + purchases handled by the React Query hook `src/hooks/useWorbooPlayer.ts`.
- Shop utilities (`src/utils/shop.ts`) map static catalog IDs to ERC‑1155 token IDs and filter WBOO-priced items.

---

## Hackathon Submission Checklist

1. ✅ Contracts compiled & tests green (`packages/contracts`).
2. ✅ Frontend connects to Moonbase Alpha, handles on-chain registration, balance display, and purchases.
3. ✅ Documentation refreshed (this README, `doc/README - polkadot.md`, and deployment notes).
4. ✅ Relayer package ready with environment template & reward workflow.
5. 🔜 
   1. Deck:
   2. Demo:

---

## Roadmap

Short term goals are tracked in [`doc/implementation-plan.md`](doc/implementation-plan.md). Highlights:

- Add automated ABI export pipeline from Hardhat to the React app.
- Expand React test coverage once the CRA/Jest toolchain is upgraded.
- Deploy the auto-mint relayer (see `packages/relayer`) and extend it with persistence/indexing (details in [`doc/roadmap-next.md`](doc/roadmap-next.md)).
- Integrate the ZK proof relayer + IPFS pipeline (v2 scope).
- Explore PVM/ink! migration for advanced gameplay and governance.

---

## Additional Resources

- [Polkadot Hackathon README](doc/README%20-%20polkadot.md)
- [Deployment Guide](doc/deployment-guide.md)
- [部署指南（中文）](doc/deployment-guide.zh-CN.md)
- [Demo Playbook](doc/demo-playbook.md)
- [Post-MVP Roadmap](doc/roadmap-next.md)
- [Testing Matrix & Coverage Checklist](doc/testing-matrix.md)
- [Observability Guide](doc/observability.md)
- [Indexer Scaffold](packages/indexer/README.md)
- [Migrating Ethereum DApps to Polkadot – Technical Roadmap & Strategy (PDF)](doc/Migrating%20Ethereum%20DApps%20to%20Polkadot%20–%20Technical%20Roadmap%20%26%20Strategy.pdf)
- [Moonbeam Docs](https://docs.moonbeam.network/)
- [RainbowKit](https://www.rainbowkit.com/) / [wagmi](https://wagmi.sh/) references.

---

Made with 🟩🟨⬛ by the Worboo team for the Dot Your Future hackathon.













