# Worboo Feature Roadmap (Post-MVP)

## Phase 1 – Operational Hardening
- **Auto mint relayer**: persistence, retry/backoff, reward banner, CLI health snapshot, Dockerfile, and PM2 profile shipped; next add structured log aggregation and cache rotation.
- **Indexer integration**: placeholder scaffold lives in `packages/indexer/`; next bootstrap Subsquid/SubQuery project and expose leaderboard APIs with streak and completion stats.
- **UI telemetry**: instrument React Query cache misses, wallet connection failures, and purchase errors for better observability during mainnet launch.

## Phase 2 – Trustless Proof-of-Play
- Reintroduce the Halo2 WASM proof flow by shipping an off-chain worker that validates proofs and writes IPFS hashes on-chain.
- Explore verifying succinct proofs inside an ink! contract once target parachain exposes the required elliptic-curve precompiles.
- Allow players to replay previous days by sharing proof hashes; use the shop to gate premium challenges.

## Phase 3 – Community & Monetisation
- Launch seasonal reward pools with DAO-governed parameters (using OpenZeppelin Governor or a Substrate pallet).
- Add cross-chain quests using XCM to reward participation on sibling parachains (Astar, Bifrost).
- Curate third-party cosmetic drops by granting limited `ITEM_MANAGER_ROLE` permissions to partners.

## Phase 4 – Technical Stretch Goals
- Implement a Moonbeam <-> EVM mainnet bridge for WBOO liquidity.
- Experiment with PVM contracts for high-performance word generation.
- Integrate AI-guided hint systems powered by off-chain inference with on-chain entitlement checks.

Each phase builds on the current TypeScript + Solidity base without sacrificing the hackathon deliverables already in place.



