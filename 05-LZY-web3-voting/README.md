# Web3 Voting

A decentralized voting platform built on Moonbeam & Bifrost, powered by Chainlink oracles. Predict when (or if) competitors will surpass Bitcoin's market cap and earn NFT rewards.

## 💭 Why Web3 Voting?

**Web3 Voting** was born from a simple observation: the blockchain world today is almost entirely focused on finance and gaming, while it continues to ignore something more fundamental: **our spiritual and ideological needs**.

### The Vision Behind Belief

Some people firmly believe that altcoins will eventually surpass Bitcoin. Others argue that smart contracts will one day be replaced by new mechanisms like the JAM protocol. Behind these bold ideas are communities of believers — people with vision and conviction.

Yet, there's no real outlet for them in the current market.

**That's why Web3 Voting exists** — a decentralized platform where:

- **Belief can gather** — Communities of conviction find their voice
- **Voices can be heard** — Every opinion matters in the consensus
- **Consensus can form** — Ideas become assets through blockchain

We want every person with conviction or insight to have a place where their thoughts truly matter.

### From Voting to Prophecy: The Future of Thought Economy

In the long-term roadmap, Web3 Voting aims to evolve beyond a voting platform and become a **"Thought Economy"** — a place where ideas themselves can be minted, valued, and exchanged.

Inspired by the concept of MEME coin issuance, Web3 Voting will allow users to mint vDOT-backed ideas or prophecies instead of speculative tokens. Anyone can mint vDOT to publish their insights — whether it's a prediction about blockchain trends, social change, or philosophical reflections.

Each "idea token" becomes the starting point for active discussion and collective exploration, creating a decentralized marketplace of ideas that fuels meaningful discourse.

**In this future, thoughts themselves become assets — quantified, shared, and circulated through blockchain consensus.**

## 🌟 Features

- **Mint vDOT**: Deposit native tokens (DEV/DOT) to mint vDOT tokens at a 1:1 ratio
- **Stake vDOT**: Lock vDOT tokens to receive voting tickets (1:1 ratio)
- **Vote**: Use voting tickets to predict when competitors will surpass Bitcoin's market cap
- **Reveal & Rewards**: Chainlink oracle automatically checks market caps and distributes NFT rewards to winners
- **Multi-Chain Support**: Deployed on Moonbase Alpha, Moonbeam, and Moonriver networks

## ⚙️ Technical Foundation

### Polkadot + Bifrost SLPx Integration

Web3 Voting runs on the **Polkadot parachain network** (Moonbeam). Within this ecosystem, we integrate **Bifrost's SLPx modular Liquid Staking SDK**, which allows users to:

- Complete cross-chain operations in a single step
- Mint vDOT tokens seamlessly
- Participate in liquid staking while maintaining liquidity

This integration means users can move assets across chains and mint vDOT in one transaction, eliminating the friction of traditional multi-step processes.

### Voting Logic & Staking Rewards

After obtaining voting tickets, users' tokens are **locked until results are announced**. However, during this lock-up period:

- ✅ Users **continue earning staking rewards** from their vDOT
- ✅ Voting tickets are **automatically delegated** to participants with the highest votes
- ✅ Forms an **autonomous, decentralized delegation system**

This ensures that even passive users — those who don't actively manage their votes — still contribute to governance and community consensus. In Web3 Voting, **belief, voting, and yield are united in a self-sustaining ecosystem**.

### NFT Rewards & Community Incentives

To make the voting process more meaningful, **each voting round generates a limited-edition NFT as a reward**. These NFTs are:

- 🎨 **Proof of participation** — Record your voice in blockchain history
- 💎 **Symbol of belief** — Represent your conviction and vision
- 🏆 **Collectible badges** — Unique tokens commemorating your participation
- 🔐 **Future governance credentials** — Potential voting rights in the ecosystem

Every vote, every consensus, is recorded as a **spiritual signature on the blockchain**.

## 🏗️ Architecture

### Core Smart Contracts

1. **vDOT** - Wrapped token contract (1:1 with native token)
2. **StakingContract** - Staking contract that locks vDOT and mints voting tickets
3. **VotingContract** - Voting contract for market cap predictions
4. **VotingTicket** - ERC20 token representing voting rights
5. **BTCOracle** - Chainlink-powered oracle for market cap monitoring
6. **VotingNFTReward** - NFT reward distribution contract

