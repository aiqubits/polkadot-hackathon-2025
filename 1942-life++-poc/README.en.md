# Life++ PoC - Cognitive Proof System on Polkadot REVM

English | 中文

[`English`](./README.en.md) | [`中文`](./README.md)

## 🎯 Project Overview

Life++ PoC is a cognitive proof system built on Polkadot REVM. It provides verifiable proofs of cognitive processes for AI agents, robots, and digital twins, delivering a complete end‑to‑end solution from smart contracts to the web UI.

## 🖼️ UI Pages

In the same order as the left‑side menu (screenshots included):

- **Overview Dashboard**: Displays today’s proofs, active agents, validators online, and average verification time; includes a 24‑hour submission bar chart, system health (Blockchain/IPFS/Validator Network/API Services), recent activity, and Top Agents ranking.
  
  ![Overview Dashboard](./picture/overview-dashboard.png)
- **Regulatory Oversight**: Summarizes today’s stats (auto‑approved/pending/rejected), lists “Pending Regulatory Reviews” cards, and supports one‑click Review/Approve/Reject actions for compliance workflows.
  
  ![Regulatory Oversight](./picture/regulatory-oversight.png)
- **Proof Explorer**: Supports keyword search and status filtering; the table shows Proof ID, Agent, Status, Value, Validators, Time; provides a “View Details” modal for on‑chain/storage details.
  
  ![Proof Explorer](./picture/proof-explorer.png)
- **Agent Registry**: Shows total agents, today’s active count, average ChainRank, and total proofs; cards list each agent’s CID, ChainRank, and proofs with a details view.
  
  ![Agent Registry](./picture/agent-registry.png)
- **ChainRank Analytics**: Displays network average, top performer, threshold stats, and total scored; lists top ranked agents with Consistency/Density/Outcome metrics.
  
  ![ChainRank Analytics](./picture/chainrank-analytics.png)
- **Compliance Center**: Shows KYC/AML monitoring statuses (e.g., Chainalysis, TRM, Sanctions, PEP) and last‑updated times for clear service health.
  
  ![Compliance Center](./picture/compliance-center.png)
- **Token Economics**: Shows CATK price, total staked, aNFT minted, and 24h volume; summarizes key token metrics (supply, circulating, staked, burned, market cap).
  
  ![Token Economics](./picture/token-economics.png)
- **System Settings**: Configurable network (RPC, IPFS, ChainId), verification parameters (required attestations, window, deadline, auto‑approval threshold), regulatory thresholds, and security settings; supports “Reset to Defaults / Save Changes”.
  
  ![System Settings](./picture/system-settings.png)

> All pages above are implemented and accessible in the frontend. Screenshots are provided.

> Data source (real vs mock):
>
> - Overview Dashboard:
>   - Real: Top Performing Agents (from on‑chain via Indexer)
>   - Mock: Four summary cards, 24‑hour chart, Recent Activity, and System Health (for complete UI)
> - Regulatory Oversight: mostly mock (workflow demonstration)
> - Proof Explorer: real on‑chain data (search/status filter/details modal)
> - Agent Registry: real on‑chain data (cards and stats)
> - ChainRank Analytics: mock aggregated stats and ranking (metric demo)
> - Compliance Center: mock monitoring statuses (integration points and health display)
> - Token Economics: mock token/market metrics (dashboard demo)
> - System Settings: frontend demo form (interaction demo, not persisted system config)

## 🏗️ System Architecture

```
+================================================================+
|                       Life++ PoC Architecture                  |
+================================================================+
|                                                                |
|  [Robots / Digital Twins]                                      |
|  +------------------+      +------------------+                |
|  |   Robot SDK      | ---> |  AHIN Indexer     |               |
|  |   (TypeScript)   |      |  (Express.js)    |                |
|  +------------------+      +------------------+                |
|                                |                               |
|                                v                               |
|  [IPFS Storage]                                               |
|  +------------------+ +------------------+ +------------------+|
|  | Evidence Packages | |    Metadata     | |  Reasoning Traces ||
|  +------------------+ +------------------+ +------------------+|
|                                |                               |
|                                v                               |
|  [Blockchain - PassetHub Testnet]                              |
|  +------------------+ +------------------+ +------------------+|
|  |  PoC Registry    | |   PoC Ledger     | |   CATK Token     ||
|  |  Agent Registry  | |   Proof Verify   | |   Incentives      ||
|  +------------------+ +------------------+ +------------------+|
|  +------------------+ +------------------+                     |
|  |  Action Proof    | |  Legal Wrapper   |                     |
|  |      NFT         | |   Compliance     |                     |
|  +------------------+ +------------------+                     |
|                                |                               |
|                                v                               |
|  [Verification Layer]                                          |
|  +------------------+ +------------------+ +------------------+|
|  | ValidatorDaemon  | |   CAT Algorithm  | |  Multi‑Validator   ||
|  |                  | |   4阶段验证       | |   共识机制         ||
|  +------------------+ +------------------+ +------------------+|
|                                                                |
+================================================================+
```

