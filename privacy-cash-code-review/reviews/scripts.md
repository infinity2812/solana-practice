# Scripts Review

## Purpose
Operational tooling to build circuits, run trusted setup, initialize/deploy program, manage ALT, and perform protocol ops.

## Key scripts
- buildCircuit_prod_solana.sh — Compile Circom circuits and wasm/zkey artifacts.
- trusted_setup_ceremony.sh — Coordinator/participant ceremony flow.
- sample_proof_generator.ts — Generate example deposit and withdraw proofs.
- get_verification_keys.ts — Export/import verification keys.
- initialize_via_squad.ts, initialize_program_mainnet.ts — Program initialization on mainnet.
- create_alt.ts — Address Lookup Table creation for large txs.
- deposit_mainnet_with_relayer.ts, withdraw_mainnet_with_relayer.ts — Relayer-assisted flows.
- fetch_user_utxos.ts, decrypt_specific_utxo.ts — Client UTXO discovery/decryption.
- check_fees_balance.ts, check_deposit_limit.ts, check_tree_state.ts — Ops checks.

## Encryption
- Deterministic key derivation from wallet signature; AES-256-CBC for UTXO data. Tests under `scripts/__tests__/`.

## Notes
- Never commit real keypairs. Use `.env`/secure stores.
- Re-generate verifying keys if zkey changes; keep `artifacts/circuits/` consistent with on-chain constants.
