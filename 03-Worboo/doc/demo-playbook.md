# Worboo Demo Playbook

This guide is written for live judging sessions. Follow it to demonstrate the Worboo MVP in under 5 minutes.

---

## 1. Pre-demo Checklist

- [ ] Have a wallet loaded with DEV tokens on **Moonbase Alpha** (use https://faucet.moonbeam.network/).
- [ ] Deploy the contracts and export addresses:
  ```bash
  cd packages/contracts
  npm run deploy:moonbase
  npm run export:addresses > ../../react-wordle/.env.local
  ```
  (Alternatively, copy the output into `react-wordle/.env`.)
- [ ] Check relayer health: `cd packages/relayer && npm run status` (expect `status: "idle"`).
- [ ] Run `npm run test` inside `packages/contracts` to show the TDD workflow.
- [ ] Start the frontend with `npm start` inside `react-wordle`.

---

## 2. Demo Flow (Approx. 4 minutes)

### Step 1 – Introduce the Experience (30s)
- Explain that Worboo is a daily word-learning challenge with on-chain incentives.
- Highlight that the repo contains both the React front-end and the Solidity smart contracts deployed on Moonbase Alpha.

### Step 2 – Connect Wallet & Register (45s)
- Open the running React app.
- Click **Connect Wallet** (RainbowKit) and choose MetaMask (or other Moonbase-ready wallet).
- After connecting, the yellow banner will prompt on-chain registration. Click **Register**, confirm the transaction, and point out the emitted `PlayerRegistered` event in the wallet explorer.

### Step 3 – Play a Puzzle (60s)
- Enter a few guesses in the Wordle interface.
- Upon success (or simulated success), mention how `recordGame` logs the play, updates streak counts, and how rewards will be minted via the relayer or manual call.
- Optional: show the Hardhat console call for `recordGame` using `hardhat console --network moonbase`.

### Step 4 – Claim Rewards & Shop (60s)
- Highlight the **WBOO Balance** indicator in the shop modal (navbar → bag icon).
- Showcase the new relayer banner in the navbar (“Relayer minted +10 WBOO”) and call out the pending-state warning if the relayer is offline.
- Optionally show `npm run status` or `curl http://localhost:8787/healthz` so judges see the queue depth / heartbeat JSON.
- Demonstrate purchasing an item that costs WBOO (e.g., `Classic Worboo`). The UI will trigger the `purchase` contract call, burn tokens, and add the ERC-1155 item to inventory.
- Equip the newly acquired cosmetic to show the state change.

### Step 5 – Wrap-up (45s)
- Mention the documentation assets (README, Polkadot dossier, architecture notes).
- Outline next milestones: automated reward relayer, ZK proof reintegration, cross-chain engagement.

---

## 3. Demo Recording Checklist

1. **Verify code health**
   - Run `npm run lint` (root) and `npm test` inside `packages/contracts` plus `packages/relayer`.
   - Ensure the relayer config has sensible `cacheMaxEntries` and, if required, `RELAYER_LOG_HTTP_ENDPOINT` for external log shipping.
2. **Spin up services**
   - Start the relayer (`npm run start`) and confirm `npm run status` reports `status: "idle"` with queue depth 0.
   - Launch the frontend (`npm start` in `react-wordle`) and clear cached data before recording.
3. **Capture flow**
   - Wallet connect → register → solve puzzle → observe relayer banner (`Relayer minted +X WBOO`) → purchase cosmetic.
   - While recording, briefly show `/healthz` JSON and mention Docker/PM2 deployment options.
4. **Closing narration**
   - Point to documentation (`README.md`, deployment guide, handoff) and mention the indexer scaffold (`packages/indexer/README.md`) for roadmap continuity.

Save the raw screen capture plus a trimmed version for final submission.

---

## 4. Troubleshooting Tips

- **No DEV balance**: revisit the Moonbeam faucet. Ensure the wallet network is Moonbase Alpha (chainId 1287).
- **Registration button stuck**: refresh after the transaction confirms; the UI refetches profile data via React Query.
- **Contract addresses incorrect**: rerun `npm run export:addresses` and copy the output back into the frontend `.env`.
- **Tests complaining about `import.meta`**: use `npm test -- --watch=false --testPathPattern=\"(shop|contracts|words).test.ts\"` for the curated suite.

---

## 5. Follow-up Talking Points

- The architecture is deliberately modular: WorbooToken and WorbooShop can be extended for future seasons, cross-chain rewards, and DAO governance.
- Halo2 WASM workers remain in the repo for future “proof-of-play” upgrades once parachain verifier support matures.
- Documentation is ready for investors/mentors—point them to `README.md` and `doc/README - polkadot.md`.

Happy demoing! 🟩🟨⬛
