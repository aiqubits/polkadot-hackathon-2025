/**
 * 简单的初始化脚本
 * 只做基本的检查和设置
 */

import { createPublicClient, http, formatEther } from "viem";

const RPC_URL = "http://127.0.0.1:8545";
const CHAIN_ID = 420420420;

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

async function simpleInit() {
  console.log("🔍 简单初始化检查...\n");

  try {
    // 1. 检查链状态
    console.log("1. 链状态:");
    const chainId = await publicClient.getChainId();
    console.log(`   链 ID: ${chainId}`);

    const block = await publicClient.getBlock();
    console.log(`   最新区块: ${block.number}`);
    console.log(
      `   时间戳: ${new Date(Number(block.timestamp) * 1000).toLocaleString()}\n`,
    );

    // 2. 检查合约状态
    console.log("2. 合约状态:");
    const contracts = {
      votingContract: "0x7acc1aC65892CF3547b1b0590066FB93199b430D",
      btcOracle: "0x85b108660f47caDfAB9e0503104C08C1c96e0DA9",
      vDOT: "0x82745827D0B8972eC0583B3100eCb30b81Db0072",
    };

    for (const [name, address] of Object.entries(contracts)) {
      const code = await publicClient.getCode({ address });
      console.log(`   ${name}: ${code !== "0x" ? "✅ 已部署" : "❌ 未部署"}`);
    }

    // 3. 检查预言机状态
    console.log("\n3. 预言机状态:");
    const oracleAbi = [
      {
        inputs: [],
        name: "getBTCPrice",
        outputs: [{ type: "int256" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [{ type: "uint256" }],
        name: "getSnapshotCount",
        outputs: [{ type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    ];

    const btcPrice = await publicClient.readContract({
      address: contracts.btcOracle,
      abi: oracleAbi,
      functionName: "getBTCPrice",
    });
    console.log(`   BTC 价格: $${(Number(btcPrice) / 1e8).toFixed(2)}`);

    const snapshotCount = await publicClient.readContract({
      address: contracts.btcOracle,
      abi: oracleAbi,
      functionName: "getSnapshotCount",
      args: [1n],
    });
    console.log(`   快照次数: ${snapshotCount.toString()}`);

    // 4. 检查 vDOT 状态
    console.log("\n4. vDOT 状态:");
    const vDOTAbi = [
      {
        inputs: [],
        name: "totalSupply",
        outputs: [{ type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [{ name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    ];

    const totalSupply = await publicClient.readContract({
      address: contracts.vDOT,
      abi: vDOTAbi,
      functionName: "totalSupply",
    });
    console.log(`   总供应量: ${formatEther(totalSupply)} vDOT`);

    const userBalance = await publicClient.readContract({
      address: contracts.vDOT,
      abi: vDOTAbi,
      functionName: "balanceOf",
      args: ["0xf24FF3a9CF04c71Dbc94D0b566f7A27B94566cac"],
    });
    console.log(`   用户余额: ${formatEther(userBalance)} vDOT`);

    console.log("\n✅ 系统状态检查完成!");
    console.log("\n📋 初始化建议:");
    console.log("1. 通过前端界面创建投票期");
    console.log("2. 配置预言机参数");
    console.log("3. 添加竞争链数据");
    console.log("4. 启动监控功能");
  } catch (error) {
    console.error("❌ 检查失败:", error);
  }
}

simpleInit();