### Technology Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Web3**: Wagmi, Viem, Polkadot.js
- **Blockchain**: Moonbeam Network (EVM-compatible Polkadot parachain)
- **Oracle**: Chainlink Price Feeds
- **Database**: Prisma (PostgreSQL)
- **Smart Contracts**: Solidity 0.8.19

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- MetaMask or compatible Web3 wallet
- Testnet tokens (DEV for Moonbase Alpha)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd web3-voting

# Install dependencies
npm install
# or
yarn install
# or
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Generate Prisma client
npm run db:generate
```

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# RPC URLs (optional - defaults to public endpoints)
NEXT_PUBLIC_MOONBASE_ALPHA_RPC_URL=https://rpc.api.moonbase.moonbeam.network
NEXT_PUBLIC_MOONBEAM_RPC_URL=https://rpc.api.moonbeam.network
NEXT_PUBLIC_MOONRIVER_RPC_URL=https://rpc.api.moonriver.moonbeam.network

# WalletConnect (optional)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Database (if using Prisma)
DATABASE_URL=postgresql://user:password@localhost:5432/web3voting
```

### Development

```bash
# Start development server
npm run dev

# Run linting
npm run lint

# Type checking
npm run typecheck

# Format code
npm run format:write
```

### Build

```bash
# Build for production
npm run build

# Start production server
npm start

# Preview production build
npm run preview
```

## 📱 Usage

### 1. Connect Wallet

1. Click "Connect Wallet" on the homepage
2. Select your preferred wallet (MetaMask recommended)
3. Switch to Moonbase Alpha network (Chain ID: 1287)

### 2. Mint vDOT

1. Navigate to the **Mint** page
2. Enter the amount of native tokens (DEV) you want to deposit
3. Click "Deposit" and confirm the transaction
4. Receive vDOT tokens at a 1:1 ratio

### 3. Stake vDOT

1. Navigate to the **Stake** page
2. Enter the amount of vDOT to stake
3. Click "Stake" and confirm the transaction
4. Receive voting tickets (1 vDOT = 1 ticket)
5. Your vDOT will be locked until the voting period is resolved

### 4. Vote

1. Navigate to the **Vote** page
2. Select a predicted year (or "Never")
3. Enter the number of voting tickets to use
4. Click "Submit Vote" and confirm the transaction

### 5. Reveal & Claim Rewards

1. After the voting period ends, navigate to the **Reveal** page
2. The Chainlink oracle automatically checks market caps
3. If competitors surpassed Bitcoin, winners receive NFT rewards
4. Click "Claim Reward" to mint your NFT

## 🌐 Supported Networks

| Network         | Chain ID  | Type    | Status            |
| --------------- | --------- | ------- | ----------------- |
| Moonbase Alpha  | 1287      | Testnet | ✅ Active         |
| Moonbeam        | 1284      | Mainnet | 🚧 To be deployed |
| Moonriver       | 1285      | Mainnet | 🚧 To be deployed |
| PolkaVM (Local) | 420420420 | Local   | ✅ Development    |
| Hardhat (Local) | 31337     | Local   | ✅ Development    |

## 📁 Project Structure

```
web3-voting/
├── contracts/           # Smart contracts (Solidity)
│   ├── vDOT.sol
│   ├── StakingContract.sol
│   ├── VotingContract.sol
│   ├── VotingTicket.sol
│   ├── BTCOracle.sol
│   └── VotingNFTReward.sol
├── src/
│   ├── app/            # Next.js app router pages
│   │   ├── page.tsx    # Homepage
│   │   ├── mint/       # Mint vDOT page
│   │   ├── stake/      # Stake page
│   │   ├── vote/       # Vote page
│   │   └── reveal/     # Reveal & rewards page
│   ├── components/     # React components
│   ├── config/         # Configuration files
│   │   ├── chains.ts   # Chain configurations
│   │   ├── contracts.ts # Contract addresses & ABIs
│   │   └── wagmi.ts    # Wagmi configuration
│   ├── hooks/          # Custom React hooks
│   ├── contexts/       # React contexts
│   └── providers/      # React providers
├── scripts/            # Utility scripts
├── docs/               # Documentation
└── public/             # Static assets
```

