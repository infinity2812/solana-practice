# Security Considerations

## Strengths
- Nullifier PDAs created with `init` prevent double-spend at runtime (account pre-existence fails the tx).
- Known-root check against circular history avoids invalid state spends.
- End-to-end binding of ciphertexts in `ext_data_hash` mitigates ciphertext swapping/front-running.
- Fee validation with tolerance prevents fee underpayment and edge rounding issues.
- Arithmetic guarded with checked ops and `require!` paths.

## Risks / attention points
- SOL-only design; SPL tokens would need token program CPI with authority checks and potential rent edge cases.
- Root history length 100: clients must spend against relatively recent roots; long reorg/out-of-date clients may fail.
- Fee recipient and recipient come from proof/ext data; operational policy may want allowlists or additional off-chain validation.
- Vault uses lamport balance mutation; ensure balance always >= rent after outflows.
- Indexer CORS currently `*`; restrict in production.
- Relayer key management: ensure `relayer_fee_payer_keypair.json` is secured and rotated.

## Operational recommendations
- Enable domain-restricted CORS and rate limiting on indexer.
- Monitor `tree_token` lamports and deposit limit; alert on low buffer.
- Regularly verify on-chain program hash matches verifiable build.
- Run ceremony with multiple independent contributors; publish transcripts.
- Maintain reproducible builds; pin toolchain versions.
