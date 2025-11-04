/**
 * 检查交易状态和链上数据
 */

import { createPublicClient, http, formatEther } from "viem";

const RPC_URL = "http://127.0.0.1:8545";
const CHAIN_ID = 420420420;
const ACCOUNT_ADDRESS = "0xf24FF3a9CF04c71Dbc94D0b566f7A27B94566cac";
const VDOT_ADDRESS = "0x82745827D0B8972eC0583B3100eCb30b81Db0072";

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

// vDOT ABI
const vDOT_ABI = [
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
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
    name: "getContractBalance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

async function checkTransactionStatus() {
  console.log("🔍 检查交易状态和链上数据\n");

  try {
    // 1. 检查账户余额
    console.log("1. 账户余额:");
    const ethBalance = await publicClient.getBalance({
      address: ACCOUNT_ADDRESS,
    });
    console.log(`   ETH 余额: ${formatEther(ethBalance)} PVM`);

    // 2. 检查 vDOT 合约状态
    console.log("\n2. vDOT 合约状态:");
    const totalSupply = await publicClient.readContract({
      address: VDOT_ADDRESS,
      abi: vDOT_ABI,
      functionName: "totalSupply",
    });
    console.log(`   总供应量: ${formatEther(totalSupply)} vDOT`);

    const contractBalance = await publicClient.readContract({
      address: VDOT_ADDRESS,
      abi: vDOT_ABI,
      functionName: "getContractBalance",
    });
    console.log(`   合约 ETH 余额: ${formatEther(contractBalance)} PVM`);

    const userVDOTBalance = await publicClient.readContract({
      address: VDOT_ADDRESS,
      abi: vDOT_ABI,
      functionName: "balanceOf",
      args: [ACCOUNT_ADDRESS],
    });
    console.log(`   用户 vDOT 余额: ${formatEther(userVDOTBalance)} vDOT`);

    // 3. 检查最新区块
    console.log("\n3. 最新区块信息:");
    const block = await publicClient.getBlock();
    console.log(`   区块号: ${block.number}`);
    console.log(`   交易数量: ${block.transactions.length}`);
    console.log(
      `   时间戳: ${new Date(Number(block.timestamp) * 1000).toLocaleString()}`,
    );

    // 4. 检查最近的交易
    console.log("\n4. 最近的交易:");
    if (block.transactions.length > 0) {
      console.log(`   找到 ${block.transactions.length} 个交易`);
      block.transactions.forEach((tx, index) => {
        if (typeof tx === "object" && tx.hash) {
          console.log(`   ${index + 1}. ${tx.hash}`);
          console.log(`      从: ${tx.from}`);
          console.log(`      到: ${tx.to || "合约创建"}`);
          console.log(
            `      值: ${tx.value ? formatEther(tx.value) : "0"} PVM`,
          );
        }
      });
    } else {
      console.log("   没有找到交易");
    }

    // 5. 分析结果
    console.log("\n5. 分析结果:");
    if (userVDOTBalance > 0n) {
      console.log("   ✅ 用户有 vDOT 余额，说明铸造成功了");
    } else {
      console.log("   ❌ 用户没有 vDOT 余额，铸造可能失败了");
    }

    if (contractBalance > 0n) {
      console.log("   ✅ 合约有 ETH 余额，说明有存款");
    } else {
      console.log("   ❌ 合约没有 ETH 余额，可能没有存款");
    }

    console.log("\n✅ 交易状态检查完成!");
  } catch (error) {
    console.error("❌ 检查失败:", error);
  }
}

// 运行检查
checkTransactionStatus();