## 🔧 Configuration

### Contract Addresses

Contract addresses are configured in `src/config/contracts.ts`. The addresses vary by network:

- **Moonbase Alpha**: All contracts deployed
- **Moonbeam/Moonriver**: To be deployed
- **Local Networks**: Hardcoded test addresses

### Chain Configuration

Chain configurations are defined in `src/config/chains.ts` using Viem's `defineChain`.

## 🧪 Testing

```bash
# Test Moonbase Alpha connection
node scripts/test-moonbase-connection.js

# Run contract tests (if using Hardhat)
npx hardhat test
```

## 📚 Documentation

- [Circuit Breaker Error Explanation](./docs/circuit-breaker-error-explanation.md)
- [Wallet Integration Guide](./README_WALLET.md)
- [Multi-Chain Oracle System](./docs/multi-chain-oracle-system.md)
- [Contract Integration](./docs/contract-integration-complete.md)

## 🐛 Troubleshooting

### Circuit Breaker Errors

If you encounter "Network connection issue" errors:

1. Wait 10-30 seconds and try again
2. Refresh the page
3. Switch networks in MetaMask and switch back
4. Check your internet connection
5. Use a different RPC endpoint (configure in `.env.local`)

See [Circuit Breaker Error Explanation](./docs/circuit-breaker-error-explanation.md) for detailed information.

### Wallet Connection Issues

1. Ensure MetaMask is installed and unlocked
2. Switch to the correct network (Moonbase Alpha)
3. Disconnect and reconnect the wallet
4. Clear browser cache and reload

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🚀 Future Roadmap

### Phase 1: Core Voting Platform ✅

- [x] vDOT minting and staking
- [x] Voting system with Chainlink oracles
- [x] NFT reward distribution
- [x] Multi-chain support (Moonbase Alpha)

### Phase 2: Enhanced Features 🚧

- [ ] Automatic delegation system
- [ ] Enhanced NFT metadata and rarity
- [ ] Governance token integration
- [ ] Community proposal system

### Phase 3: Thought Economy 🌌

- [ ] vDOT-backed idea minting
- [ ] Prophecy token creation
- [ ] Decentralized marketplace of ideas
- [ ] Reputation and influence system
- [ ] Cross-platform idea trading

### Phase 4: Global Consensus Network 🌍

- [ ] Multi-domain voting (beyond blockchain)
- [ ] Social impact predictions
- [ ] Philosophical discourse tokens
- [ ] Global thought marketplace

## 💡 Philosophy

### Belief, Consensus, and the Future of Web3

The true meaning of **Web3 Voting** is to use blockchain as a new carrier for:

- **Human thought** — Ideas become assets
- **Belief** — Conviction finds expression
- **Expression** — Voices are heard and valued

We transform consensus from a financial mechanism into a **spiritual and intellectual connection between people**.

**The power of belief, the consensus of voting — that is what Web3 Voting stands for.**

Let's make the next wave of blockchain innovation a wave of **faith, ideas, and human connection**.

## 🙏 Acknowledgments

- [Moonbeam Network](https://moonbeam.network/) - EVM-compatible Polkadot parachain
- [Bifrost](https://bifrost.finance/) - Cross-chain liquidity protocol & SLPx SDK
- [Chainlink](https://chain.link/) - Decentralized oracle network
- [Polkadot](https://polkadot.network/) - Interoperable blockchain network
- [Wagmi](https://wagmi.sh/) - React Hooks for Ethereum
- [Viem](https://viem.sh/) - TypeScript interface for Ethereum

## 📮 Contact

For questions or support, please open an issue on GitHub.

## 📖 Learn More

- [Project Philosophy](./docs/philosophy.md) - Deep dive into the vision behind Web3 Voting
- [Technical Architecture](./docs/multi-chain-oracle-system.md) - Detailed system design
- [Bifrost Integration](./docs/bifrost-integration.md) - SLPx integration guide

---

**Built with ❤️ for the Web3 community**

_"Where belief meets blockchain, consensus becomes currency, and thoughts transform into assets."_
