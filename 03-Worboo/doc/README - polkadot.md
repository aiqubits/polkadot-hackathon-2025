# Worboo · Dot Your Future Submission Dossier

Welcome to the Worboo Polkadot hackathon package. This document is written for judges, mentors, and contributors who need a concise summary of the project, its architecture, and the steps required to evaluate it during **Dot Your Future: Create, Connect, Transform**.

---

## 1. Project Snapshot

- **Track:** “Build the next generation of Web3 experiences” (Moonbeam/Moonbase REVM focus).
- **Tagline:** _Daily language quests with on-chain rewards and collectible cosmetics._
- **Status:** MVP complete. Frontend, contracts, and documentation are aligned to Moonbase Alpha. Optional ZK proof system ready for v2 integration.

### Why Polkadot?
Moonbeam’s REVM execution layer allows Solidity contracts to run with minimal friction, letting us retain Hardhat tooling and deliver fast. Future roadmap items (cross-chain rewards, pallet integrations) will leverage Polkadot’s XCM and PVM ecosystems.

---

## 2. Architecture Overview

| Component | Description | Key Tech |
| --- | --- | --- |
| **Smart Contracts** (`packages/contracts`) | `WorbooRegistry`, `WorbooToken`, `WorbooShop` written in Solidity 0.8.24, tested with Hardhat + ethers v6. | Hardhat, Ignition, OpenZeppelin |
| **Frontend** (`react-wordle`) | React SPA with RainbowKit/wagmi for wallet login, Moonbase chain config, shop UI, and player dashboards. | React, RainbowKit, Tailwind CSS |
| **Off-chain (optional)** | Halo2-based proof workers (original ZK prototype). Not required for MVP but maintained for future iterations. | Rust, wasm-pack |

See [`mvp-architecture.md`](mvp-architecture.md) for detailed data flow diagrams.

---

## 3. End-to-End Walkthrough

1. **Clone & install**
   ```bash
   git clone https://github.com/<your-fork>/worboo.git
   cd 03-Worboo
   npm install --ignore-scripts
   # or install each workspace individually:
   npm install --prefix packages/contracts
   npm install --prefix packages/relayer
   npm install --ignore-scripts --prefix react-wordle
   ```
> Set `HUSKY=0` (or `HUSKY_SKIP_INSTALL=1`) if Husky complains about missing `.git` during installation.
2. **Configure contracts**
   - Fill `packages/contracts/.env` with `PRIVATE_KEY` and Moonbase RPC URL.
   - Compile and test: `npm run compile && npm run test` (from `packages/contracts`).
3. **Deploy to Moonbase Alpha**
   ```bash
   npx hardhat ignition deploy ./ignition/modules/WorbooModule.ts --network moonbase
   npm run export:addresses
   ```
   Record the contract addresses output by Ignition (the helper prints `.env`-ready lines).
4. **Configure frontend**
   - Update `react-wordle/.env` with the deployed `WorbooRegistry`, `WorbooToken`, `WorbooShop` addresses.
   - Start the UI: `npm start` (from `react-wordle`).
   - Connect a wallet (RainbowKit prompts Moonbase Alpha), click **Register**, solve the Wordle challenge, and use WBOO rewards in the shop.
5. **Start the reward relayer (optional)**
   ```bash
   npx hardhat run --network moonbase scripts/grantGameMaster.ts <tokenAddress> <relayerWallet>
   cd ../relayer
   cp config/relayer.config.json.example config/relayer.config.json
   # edit config/relayer.config.json with RPC URL, private key, registry/token addresses
   npm run start
   ```
   The relayer listens for `GameRecorded` events, persists processed logs to `.cache/processed-events.jsonl`, and mints WBOO for victorious players. JSON config is now the default; environment variables are still honoured for quick overrides (`RELAYER_CONFIG_PATH` lets you point to configs outside the repo). Set `healthCorsOrigin` (or `RELAYER_HEALTH_CORS_ORIGIN`) to match your dashboard origin, or `"disable"` to omit the header entirely. The frontend navbar shows pending/success banners so judges can see rewards landing in real time. Run `npm run status` inside `packages/relayer` to print a JSON health snapshot (queue depth, last mint, processed cache size) or hit `http://localhost:8787/healthz`.
