/**
 * 使用 viem 测试与 PolkaVM 本地链的交互
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

// 配置
const RPC_URL = "http://127.0.0.1:8545";
const CHAIN_ID = 420420420; // PolkaVM Chain ID
const VDOT_ADDRESS = "0x82745827D0B8972eC0583B3100eCb30b81Db0072";
const ACCOUNT_ADDRESS = "0xf24FF3a9CF04c71Dbc94D0b566f7A27B94566cac";

// vDOT ABI (简化版)
const vDOT_ABI = [
  {
    inputs: [],
    name: "deposit",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getContractBalance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
    name: "Deposit",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
    name: "Withdraw",
    type: "event",
  },
];

// 创建 public client
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

// 查询合约状态
async function queryContractState() {
  console.log("\n=== 📊 查询合约状态 ===\n");

  try {
    // 查询合约是否暂停
    const isPaused = await publicClient.readContract({
      address: VDOT_ADDRESS,
      abi: vDOT_ABI,
      functionName: "paused",
    });
    console.log(`合约状态: ${isPaused ? "⏸️  已暂停" : "✅ 运行中"}`);

    // 查询总供应量
    const totalSupply = await publicClient.readContract({
      address: VDOT_ADDRESS,
      abi: vDOT_ABI,
      functionName: "totalSupply",
    });
    console.log(`vDOT 总供应量: ${formatEther(totalSupply)} vDOT`);

    // 查询合约 ETH 余额
    const contractBalance = await publicClient.readContract({
      address: VDOT_ADDRESS,
      abi: vDOT_ABI,
      functionName: "getContractBalance",
    });
    console.log(`合约 ETH 余额: ${formatEther(contractBalance)} ETH`);

    // 查询账户 ETH 余额
    const ethBalance = await publicClient.getBalance({
      address: ACCOUNT_ADDRESS,
    });
    console.log(`账户 ETH 余额: ${formatEther(ethBalance)} ETH`);

    // 查询账户 vDOT 余额
    const vDOTBalance = await publicClient.readContract({
      address: VDOT_ADDRESS,
      abi: vDOT_ABI,
      functionName: "balanceOf",
      args: [ACCOUNT_ADDRESS],
    });
    console.log(`账户 vDOT 余额: ${formatEther(vDOTBalance)} vDOT`);

    return {
      isPaused,
      totalSupply,
      contractBalance,
      ethBalance,
      vDOTBalance,
    };
  } catch (error) {
    console.error("❌ 查询失败:", error.message);
    throw error;
  }
}

// 测试不同的铸造方法
async function testMintMethods() {
  console.log("\n=== 🧪 测试不同的铸造方法 ===\n");

  const amount = parseEther("0.001");

  // 方法 1: 使用 eth_call 测试
  console.log("方法 1: 使用 eth_call 测试合约调用");
  try {
    const result = await publicClient.call({
      account: ACCOUNT_ADDRESS,
      to: VDOT_ADDRESS,
      data: "0xd0e30db0", // deposit() 函数选择器
      value: amount,
    });
    console.log(`✅ eth_call 成功: ${result.data}\n`);
  } catch (error) {
    console.log(`❌ 方法 1 失败: ${error.message}\n`);
  }

  // 方法 2: 估算 gas
  console.log("方法 2: 估算 gas");
  try {
    const gas = await publicClient.estimateGas({
      account: ACCOUNT_ADDRESS,
      to: VDOT_ADDRESS,
      value: amount,
    });
    console.log(`✅ 估算的 gas: ${gas.toString()}\n`);
  } catch (error) {
    console.log(`❌ 方法 2 失败: ${error.message}\n`);
  }

  // 方法 3: 估算合约函数调用的 gas
  console.log("方法 3: 估算 deposit() 函数的 gas");
  try {
    const gas = await publicClient.estimateContractGas({
      address: VDOT_ADDRESS,
      abi: vDOT_ABI,
      functionName: "deposit",
      account: ACCOUNT_ADDRESS,
      value: amount,
    });
    console.log(`✅ 估算的 gas: ${gas.toString()}\n`);
  } catch (error) {
    console.log(`❌ 方法 3 失败: ${error.message}\n`);
  }
}

// 使用私钥铸造 vDOT
async function mintWithPrivateKey(privateKey, amount) {
  console.log(`\n=== 🪙 使用私钥铸造 ${amount} ETH 的 vDOT ===\n`);

  try {
    const account = privateKeyToAccount(privateKey);
    console.log(`使用账户: ${account.address}`);

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

    const amountWei = parseEther(amount);

    // 方法 1: 直接发送交易
    console.log("\n尝试方法 1: 直接发送 ETH 到合约");
    try {
      const hash = await walletClient.sendTransaction({
        to: VDOT_ADDRESS,
        value: amountWei,
        gas: 100000n,
        gasPrice: 1000n, // 使用链建议的 gas price (0x3e8)
      });
      console.log(`✅ 交易已发送: ${hash}`);

      // 等待确认
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`✅ 交易已确认! Gas 使用: ${receipt.gasUsed.toString()}`);
      return receipt;
    } catch (error) {
      console.log(`❌ 方法 1 失败: ${error.message}`);
    }

    // 方法 2: 调用 deposit 函数
    console.log("\n尝试方法 2: 调用 deposit() 函数");
    try {
      const hash = await walletClient.writeContract({
        address: VDOT_ADDRESS,
        abi: vDOT_ABI,
        functionName: "deposit",
        value: amountWei,
        gas: 100000n,
        gasPrice: 1000n, // 使用链建议的 gas price (0x3e8)
      });
      console.log(`✅ 交易已发送: ${hash}`);

      // 等待确认
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`✅ 交易已确认! Gas 使用: ${receipt.gasUsed.toString()}`);
      return receipt;
    } catch (error) {
      console.log(`❌ 方法 2 失败: ${error.message}`);
    }
  } catch (error) {
    console.error("❌ 铸造失败:", error);
    throw error;
  }
}

// 查询历史事件
async function queryEvents(fromBlock = 0n) {
  console.log(`\n=== 📜 查询历史事件 (从区块 ${fromBlock}) ===\n`);

  try {
    // 获取当前区块
    const currentBlock = await publicClient.getBlockNumber();
    console.log(`当前区块: ${currentBlock}\n`);

    // 查询 Deposit 事件
    const depositLogs = await publicClient.getLogs({
      address: VDOT_ADDRESS,
      event: {
        type: "event",
        name: "Deposit",
        inputs: [
          { indexed: true, name: "user", type: "address" },
          { indexed: false, name: "amount", type: "uint256" },
        ],
      },
      fromBlock,
      toBlock: currentBlock,
    });

    console.log(`找到 ${depositLogs.length} 个 Deposit 事件:`);
    depositLogs.forEach((log, index) => {
      console.log(
        `  ${index + 1}. 区块 ${log.blockNumber}: ${formatEther(log.args.amount)} ETH`,
      );
    });

    // 查询 Withdraw 事件
    const withdrawLogs = await publicClient.getLogs({
      address: VDOT_ADDRESS,
      event: {
        type: "event",
        name: "Withdraw",
        inputs: [
          { indexed: true, name: "user", type: "address" },
          { indexed: false, name: "amount", type: "uint256" },
        ],
      },
      fromBlock,
      toBlock: currentBlock,
    });

    console.log(`\n找到 ${withdrawLogs.length} 个 Withdraw 事件:`);
    withdrawLogs.forEach((log, index) => {
      console.log(
        `  ${index + 1}. 区块 ${log.blockNumber}: ${formatEther(log.args.amount)} ETH`,
      );
    });
  } catch (error) {
    console.error("❌ 查询事件失败:", error.message);
  }
}

// 主函数
async function main() {
  console.log("🚀 开始与 PolkaVM 本地链交互");
  console.log(`RPC URL: ${RPC_URL}`);
  console.log(`Chain ID: ${CHAIN_ID}`);
  console.log(`vDOT 合约: ${VDOT_ADDRESS}\n`);

  try {
    // 1. 查询合约状态
    await queryContractState();

    // 2. 测试不同的铸造方法
    await testMintMethods();

    // 3. 查询历史事件
    await queryEvents();

    // 4. 如果提供了私钥，执行铸造
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    if (PRIVATE_KEY) {
      console.log("\n✅ 检测到私钥，尝试执行铸造操作");
      await mintWithPrivateKey(PRIVATE_KEY, "0.001");

      // 再次查询状态
      await queryContractState();
    } else {
      console.log("\n⚠️  未提供私钥，跳过铸造操作");
      console.log("提示: 设置环境变量 PRIVATE_KEY 来执行铸造");
      console.log("例如: PRIVATE_KEY=0x... node scripts/test-mint-viem.js");
    }

    console.log("\n✅ 测试完成!");
  } catch (error) {
    console.error("\n❌ 测试失败:", error);
    process.exit(1);
  }
}

// 运行主函数
main();

// 导出函数
export {
  queryContractState,
  testMintMethods,
  mintWithPrivateKey,
  queryEvents,
  publicClient,
  vDOT_ABI,
};
