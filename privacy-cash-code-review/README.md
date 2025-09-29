# Solana Privacy Protocol

Transfer SOL privately. Private SPL tokens transfer and private swap will soon follow.

The program is fully audited by Accretion and HashCloak (at commit 188f0cd475397c4039bf126f7962282170395aad), and verified onchain (with hash 855d23171376203ff7947cf4b237a98eff47cb59fdf2d3c5a659738066884e3a).

## Overview

This project implements a privacy protocol on Solana that allows users to:

1. **Shield SOL**: Deposit SOL into a privacy pool, generating a commitment that is added to a Merkle tree.
2. **Withdraw SOL**: Withdraw SOL from the privacy pool to any recipient address using zero-knowledge proofs.

The implementation uses zero-knowledge proofs to ensure that withdrawals cannot be linked to deposits, providing privacy for Solana transactions.

## Project Structure

- **program/**: Solana on-chain program (smart contract)
  - **src/**: Rust source code for the program
  - **test/**: Tests
  - **Cargo.toml**: Rust dependencies and configuration

## Prerequisites

- Solana CLI 2.1.18 or later
- Rust 1.79.0 or compatible version
- Node.js 16 or later
- npm or yarn
- Circom v2.2.2 https://docs.circom.io/getting-started/installation/#installing-dependencies

## Installation

### ZK Circuits
1. Navigate to the script directory:
   ```bash
   cd scripts
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Generate circuits:
   ```bash
   ./buildCircuit_prod_solana.sh 2
   ```

### Trusted Setup Ceremony (PRODUCTION REQUIRED)
   ```bash
   # Coordinator starts
   ./trusted_setup_ceremony.sh 2 setup
   
   # Each participant contributes (on separate machines)
   ./trusted_setup_ceremony.sh 2 contribute 1
   ./trusted_setup_ceremony.sh 2 contribute 2  
   ./trusted_setup_ceremony.sh 2 contribute 3
   ./trusted_setup_ceremony.sh 2 contribute 4
   
   # Coordinator finalizes
   ./trusted_setup_ceremony.sh 2 finalize
   ```

The ceremony ensures that as long as one participant deletes their secrets, the system remains secure.
4. Generate verifying keys
   ```bash
   cd artifacts/circuits
   npx snarkjs zkey export verificationkey transaction2.zkey verifyingkey2.json
   ```
### ZK Proofs
1. Navigate to the script directory:
   ```bash
   cd scripts
   ```
2. Generate a sample proof (with a first deposit proof, and another withdrawal proof):
   ```bash
   ts-node sample_proof_generator.ts
   ```

### Anchor Program
1. Navigate to the program directory:
   ```bash
   cd anchor
   ```

2. Build the program:
   ```bash
   anchor build
   ```

3. Run unit test:
   ```bash
   cargo test
   ```

4. Run integration test:
   ```bash
   anchor test -- --features localnet
   ```

5. Deploy the program to devnet:
   ```bash
   anchor build
   rm target/deploy/zkcash-keypair.json
   cp zkcash-keypair.json target/deploy/zkcash-keypair.json
   anchor deploy --provider.cluster devnet

   or
   solana program deploy target/deploy/zkcash.so --program-id zkcash-keypair.json --upgrade-authority ./deploy-keypair.json
   ```

6. Deploy to mainnet:
   ```bash
   anchor build --verifiable

   rm target/deploy/zkcash-keypair.json
   cp zkcash-keypair.json target/deploy/zkcash-keypair.json 

   anchor deploy --verifiable --provider.cluster mainnet
   ```

7. Transfer the authority to multisig wallet
   ```bash
   solana program set-upgrade-authority 9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD \
   --new-upgrade-authority AWexibGxNFKTa1b5R5MN4PJr9HWnWRwf8EW9g8cLx3dM \
   --upgrade-authority deploy-keypair.json \
   --skip-new-upgrade-authority-signer-check \
   --url mainnet-beta
   ```

8. Initialize the program on mainnet
   ```bash
   ts-node initialize_via_squad.ts
   ```

9. Create new address lookup table:
   ```bash
   ts-node create_alt.ts
   ```

### Indexer
1. Navigate to the indexer directory:
   ```bash
   cd indexer
   ```

2. Install the dependencies:
   ```bash
   npm run
   ```

3. Running tests:
   ```bash
   npm test
   ```

4. Start the indexer:
   ```bash
   tsc && npm start
   ```

# Scripts
1.  Navigate to the indexer directory:
   ```bash
   cd scripts
   ```

2. Get your own decrypted utxos
   ```bash
   ts-node fetch_user_utxos.ts
   ```

3. Get fees and protocol balances
   ```bash
   ts-node check_fees_balance.ts
   ```

4. Withdraw fees
   ```bash
   ts-node withdraw_fees.ts <recipient_address> [amount_in_SOL]
   ```

# Program verification
1. Dump onchain program hash
   ```bash
   solana program dump 9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD current_program.so --url mainnet-beta && sha256sum current_program.so
   >> 855d23171376203ff7947cf4b237a98eff47cb59fdf2d3c5a659738066884e3a  current_program.so
   ```
2. Build a verifiable anchor program based on github commit
   ```bash
   git checkout 188f0cd475397c4039bf126f7962282170395aad
   cd anchor
   anchor build --verifiable
   sha256sum target/verifiable/zkcash.so
   >> 855d23171376203ff7947cf4b237a98eff47cb59fdf2d3c5a659738066884e3a  target/verifiable/zkcash.so
   ```

3. You'll find the hash of onchain program exactly matches the zkcash program generated from commit 188f0cd475397c4039bf126f7962282170395aad, which is the commit audited by Accretion and HashCloak.