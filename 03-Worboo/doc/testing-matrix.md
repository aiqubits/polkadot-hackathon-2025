# Worboo Testing Matrix & Coverage Checklist

This document tracks how we exercise Worboo across layers and what still needs attention for full coverage before the Polkadot hackathon submission freeze.

---

## 1. Commands by Layer

| Layer | Command | Notes |
| --- | --- | --- |
| Monorepo lint | `npm run lint` | Shared ESLint config across the contracts and relayer packages. |
| Smart contracts | `npm run test` (inside `packages/contracts`) | Hardhat network unit tests (wagmi-style assertions). |
| Smart contracts – coverage | `npm run coverage` (inside `packages/contracts`) | Runs `npx hardhat coverage` to produce `coverage.json`. |
| Smart contracts – gas snapshot | `npm run gas` (inside `packages/contracts`) | Executes `npx hardhat test --gas` and writes report to console. |
| Relayer service | `npm test` (inside `packages/relayer`) | Vitest suite covering config parsing, persistence, retry handler, HTTP health server, and Hardhat integration replay. |
| Relayer status snapshot | `npm run status` (inside `packages/relayer`) | Emits JSON health info (queue depth, processed cache bytes). |
| Frontend | `npm test -- --watch=false --testPathPattern="(contracts|shop|words|RelayerStatusBanner|useRelayerNotifications)"` | Curated CRA/Jest run that skips legacy ZK suites. |

> Reminder: CRA/Jest still struggles with `import.meta`; keep using the scoped `testPathPattern` command until the Vite migration (tracked on the roadmap).

---

## 2. Coverage & Gas Goals

- **Contracts**
  - ✅ Unit tests cover registry/token/shop behaviour.
  - 🔜 Run `npm run coverage` before every release; upload summary to hackathon submission.
  - 🔜 Capture gas output via `npm run gas` and document any concerning deltas in PR descriptions.
  - ℹ️ Latest run (2025-10-27): 97.22% statements / 80% branches; `recordGame` averages 45,301 gas (see `packages/contracts/coverage/index.html`).

- **Relayer**
  - ✅ Persistence, retry logic, HTTP health endpoint, and Hardhat integration replay covered by Vitest (`tests/integration.test.ts`).

- **Frontend**
  - ✅ New hook (`useRelayerNotifications`) and banner component have RTL tests.
  - 🔜 Broaden coverage for shop purchase path once CRA → Vite migration is complete.

---

## 3. CI / Automation TODOs

1. Wire contract coverage + gas jobs into GitHub Actions (`packages/contracts`).
2. Add relayer `npm test` and targeted frontend tests to the workflow.
3. Publish coverage snapshots (LCOV) for judges; include summary in `doc/demo-playbook.md`.

---

## 4. Manual Verification Flow (Pre-demo)

1. `npm run lint` — confirm shared ESLint rules pass with the latest changes.
2. `npm run coverage` (contracts) — ensure branch coverage ≥ 90%.
3. `npm run gas` — compare against prior snapshot, especially `recordGame` and `purchase`.
4. `npm test` (relayer) — check persistence tests.
5. `npm run status` (relayer) — confirm `status: "idle"` and queue depth 0 before demos (or hit `/healthz`).
6. Frontend targeted tests (command above).
7. Manual smoke on Moonbase: register, record win, confirm navbar banner displays the minted WBOO.

Log results in `doc/handoff.md` after each rehearsal so future contributors can see when the last full test sweep occurred.





