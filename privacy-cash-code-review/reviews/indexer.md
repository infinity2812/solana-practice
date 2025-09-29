# Indexer Review

## Purpose
Expose Merkle tree data, encrypted outputs, and webhook-driven updates for clients/relayers via Koa API.

## API surface (koa)
- GET `/` — health/version with PROGRAM_ID.
- GET `/commitments` — list commitment IDs (from PDA cache).
- GET `/merkle/root` — current root + next index.
- GET `/merkle/proof/:commitment` — inclusion proof by commitment.
- GET `/merkle/proof/index/:index` — path elements by index.
- GET `/utxos` — all encrypted outputs.
- GET `/utxos/check/:encryptedOutput` — existence check.
- GET `/utxos/range?start&end` — paginated range with validation.
- POST `/zkcash/webhook/transaction` — webhook to reload commitments/utxos.
- POST `/deposit` — relay pre-signed deposit VersionedTransaction.
- POST `/withdraw` — build+submit withdraw tx with ALT, compute budget.
- GET `/relayer` — relayer info (fee payer pubkey).

## Services
- `commitment-tree-service` — In-memory Poseidon tree via `@lightprotocol/hasher.rs`. Adds/updates leaves, returns root/proofs.
- `pda-service` — PDA derivations, proof construction, state reload from chain.
- `deposit-service` — relays base64 VersionedTransaction (user-signed).
- `withdraw-service` — constructs VersionedTransaction with ALT and compute budget, signer is relayer.
- `user-uxtos-service` — encrypted outputs store and range queries.
- `wallet-screener-service` — screening integration hook (if enabled).

## Data flow
- Startup: load historical PDAs → build in-memory tree → schedule hourly refresh.
- Webhook: on tx update, reload commitments/utxos.
- Queries: serve proofs and ciphertexts from in-memory index for low latency.

## Ops notes
- Requires `.env` for RPC, PROGRAM_ID, ports, relayer key path.
- ALT must exist for withdraw path; ensure freshness.
- Enforce CORS allowlist in prod (currently `*`).
