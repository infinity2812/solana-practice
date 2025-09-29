# Anchor Program Review (zkcash)

## What it does
- Maintains a Poseidon-hash Sparse Merkle Tree of note commitments (height 26, 2^26 capacity).
- Enforces privacy spends via Groth16 proofs on BN254 using on-chain precompiles.
- Supports SOL-only deposits/withdrawals; fees routed to a configurable recipient.
- Prevents double-spends with nullifier PDAs and appends two new output commitments per transact.

## Key instructions
- initialize
  - Creates PDAs: `merkle_tree`, `tree_token`, `global_config`.
  - Sets admin (mainnet builds), deposit limit (default 1000 SOL), fee settings (deposit 0 bps, withdraw 25 bps, 5% tolerance), root history size 100.
  - Initializes SMT zero values and root.
- update_deposit_limit(new_limit)
  - Authority-gated; updates lamport deposit cap.
- update_global_config({deposit_fee_rate?, withdrawal_fee_rate?, fee_error_margin?})
  - Authority-gated; validates each in [0,10000] bps.
- transact(proof, ext_data, encrypted_output1, encrypted_output2)
  - Validations:
    - Root must be known (rolling history).
    - Recipient and fee recipient accounts must match `ext_data` to avoid frontrun swaps.
    - `ext_data_hash` must match recomputed hash that includes encrypted outputs.
    - Public amount relation checked with BN254 field arithmetic.
    - SOL-only mint enforcement.
    - Fee validated against global config with tolerance; deposit limit enforced for positive `ext_amount`.
  - Fund flows:
    - Deposit: system transfer from signer → `tree_token`.
    - Withdraw: lamport balance mutation from `tree_token` → recipient; fee sent to fee recipient. Rent-exempt minimum enforced.
  - State updates:
    - Create `nullifier0/1` PDAs (prevents reuse via `init` semantics).
    - Create `commitment0/1` accounts storing ciphertexts and indices.
    - Append two leaves and update root, history, next index.

## Accounts & PDAs
- `MerkleTreeAccount` (zero_copy): authority, next_index, subtrees[], root, root_history[100], root_index, limits, height, bumps.
- `TreeTokenAccount`: SOL vault authority + bump.
- `GlobalConfig`: fee basis points and tolerance.
- `NullifierAccount`: existence-only with bump; indicates spent input.
- `CommitmentAccount`: commitment bytes, encrypted output, index, bump.

## ZK verification
- Public inputs (big-endian): root, public_amount, ext_data_hash, input_nullifier[2], output_commitment[2].
- Uses `Groth16Verifier` over BN254 precompiles; `proof_a` is reserialized to negated form with endianness fix.

## Safety considerations
- Admin-only on mainnet builds via compile-time config; no admin in local/test.
- Deposit limit guards vault concentration; withdrawals unrestricted (subject to vault balance+rents).
- Rent checks ensure vault remains rent-exempt after outflows.
- Arithmetic checked with `require!` paths; overflow guarded.
- Encrypted outputs passed separately to fit instruction size; included in `ext_data_hash` to bind ciphertexts to proof.
- Merkle tree capacity guarded; returns `MerkleTreeFull` when exhausted.

## Potential risks / notes
- SOL-only; SPL support would need mint-specific paths and token program CPI.
- Vault balance mutation relies on lamport transfers by PDA; ensure no reentrancy via Anchor constraints (nullifier creation first) — currently documented as non-reentrant.
- Root history window 100; clients must spend against recent roots or include reorg-aware syncing.
- Fee recipient is supplied by `ext_data`; ensure indexer or relayer policies validate against expected recipient set if needed operationally.
