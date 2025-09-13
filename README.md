# Solana Practice Projects

A collection of Solana development projects for learning and experimentation with SPL tokens, Token2022, and blockchain development.

## 📁 Project Structure

```
solana-practice/
├── solana/                 # Main Solana SPL Token project
├── project1/              # Basic Solana operations
├── litsvmproject/         # LiteSVM testing project
├── .cursor/               # Cursor IDE configuration
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Solana CLI (optional)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd solana-practice

# Install dependencies for each project
cd solana && npm install
cd ../project1 && npm install
cd ../litsvmproject && npm install
```

### Environment Setup
1. Copy environment files:
   ```bash
   cp solana/env.example solana/.env
   cp project1/env.example project1/.env
   cp litsvmproject/env.example litsvmproject/.env
   ```

2. Configure your environment variables in `.env` files

## 🏗️ Architecture

### Solana Project
- **Core**: SPL token creation, minting, and transfers
- **Examples**: Legacy and Token2022 implementations
- **Utilities**: Balance checking and account management

### Project1
- **Focus**: Basic Solana operations and wallet management
- **Components**: Core utilities, token creation, minting, transfers

### LiteSVM Project
- **Purpose**: Testing Solana programs with LiteSVM
- **Features**: In-process testing, performance profiling

## 🛠️ Technology Stack

- **Runtime**: Node.js with ES6 modules
- **Blockchain**: Solana Web3.js, SPL Token libraries
- **Testing**: LiteSVM for Solana program testing
- **Environment**: dotenv for configuration management

## 📋 Development Guidelines

### Code Quality
- Keep files under 300 lines
- Use descriptive variable names
- Follow ES6 module patterns
- Implement proper error handling

### Security
- Never commit private keys or secrets
- Use environment variables for sensitive data
- Validate all user inputs
- Implement proper key management

### Testing
- Write tests before implementing features (TDD)
- Test critical paths and edge cases
- Use LiteSVM for Solana program testing
- Maintain high test coverage

## 🚨 Security Notice

**CRITICAL**: This project contains examples for educational purposes. Never use these patterns in production without proper security measures:

- Private keys are stored in plain text (for learning only)
- No input validation (add before production)
- No error handling (implement before production)
- No key management (use proper wallet solutions)

## 📚 Documentation

- [Architecture Guide](docs/architecture.md) - System design and component relationships
- [Technical Specs](docs/technical.md) - Implementation details and patterns
- [Tasks](tasks/tasks.md) - Current development tasks and requirements
- [Status](docs/status.md) - Project status and progress tracking

## 🤝 Contributing

1. Follow the established patterns and conventions
2. Write tests for new features
3. Update documentation for significant changes
4. Ensure all tests pass before submitting PRs

## 📄 License

MIT License - see LICENSE file for details
