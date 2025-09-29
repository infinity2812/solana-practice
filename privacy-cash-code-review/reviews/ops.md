# Operations Notes

## Build & Deploy (Program)
- Build local: `cd anchor && anchor build`
- Tests: `cargo test`, `anchor test -- --features localnet`
- Devnet deploy: copy program id JSON, `anchor deploy --provider.cluster devnet`
- Mainnet verifiable deploy: `anchor build --verifiable` then `anchor deploy --verifiable --provider.cluster mainnet`
- Transfer upgrade authority to multisig post-deploy.

## Initialization
- Run `scripts/initialize_via_squad.ts` on mainnet after deploy.
- Create ALT: `scripts/create_alt.ts` and roll into relayer flow.

## Indexer
- `cd indexer && npm i && tsc && npm start`
- Env: RPC endpoint, PROGRAM_ID, relayer key path, port.
- Webhook ingestion: POST `/zkcash/webhook/transaction`.

## Circuits & Proofs
- `cd scripts && npm i && ./buildCircuit_prod_solana.sh 2`
- Ceremony (prod): `./trusted_setup_ceremony.sh 2 ...`
- Export verifying key JSON; keep artifacts under `artifacts/circuits/` synced.
- Sample proof generation: `ts-node sample_proof_generator.ts`.

## Verification
- Dump on-chain program and compare sha256 with verifiable build at audited commit.

## Maintenance
- Rotate relayer keys; secure storage.
- Monitor fees vault and adjust `update_deposit_limit`/global config as needed.
- Schedule periodic PDA reload already configured hourly.
