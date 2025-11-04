/**
 * 初始化投票系统
 * 设置投票期、预言机参数、竞争链数据等
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const RPC_URL = "http://127.0.0.1:8545";
const CHAIN_ID = 420420420; // PolkaVM Chain ID
const PRIVATE_KEY =
  "0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133";

// 合约地址
const CONTRACTS = {
  votingContract: "0x9c1da847B31C0973F26b1a2A3d5c04365a867703",
  btcOracle: "0x527FC4060Ac7Bf9Cd19608EDEeE8f09063A16cd4",
  stakingContract: "0x598efcBD0B5b4Fd0142bEAae1a38f6Bd4d8a218d",
  votingTicket: "0x21cb3940e6Ba5284E1750F1109131a8E8062b9f1",
};

// 创建客户端
const publicClient = createPublicClient({
  chain: {
    id: CHAIN_ID,
    name: "PolkaVM Local",
    network: "polkavm",
    nativeCurrency: { name: "PVM", symbol: "PVM", decimals: 18 },
    rpcUrls: {
      default: { http: [RPC_URL] },
      public: { http: [RPC_URL] },
    },
  },
  transport: http(RPC_URL),
});

const account = privateKeyToAccount(PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  chain: {
    id: CHAIN_ID,
    name: "PolkaVM Local",
    network: "polkavm",
    nativeCurrency: { name: "PVM", symbol: "PVM", decimals: 18 },
    rpcUrls: {
      default: { http: [RPC_URL] },
      public: { http: [RPC_URL] },
    },
  },
  transport: http(RPC_URL),
});

// 投票合约 ABI
const VOTING_CONTRACT_ABI = [
  {
    inputs: [
      { name: "startTime", type: "uint256" },
      { name: "endTime", type: "uint256" },
      { name: "description", type: "string" },
    ],
    name: "createVotingPeriod",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getCurrentVotingPeriod",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "periodId", type: "uint256" }],
    name: "getVotingPeriodInfo",
    outputs: [
      { name: "startTime", type: "uint256" },
      { name: "endTime", type: "uint256" },
      { name: "isActive", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

// 预言机 ABI
const ORACLE_ABI = [
  {
    inputs: [
      { name: "name", type: "string" },
      { name: "priceFeed", type: "address" },
      { name: "circulatingSupply", type: "uint256" },
    ],
    name: "addCompetitor",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "votingPeriodId", type: "uint256" },
      { name: "btcMarketCap", type: "uint256" },
      { name: "competitorCap", type: "uint256" },
    ],
    name: "setThreshold",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "votingPeriodId", type: "uint256" }],
    name: "takeMarketSnapshot",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "votingPeriodId", type: "uint256" }],
    name: "getSnapshotCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

async function initializeVotingSystem() {
  console.log("🚀 开始初始化投票系统...\n");

  try {
    // 1. 检查账户余额
    console.log("1. 检查账户状态:");
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`   账户余额: ${formatEther(balance)} PVM`);
    console.log(`   账户地址: ${account.address}\n`);

    // 2. 创建投票期
    console.log("2. 创建投票期:");
    const now = Math.floor(Date.now() / 1000);
    const startTime = now + 60; // 1分钟后开始
    const endTime = now + 86400 * 7; // 7天后结束

    console.log(`   开始时间: ${new Date(startTime * 1000).toLocaleString()}`);
    console.log(`   结束时间: ${new Date(endTime * 1000).toLocaleString()}`);

    const createVotingPeriodTx = await walletClient.writeContract({
      address: CONTRACTS.votingContract,
      abi: VOTING_CONTRACT_ABI,
      functionName: "createVotingPeriod",
      args: [
        BigInt(startTime),
        BigInt(endTime),
        "BTC vs 竞争链市值预测 - 2025年第一季",
      ],
      gas: 500000n,
      gasPrice: 10000n,
    });

    console.log(`   交易哈希: ${createVotingPeriodTx}`);
    console.log("   ✅ 投票期创建成功\n");

    // 3. 等待交易确认
    console.log("3. 等待交易确认...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 4. 添加竞争链
    console.log("4. 添加竞争链数据:");

    // 添加以太坊
    const addEthereumTx = await walletClient.writeContract({
      address: CONTRACTS.btcOracle,
      abi: ORACLE_ABI,
      functionName: "addCompetitor",
      args: [
        "Ethereum",
        "0x0000000000000000000000000000000000000000", // 模拟价格源
        parseEther("120000000"), // 1.2亿 ETH 流通量
      ],
      gas: 500000n,
      gasPrice: 10000n,
    });
    console.log(`   以太坊添加交易: ${addEthereumTx}`);

    // 添加 Solana
    const addSolanaTx = await walletClient.writeContract({
      address: CONTRACTS.btcOracle,
      abi: ORACLE_ABI,
      functionName: "addCompetitor",
      args: [
        "Solana",
        "0x0000000000000000000000000000000000000000", // 模拟价格源
        parseEther("500000000"), // 5亿 SOL 流通量
      ],
      gas: 500000n,
      gasPrice: 10000n,
    });
    console.log(`   Solana 添加交易: ${addSolanaTx}`);
    console.log("   ✅ 竞争链添加成功\n");

    // 5. 设置市值阈值
    console.log("5. 设置市值阈值:");
    const btcMarketCap = parseEther("1000000000000"); // 1万亿美元
    const competitorCap = parseEther("500000000000"); // 5000亿美元

    const setThresholdTx = await walletClient.writeContract({
      address: CONTRACTS.btcOracle,
      abi: ORACLE_ABI,
      functionName: "setThreshold",
      args: [
        1n, // 投票期 1
        btcMarketCap,
        competitorCap,
      ],
      gas: 500000n,
      gasPrice: 10000n,
    });
    console.log(`   阈值设置交易: ${setThresholdTx}`);
    console.log("   ✅ 阈值设置成功\n");

    // 6. 拍摄初始快照
    console.log("6. 拍摄初始市场快照:");
    const takeSnapshotTx = await walletClient.writeContract({
      address: CONTRACTS.btcOracle,
      abi: ORACLE_ABI,
      functionName: "takeMarketSnapshot",
      args: [1n], // 投票期 1
      gas: 500000n,
      gasPrice: 10000n,
    });
    console.log(`   快照交易: ${takeSnapshotTx}`);
    console.log("   ✅ 初始快照拍摄成功\n");

    // 7. 验证初始化结果
    console.log("7. 验证初始化结果:");

    // 检查投票期
    const currentPeriod = await publicClient.readContract({
      address: CONTRACTS.votingContract,
      abi: VOTING_CONTRACT_ABI,
      functionName: "getCurrentVotingPeriod",
    });
    console.log(`   当前投票期: ${currentPeriod.toString()}`);

    // 检查快照数量
    const snapshotCount = await publicClient.readContract({
      address: CONTRACTS.btcOracle,
      abi: ORACLE_ABI,
      functionName: "getSnapshotCount",
      args: [1n],
    });
    console.log(`   快照数量: ${snapshotCount.toString()}`);

    console.log("\n🎉 投票系统初始化完成!");
    console.log("📊 开奖监控面板现在应该显示:");
    console.log("   - 最近一次检查: 有数据");
    console.log("   - 下一次检查: 有数据");
    console.log("   - 快照次数: 1次");
    console.log("   - 触发条件: 任一竞争链市值 ≥ BTC");
  } catch (error) {
    console.error("❌ 初始化失败:", error);
    console.log("\n🔧 可能的解决方案:");
    console.log("1. 检查合约是否正确部署");
    console.log("2. 检查账户是否有足够的 gas");
    console.log("3. 检查合约权限设置");
  }
}

// 运行初始化
initializeVotingSystem();