## 🎯 Core Features

### 1) 核心智能合约
- **PoC Registry**: Agent registration and identity management
- **PoC Ledger**: Cognitive proof submission and verification
- **CATK Token**: ERC‑20 token for staking and incentives
- **Action Proof NFT**: ERC‑721 certificate for verified actions
- **Legal Wrapper**: Compliance and jurisdiction management

### 2) 链下服务架构
- **AHIN Indexer**: Evidence packaging, IPFS uploads, blockchain interactions
- **Validator Daemon**: Runs CAT algorithm for proof verification
- **Robot SDK**: TypeScript/Python SDK with standardized APIs
- **IPFS Storage**: Decentralized evidence storage

### 3) 技术特性
- REVM‑compatible (Ethereum tooling on Polkadot REVM)
- Cross‑chain support within the Polkadot ecosystem
- Modular design supporting multiple verification algorithms
- Security via multi‑validator mechanisms
- Decentralized verification (3 validators in prod; threshold adjustable in test)

### 4) 应用场景
- AI agent verification: verifiable cognition for AI systems
- Robot attestation: authenticity and traceability of robot behaviors
- Digital twins: cognitive state verification
- Cross‑chain integration: cognitive proofs across chains

## 🔄 业务工作流程

### End‑to‑End Cognitive Proof Flow

```
++===============================================================+
|                 End‑to‑End Cognitive Proof Flow                 |
++===============================================================+
|                                                                |
|  [1] Agent Registration                                        |
|  +------------------+      +------------------+                |
|  |  Robot/Agent     | ---> |  PoC Registry     |                |
|  |  submit profile  |      |  store agent CID  |               |
|  +------------------+      +------------------+                |
|                                                                |
|  [2] Cognition Execution                                       |
|  +------------------+      +------------------+                |
|  |  receive inputs   | ---> |  reasoning/inference |           |
|  |  (sensor/task)    |      |  (AI decision)       |           |
|  +------------------+      +------------------+                |
|                                                                |
|  [3] Evidence Packaging                                        |
|  +------------------+      +------------------+                |
|  |  AHIN Indexer    | ---> |  IPFS storage      |              |
|  |  package data    |      |  produce CID       |              |
|  +------------------+      +------------------+                |
|                                                                |
|  [4] On‑chain Submission                                       |
|  +------------------+      +------------------+               |
|  |  PoC Ledger      | ---> |  proof ID/hash/timestamp          |
|  +------------------+      +------------------+               |
|                                                               |
|  [5] Verification                                             |
|  +------------------+      +------------------+               |
|  | ValidatorDaemon  | ---> |  CAT algorithm, 4 phases          |
|  +------------------+      +------------------+               |
|                                                               |
|  [6] Result Generation                                        |
|  +------------------+      +------------------+               |
|  |  Action NFT      | ---> |  CATK incentives                   |
|  |  生成行动证书      |      |  奖励分配           |              |
|  +------------------+      +------------------+                |
|                                                                |
++===============================================================+
```

### Detailed Steps

#### 1️⃣ Agent Registration
- Input: basic info, metadata hash
- Process: `PoCRegistry.registerAgent()`
- Output: agent CID recorded on‑chain
- Data generated:
  - address → CID mapping
  - registration timestamp
  - stake records

#### 2️⃣ Cognition Execution
- Input: sensor data, task commands, environment
- Process: agent performs cognitive reasoning to generate decisions
- Output: structured cognition data
- Data generated:
  - input package
  - reasoning steps
  - output results
  - metadata (model version, confidence, etc.)

#### 3️⃣ Evidence Packaging
- Input: full cognition data
- Process: AHIN Indexer packages data into structured evidence
- Output: IPFS evidence package
- Data generated:
  - evidence CID
  - Merkle root hash
  - cryptographic signatures
  - timestamps and version info

#### 4️⃣ On‑chain Submission
- Input: evidence CID and metadata
- Process: submit via `PoCLedger.submitProof()`
- Output: proof record on the blockchain
- Data generated:
  - proof ID (unique identifier)
  - evidence hash
  - submission timestamp
  - transaction hash

#### 5️⃣ Verification
- Input: submitted proof data
- Process: Validator Daemon runs the CAT algorithm
- Output: verification results and scores
- Data generated:
  - syntax checks
  - causal consistency scores
  - intent matching
  - adversarial robustness tests
- Consensus:
  - Production: 3 independent validators (prevent single‑point failures)
  - Testing: threshold can be reduced to 1 (fast review)
  - Contract exposes `setRequiredAttestations()` for governance

