# Worboo Handoff Notes (2025-10-27)

## Current Snapshot

- **Contracts**: `WorbooRegistry`, `WorbooToken`, `WorbooShop` deployed via Ignition module with roles wired (`packages/contracts/ignition/modules/WorbooModule.ts`).
- **Frontend**: React app connects to Moonbase Alpha, fetches balances via `useWorbooPlayer`, and triggers purchases through the deployed contracts.
- **Relayer**: `packages/relayer` package listens for `GameRecorded` events and mints WBOO rewards. Config validated by unit tests.
- **Ops**: Dockerfile and PM2 ecosystem config added under packages/relayer/ for production deployments.
- **Docs**: README, deployment guide, hackathon dossier, demo playbook, and roadmap updated for Moonbase + relayer workflow.

## Gaps Before “Full Flow” Demo

1. **Relayer observability** – navbar banner surfaces mint success/pending states and the `npm run status` snapshot provides queue depth, but we still need richer metrics (continuous heartbeat, historical trend) for ops dashboards.
2. **No persistence/indexing** – inventory relies on real-time contract reads. A Subsquid/SubQuery indexer would enable leaderboards and history.
3. **ZK proof integration** – the original Halo2 pipeline is still offline; bringing it back with IPFS + on-chain attestation is a v2 goal.
4. **Security hardening** – contract roles are minimal; add timelocks or multisig before production deployment.
5. **Testing** – CRA’s legacy tests are partially disabled; migrating to Vite/Vitest would simplify the future suite.

## Focus for Next Contributors

- **Short term**: wire the new `/healthz` endpoint into external dashboards (Grafana/Prometheus), add log rotation/retention, and document recovery workflows around the persisted cache.
- **Medium term**: build the reward relayer into a proper service (Dockerfile, PM2/forever scripts), integrate telemetry, and wire an indexer for leaderboards.
- **Long term**: merge ZK proof validation, experiment with PVM/ink! contracts, and design governance/economics for community seasons.

## Reference Commands

| Task | Command |
| --- | --- |
| Monorepo lint | `npm run lint` |
| Deploy contracts | `npx hardhat ignition deploy ./ignition/modules/WorbooModule.ts --network moonbase` |
| Export addresses | `npm run export:addresses` (packages/contracts) |
| Grant relayer role | `npx hardhat run --network moonbase scripts/grantGameMaster.ts <token> <relayer>` |
| Run relayer | `npm run start` (packages/relayer) |
| Docker build | docker build -f packages/relayer/Dockerfile -t worboo-relayer . |
| Docker run | docker run --rm -p 8787:8787 -v D:\zWenbo\AI\Hackthon\polkadot-hackathon-2025\03-Worboo/packages/relayer/config:/app/packages/relayer/config -e RELAYER_CONFIG_PATH=/app/packages/relayer/config/relayer.config.json worboo-relayer |
| PM2 (optional) | pm2 start packages/relayer/ecosystem.config.cjs |
| Frontend tests | `npm test -- --watch=false --testPathPattern="(shop|contracts|words)"` |

## Contacts / Notes

- Keep private keys in `.env`/config files only; never commit.
- DEV faucet: https://faucet.moonbeam.network/
- Block explorer: https://moonbase.moonscan.io/
- For production: consider swapping to Moonbeam RPCs and revisiting gas estimates (Moonbase uses 1 gwei baseline).

Continue iterating, and log major decisions back into this document or the roadmap so future teammates stay aligned. Good luck! 🟩🟨⬛




