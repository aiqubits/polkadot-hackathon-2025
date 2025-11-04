# Repository Guidelines

## Project Structure & Module Organization
- `packages/contracts/` — Hardhat Solidity workspace with sources under `contracts/`, tests in `test/`, and Ignition modules in `ignition/`.
- `packages/relayer/` — TypeScript event listener, health server, and tests in `tests/`. Deployment assets live in `Dockerfile` and `ecosystem.config.cjs`.
- `react-wordle/` — CRA-based frontend (`src/`), with targeted tests in `src/hooks/__tests__/` and `src/components/**/__tests__`.
- `doc/` — Hackathon collateral: deployment guide, demo playbook, roadmap, and handoff notes.

## Build, Test, and Development Commands
- `npm run lint` (root) — ESLint sweep of contracts and relayer packages.
- `npm run test` (packages/contracts) — Hardhat unit tests + coverage-ready build.
- `npm test` (packages/relayer) — Vitest suite covering config, handler, server, and integration flow.
- `npm test -- --watch=false --testPathPattern="(shop|contracts|words|RelayerStatusBanner|useRelayerNotifications)"` (react-wordle) — Targeted frontend checks that avoid legacy CRA pitfalls.
- Deployment helpers: `docker build -f packages/relayer/Dockerfile …` or `pm2 start packages/relayer/ecosystem.config.cjs`.

## Coding Style & Naming Conventions
- Prettier (`.prettierrc.json`) governs formatting; run `npm run format` before large edits.
- TypeScript/JavaScript lint rules live in `.eslintrc.cjs`; warnings for unused vars, React hooks, and accessibility are disabled only where legacy code demands it—prefer resolving root causes.
- Adopt descriptive PascalCase for contracts, camelCase for functions/variables, and `Worboo*` prefixes for new on-chain artifacts.

## Testing Guidelines
- Contracts: Hardhat + chai; keep new specs under `packages/contracts/test/*.ts` and mirror filename to contract (e.g., `WorbooRegistry.ts`).
- Relayer: Vitest; integration tests spin up Hardhat locally, so keep them lean and deterministic.
- Frontend: React Testing Library; place hook/component tests beside implementation in `__tests__` folders.
- Aim to preserve current coverage (≥97% statements for contracts); update `doc/testing-matrix.md` with notable deltas.

## Commit & Pull Request Guidelines
- Use imperative, present-tense commit subjects (e.g., `Add relayer health CORS toggle`), grouping related changes per commit.
- PRs should summarize intent, note test commands executed, and link relevant hackathon tasks/issues. Include screenshots or terminal logs when UX/ops behaviour changes.

## Security & Configuration Tips
- Never commit `.env` or private keys; rely on JSON config (`packages/relayer/config/relayer.config.json`) plus `RELAYER_CONFIG_PATH`.
- Grant `GAME_MASTER_ROLE` only to automation wallets and rotate RPC keys after demos.
