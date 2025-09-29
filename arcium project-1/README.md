## Arcium Project-1

End-to-end sample that reuses the basics from the practice folder and organizes them into a small, cohesive flow. It stubs an `Arcium` service call to represent a privacy/authorization step before moving funds.

### What it does

1) Connects to Solana Devnet and ensures the payer has SOL
2) Creates an SPL token mint (9 decimals)
3) Mints tokens to a vault/owner ATA
4) Calls a stubbed `Arcium` computation to approve a transfer
5) Transfers tokens to a recipient

### Setup

1) Install dependencies:

```bash
npm install
```

2) Copy env and fill values:

```bash
cp .env.example .env
```

Required:

- `RPC_URL` – e.g. `https://api.devnet.solana.com`
- `PRIVATE_KEY` – JSON array for your payer keypair

### Run

```bash
npm start
```

### Notes

- The `Arcium` service is intentionally stubbed in `src/services/arcium.js`. Replace with a real integration when available.
- Keep secrets out of version control.