6. **Testing scripts**
   - Contracts: `packages/contracts/npm run test`.
   - Monorepo lint: `npm run lint`.
   - Contracts (coverage/gas): `packages/contracts/npm run coverage` and `npm run gas` (set `REPORT_GAS=true`).
   - Targeted frontend tests: `react-wordle/npm test -- --watch=false --testPathPattern="(shop|contracts|words|RelayerStatusBanner|useRelayerNotifications)"`.
   - Relayer: `packages/relayer/npm test`.
   - Relayer health snapshot: `packages/relayer/npm run status` (or `curl http://localhost:8787/healthz`).

> **Note:** Legacy CRA tests referencing ZK worker code still require a jest upgrade; they are excluded from judging instructions.

---

## 4. Judge’s Checklist

- [ ] Wallet connects on Moonbase Alpha (RainbowKit modal).
- [ ] Registration transaction mined (`PlayerRegistered` event emitted).
- [ ] Winning a Wordle round triggers `recordGame` and updates streak counters.
- [ ] WBOO balance reflects earned rewards (displayed in navbar shop view).
- [ ] Purchasing a cosmetic/chest calls `purchase` and deducts WBOO.
- [ ] Documentation is clear; README + this dossier explain deployment and testing.
- [ ] (Optional) Relayer running — mint transactions observed after `GameRecorded` events.

Optional extras (stretch goals):
- [ ] Leaderboard / relayer integration (planned but not in MVP).
- [ ] ZK proof submission (present in repo, disabled by default).

---

## 5. Technical Deep Dive

### WorbooRegistry.sol
- Guards duplicate registration (`AlreadyRegistered`) and day-ordering (`DayNotStrictlyIncreasing`).
- Normalises streak resets when a day is skipped or a loss occurs.
- Emits structured `GameRecorded` events for indexers or off-chain relayers.

### WorbooToken.sol
- Minimal ERC-20 with `GAME_MASTER_ROLE`. Shop contract holds mint+burn rights.
- Tests enforce mint/burn permissions and balance safety.

### WorbooShop.sol
- ERC-1155 with `setItemConfig` controlled by `ITEM_MANAGER_ROLE`.
- Purchases burn WBOO via WorbooToken (`paymentToken.spend`) before minting collectibles.
- Frontend queries inventory via `balanceOfBatch`.

---

## 6. Documentation & Resources

- [`README.md`](../README.md): root developer guide.
- [`polkadot-target.md`](polkadot-target.md): rationale for choosing Moonbase/Moonbeam.
- [`implementation-plan.md`](implementation-plan.md): milestone tracker and future tasks.
- [`deployment-guide.md`](deployment-guide.md): step-by-step setup for contracts, frontend, and relayer.
- [`deployment-guide.zh-CN.md`](deployment-guide.zh-CN.md): 中文部署指南，适用于本地演示与黑客松提交。
- [`demo-playbook.md`](demo-playbook.md): live presentation script.
- [`roadmap-next.md`](roadmap-next.md): post-hackathon backlog.
- [`handoff.md`](handoff.md): current gaps and guidance for future contributors.
- [`testing-matrix.md`](testing-matrix.md): commands, coverage targets, and CI TODOs.
- [`packages/indexer/README.md`](../packages/indexer/README.md): placeholder instructions for future Subsquid/SubQuery work.
- [`Migrating Ethereum DApps to Polkadot – Technical Roadmap & Strategy.pdf`](Migrating%20Ethereum%20DApps%20to%20Polkadot%20–%20Technical%20Roadmap%20%26%20Strategy.pdf): background research.

---

## 7. Roadmap Beyond the Hackathon

1. **Auto-mint relayer**: verify game submissions off-chain, mint WBOO without user triggering additional transactions.
2. **Proof-of-play**: reintroduce the Halo2 proof pipeline, persisting proofs on IPFS and anchoring hashes on-chain.
3. **Cross-chain incentives**: experiment with XCM to reward learners on sibling parachains.
4. **Governance**: transition shop/Treasury management to a DAO once seasons accumulate value.

---

Ready to jam on Polkadot 🌐🔤🟩? Ping the maintainers or open a GitHub issue if you need help reproducing results during judging.











