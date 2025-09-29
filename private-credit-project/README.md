# Arcium Private Credit

**Private Credit on-chain, privately** - A permissioned, auditable on-chain infrastructure that tokenizes private credit while keeping borrower identities, loan terms and positions confidential using Arcium MXEs for encrypted computation and Squads multisig for custody, settlement and governance.

## 🚀 Status: Integration Complete

✅ **Arcium MXE Integration**: Full encryption with X25519 + ChaCha20-Poly1305  
✅ **Squads v4 Integration**: Complete multisig transaction lifecycle management  
✅ **TypeScript SDK**: Production-ready client implementations  
✅ **Orchestrator Service**: Real API coordination between components  
✅ **Anchor Programs**: Solana smart contracts for pool and loan management  
✅ **React UI**: Institutional interface for all operations  
✅ **MXE Circuits**: Loan origination, covenant monitoring, and NAV accounting  
✅ **Squads Configuration**: Institutional-grade governance and custody setup  
✅ **Compliance Framework**: KYC/KYB, AML screening, and audit capabilities  
✅ **Integration Examples**: Complete end-to-end demonstration

## Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run the integration example
npm run example:integration

# Start the orchestrator service
npm run orchestrator:start

# Start the React client
npm run client:dev
```

## Architecture Overview

This project implements a comprehensive private credit platform with the following key components:

- **Arcium MXE**: Encrypted computation for loan origination, servicing, and NAV accounting
- **Solana Programs**: On-chain programs for pool management, loan commitments, and attestation verification
- **Squads Multisig**: Institutional custody and governance
- **Orchestrator**: Coordination service between MXE and on-chain components
- **Client SDK**: TypeScript SDK for institutional clients
- **React UI**: Institutional interface for deposits, applications, and audit requests

## Project Structure

```
arcium-private-credit/
├── anchor/                 # Solana Anchor programs
│   ├── programs/
│   │   └── private-credit/
│   │       ├── src/
│   │       │   ├── lib.rs
│   │       │   ├── instructions/
│   │       │   │   ├── pool.rs
│   │       │   │   ├── loan.rs
│   │       │   │   ├── attestation.rs
│   │       │   │   └── receipt.rs
│   │       │   ├── state/
│   │       │   │   ├── pool.rs
│   │       │   │   ├── loan.rs
│   │       │   │   └── attestation.rs
│   │       │   └── errors.rs
│   │       └── Cargo.toml
│   ├── tests/
│   └── Anchor.toml
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── utils/
│   └── package.json
├── orchestrator/           # Backend coordination service
│   ├── src/
│   │   ├── services/
│   │   │   ├── mxe.ts
│   │   │   ├── squads.ts
│   │   │   └── solana.ts
│   │   ├── types/
│   │   └── index.ts
│   └── package.json
├── sdk/                    # TypeScript SDK
│   ├── src/
│   │   ├── client.ts
│   │   ├── types.ts
│   │   └── utils.ts
│   └── package.json
└── docs/                   # Documentation
    ├── architecture.md
    ├── technical.md
    └── api.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- Rust 1.70+
- Solana CLI 1.16+
- Anchor CLI 0.28+

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd arcium-private-credit
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Development

1. Start the development environment:
```bash
npm run dev
```

2. Deploy Anchor programs:
```bash
npm run deploy
```

3. Run tests:
```bash
npm run test
```

## Key Features

### Core Components

1. **Pool Management**: Create and manage private credit pools with configurable parameters
2. **Loan Origination**: Encrypted loan application and approval process
3. **NAV Accounting**: Real-time net asset value calculation and attestation
4. **Receipt Tokens**: Tokenized yield-bearing positions (pUSD)
5. **Audit & Disclosure**: Selective disclosure for regulatory compliance
6. **Multisig Governance**: Institutional controls and emergency procedures

### Security Features

- **Encrypted Computation**: All sensitive operations run in Arcium MXE
- **Threshold Attestations**: Cryptographic proofs of state transitions
- **Multisig Custody**: Institutional-grade fund custody
- **Selective Disclosure**: Auditor access with legal authorization
- **KYC/KYB Integration**: Mandatory identity verification

## Architecture

The system uses a hybrid on-chain/off-chain architecture:

- **On-chain**: Public commitments, token transfers, governance
- **Off-chain**: Encrypted computation, private state, attestations
- **MXE**: Private execution environment for sensitive operations
- **Squads**: Multisig treasury and governance

## Development Roadmap

- [x] Project initialization and structure
- [ ] Core Anchor programs
- [ ] Arcium MXE integration
- [ ] Squads multisig setup
- [ ] Orchestrator service
- [ ] Client SDK
- [ ] React UI
- [ ] Testing and deployment

## Contributing

Please read our contributing guidelines and code of conduct before submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Security

This is experimental software. Use at your own risk. For security concerns, please contact security@arcium.com.
