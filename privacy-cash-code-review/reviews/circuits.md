# Circuits Review

## What exists
- Circom sources: `transaction2.circom` (+ legacy `transaction.circom`, `merkleProof.circom`, `keypair.circom`).
- Artifacts (snarkjs): `transaction2.r1cs`, `transaction2.zkey`, `verifyingkey2.json`, `transaction2.wasm`, JS witness gen helpers.
- Trusted setup ceremony scripts for multi-contributor powers of tau / zkey contributions.

## Public inputs binding (as used on-chain)
- `[root, public_amount, ext_data_hash, nullifier0, nullifier1, out_commitment0, out_commitment1]` big-endian 32-byte words.
- `ext_data_hash` includes ciphertexts `encrypted_output1/2`, fee, recipients, mint, tying off-chain ciphertexts to the proof.

## Workflow
- Build: `scripts/buildCircuit_prod_solana.sh 2` → compiles circuits and artifacts.
- Trusted setup (prod): `trusted_setup_ceremony.sh 2 [setup|contribute N|finalize]`.
- Export verification key JSON: `snarkjs zkey export verificationkey transaction2.zkey verifyingkey2.json`.

## Notes
- BN254 curve (Solana precompiles align with alt_bn128 ops).
- Circuit must match on-chain endianness and public input order; mismatches break verification.
- Updating circuits requires updating on-chain `VERIFYING_KEY` constants and redeploying with verifiable build.
