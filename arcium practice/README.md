## Arcium Practice

This folder contains small, focused exercises that mirror common Arcium-style building blocks using Solana tooling:

- Basic `@solana/web3.js` connectivity and airdrops
- SPL Token mint/create/transfer flows
- Foundations you can reuse in larger Arcium-integrated projects

### Prerequisites

- Node.js 18+
- A Solana RPC. Default is Devnet.

### Setup

1) Install dependencies:

```bash
npm install
```

2) Copy the environment template and fill values:

```bash
cp .env.example .env
```

Required variables:

- `RPC_URL` – e.g. `https://api.devnet.solana.com`
- `PRIVATE_KEY` – JSON array for your payer keypair, e.g. `[1,2,3,...]`

### Scripts

- `npm run basic:web3` – Connects to Solana, airdrops 1 SOL to a fresh keypair, prints balance
- `npm run token:create` – Creates a new SPL token mint (9 decimals) owned by `PRIVATE_KEY`
- `npm run token:mint-transfer` – Mints tokens to the owner ATA and transfers to a recipient

### Notes

- These exercises target Devnet for simplicity. If you run a local validator, set `RPC_URL` accordingly.
- The code is intentionally minimal and verbose to make each step explicit.