#### 6️⃣ Result Generation
- Input: verified proof
- Process: mint NFT certificate and distribute rewards
- Output: verifiable action certificate
- Data generated:
  - Action Proof NFT (ERC‑721)
  - CATK token rewards
  - ChainRank updates
  - compliance records

### Business Value

#### 🎯 For Robots/Agents
- Verifiability: each decision has an on‑chain proof
- Trust: authenticity ensured by a multi‑validator network
- Incentives: CATK token rewards
- Reputation: verification‑based reputation system

#### 🏢 For Enterprises
- Audit & Compliance: auditable records for regulators
- Quality Control: ensure decision quality
- Risk Control: reduce AI risk via verification
- Brand Trust: technology‑backed trust

#### 🌐 For the Ecosystem
- Standardization: toward cognitive proof standards
- Interoperability: cross‑platform/cross‑chain recognition
- Innovation: encourage better algorithms
- Data Value: verifiable cognitive data assets

## 🚀 Quick Start

### Requirements
- Node.js 18+
- npm or yarn
- Git

### 1. Clone the project
```bash
git clone https://github.com/OneBlockPlus/polkadot-hackathon-2025.git
cd polkadot-hackathon-2025/1942-life++-poc
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Setup

#### 3.1 Copy env template
```bash
# 复制环境配置文件（包含所有必要配置，但不包含私钥）
cp .env.passetHub .env
```

#### 3.2 Configure wallet private key
Important: use a test wallet

```bash
# 编辑环境文件
nano .env
# or vim .env / code .env / notepad .env
# macOS/Linux: nano, vim, code | Windows: notepad, code

# Set your test wallet key:
PRIVATE_KEY=0x<your_test_private_key>
```

Notes:
- PRIVATE_KEY: your test wallet
- DEPLOYER_PRIVATE_KEY: preconfigured (auto‑transfer CATK in demo)
- Address derived automatically
- Only testnet ETH is needed for gas; CATK is auto‑transferred

Security tips:
- Use a test wallet (never a wallet with real assets)
- Deployer key is a public test key (for demo only)
- You can delete the test wallet afterwards
- Testnet ETH can be obtained from faucets


### 3.3 Contract deployment (optional)
> Contracts are already deployed on PassetHub testnet; redeploying is optional and not required for the demo.

### 4. Start the test environment (one command)

```bash
# Includes env checks, network/wallet checks, contract/service/API/e2e tests, then starts services
npm run start:test
```

Prerequisite: step 3 completed.

Includes: env checks; contract tests (CATK, Registry, Ledger, NFT, Legal Wrapper); services (Validator Daemon, AHIN Indexer); API tests; end‑to‑end tests; services kept running.

After start:
- AHIN Indexer: http://localhost:3000
- Validator Daemon: background process
- View deployment data: `npm run show:deployment-data`
- Stop all with Ctrl+C

### 5. Start the frontend

```bash
# Enter frontend
cd frontend

# Install deps (first run)
npm install

# Start dev server
npm run dev
```

After start:
- Frontend: http://localhost:5173 (Vite auto‑selects a port if busy)
- Open the printed URL in your browser

Modules:
- Overview Dashboard
- Proof Explorer (details & time sorting)
- Agent Registry (real data)
- ChainRank Analytics
- Regulatory Oversight
- Compliance Center
- Token Economics
- Robot Control
- System Settings

Data notes:
- Real data: proofs, agents, and recent activity come from chain via Indexer
- Mixed: dashboard stats combine real + mock for complete UI
- Data is labeled with source when applicable (`isReal: true`, `dataSource: 'real'|'mock'`)

## 📋 Deployed Contract Addresses (PassetHub Testnet)
- PoC Registry: `0x...`
- PoC Ledger: `0x...`
- CATK Token: `0x...`
- Action Proof NFT: `0x...`
- Legal Wrapper: `0x...`

## 🧪 Testing & Validation
- Env checks (key format, network, wallet balance)
- Contract functions (CATK, Registry, Ledger, NFT, Legal Wrapper)
- Automatic CATK transfer (demo)
- Automatic proof verification
- Automatic NFT minting
- Services (Validator Daemon, AHIN Indexer)
- API tests (health, proof submission)
- End‑to‑end verification
- Real transactions and balance changes
- Service launch checks & guidance

Consensus parameters:
```
Production: 3 independent validators (decentralized)
Testing: threshold can be reduced to 1 for speed
setRequiredAttestations() enables flexible governance
```

#### Wallet impact and adding CATK
After running tests you should see:
- ETH balance reduced by gas (e.g., ~0.05 ETH)
- CATK received (e.g., ~10 CATK; 100 CATK staked in Registry by deployer)
- 1 Action Proof NFT minted
- On‑chain tx records: agent registration, proof submission, token transfer

Add CATK to your wallet to display balance:
1. Use “Add token” → “Custom token” in your wallet
2. Network: `Paseo PassetHub TestNet`
3. Token info (if needed):
```
Contract: 0x2e8880cAdC08E9B438c6052F5ce3869FBd6cE513
Symbol: CATK
Decimals: 18
```

### Evaluation test script
```bash
# 运行完整的评审测试
npm run hackathon:test
```

### Manual verification
1. Visit [PassetHub Testnet Explorer](https://polkadot.js.org/apps/?rpc=wss://testnet-passet-hub-rpc.polkadot.io)
2. Check deployed contract addresses
3. Call functions to verify behavior

## 🔄 Deployment Notes

### Current status
- ✅ Contracts deployed to PassetHub testnet
- ✅ Addresses configured in `.env.passetHub`
- ✅ Ready to test without redeployment

### Redeployment notes
- ✅ Safe and functional; won’t break the system
- ✅ Addresses auto‑updated by scripts
- ⚠️ Consumes gas

### Steps (if you choose to redeploy)
```bash
# 1. 备份当前部署信息
cp deployments/passetHub-deployment.json deployments/passetHub-deployment-backup.json

# 2. 重新部署（如果需要）
npm run deploy:passethub

# 3. 验证新部署
npm run show:deployment-data

# 4. 更新环境配置（如果需要）
nano .env.passetHub
```

## 🔧 Development Guide

### Project structure
```
├── contracts/                    # 智能合约源码
│   ├── PoCRegistry.sol          # 代理注册合约
│   ├── PoCLedger.sol            # 证明验证合约
│   ├── CognitiveAssetToken.sol  # CATK 代币合约
│   ├── ActionProofNFT.sol       # 行动证明 NFT 合约
│   └── LegalWrapper.sol         # 合规管理合约
├── scripts/                     # 部署和测试脚本
│   ├── deploy.js               # 合约部署脚本
│   ├── hackathon-test.js       # 评审测试脚本
│   ├── test-passethub.js       # PassetHub 测试脚本
│   ├── start-passethub-services.js # 服务启动脚本
│   └── show-deployment-data.js # 部署数据展示脚本
├── src/                        # 链下服务源码
│   ├── ahin-indexer/           # AHIN 索引器服务
│   │   └── server.ts           # Express.js 服务器
│   ├── validator/              # 验证器服务
│   │   ├── ValidatorDaemon.ts  # 验证器守护进程
│   │   └── CognitiveAlignmentTest.ts # CAT 算法实现
│   ├── robot-sdk/              # 机器人 SDK
│   │   └── RobotSDK.ts         # 机器人 SDK 实现
│   └── types.ts                # 类型定义
├── examples/                    # 使用示例
│   └── robot-example.ts        # 机器人使用示例
├── test/                       # 测试文件
│   └── PoCLedger.test.js       # 合约单元测试
├── docs/                       # 文档
│   └── sprint_backlog.md       # 开发计划
├── deployments/                 # 部署记录
│   ├── passetHub-deployment.json # PassetHub 部署记录
│   └── localhost-deployment.json  # 本地部署记录
├── artifacts/                   # 编译产物
├── cache/                      # 编译缓存
├── docker-compose.yml          # Docker 配置
├── hardhat.config.js          # Hardhat 配置
├── package.json                # 项目依赖
├── tsconfig.json              # TypeScript 配置
└── README.md                  # 项目说明
```

### Key scripts
- `npm run deploy:passethub` - deploy to PassetHub
- `npm run hackathon:test` - evaluation test
- `npm run indexer:start` - start indexer
- `npm run validator:start` - start validator

## 🌐 Network Configuration
- RPC: `https://testnet-passet-hub-eth-rpc.polkadot.io`
- Chain ID: `420420422`
- Token Symbol: `PAS`
- Faucet: [PassetHub Faucet](https://faucet.polkadot.io/)
- Explorer: [Polkadot.js Apps](https://polkadot.js.org/apps/)

## 📚 Documentation Resources
- Chinese documentation: `README.md`
- Env generator: `node scripts/create-developer-env.js` (produces `.env.passetHub`)
- Test scripts: `scripts/hackathon-test.js`

## 🤝 Contributing
1. Fork the repo
2. Create a feature branch
3. Commit changes
4. Open a Pull Request

## 📄 License
MIT License

## 📞 Contact
- Repository: [GitHub Repository]
- Issues: [GitHub Issues]
- Discussions: [GitHub Discussions]

---

Note: This is a hackathon project that demonstrates a cognitive proof system on Polkadot REVM. Please conduct a thorough security review before any production use.