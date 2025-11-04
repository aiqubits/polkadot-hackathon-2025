/**
 * 测试新部署的合约
 */

import { createPublicClient, http, formatEther } from "viem";

const RPC_URL = "http://127.0.0.1:8545";
const CHAIN_ID = 420420420;

// 新的合约地址
const NEW_CONTRACTS = {
  vDOT: "0x3ed62137c5DB927cb137c26455969116BF0c23Cb",
  StakingContract: "0x598efcBD0B5b4Fd0142bEAae1a38f6Bd4d8a218d",
  VotingTicket: "0x21cb3940e6Ba5284E1750F1109131a8E8062b9f1",
  VotingContract: "0x9c1da847B31C0973F26b1a2A3d5c04365a867703",
  VotingNFTReward: "0x7d4567B7257cf869B01a47E8cf0EDB3814bDb963",
  BTCOracle: "0x527FC4060Ac7Bf9Cd19608EDEeE8f09063A16cd4",
  MockPriceFeed: "0x5CC307268a1393AB9A764A20DACE848AB8275c46",
};

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

async function testNewContracts() {
  console.log("🔍 测试新部署的合约...\n");

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

    // 2. 检查所有合约部署状态
    console.log("2. 合约部署状态:");
    for (const [name, address] of Object.entries(NEW_CONTRACTS)) {
      const code = await publicClient.getCode({ address });
      const isDeployed = code !== "0x";
      console.log(
        `   ${name}: ${isDeployed ? "✅ 已部署" : "❌ 未部署"} (${address})`,
      );
    }

    // 3. 测试 vDOT 合约
    console.log("\n3. 测试 vDOT 合约:");
    const vDOTAbi = [
      {
        inputs: [],
        name: "totalSupply",
        outputs: [{ type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "name",
        outputs: [{ type: "string" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "symbol",
        outputs: [{ type: "string" }],
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

    try {
      const totalSupply = await publicClient.readContract({
        address: NEW_CONTRACTS.vDOT,
        abi: vDOTAbi,
        functionName: "totalSupply",
      });
      console.log(`   总供应量: ${formatEther(totalSupply)} vDOT`);

      const name = await publicClient.readContract({
        address: NEW_CONTRACTS.vDOT,
        abi: vDOTAbi,
        functionName: "name",
      });
      console.log(`   代币名称: ${name}`);

      const symbol = await publicClient.readContract({
        address: NEW_CONTRACTS.vDOT,
        abi: vDOTAbi,
        functionName: "symbol",
      });
      console.log(`   代币符号: ${symbol}`);

      const userBalance = await publicClient.readContract({
        address: NEW_CONTRACTS.vDOT,
        abi: vDOTAbi,
        functionName: "balanceOf",
        args: ["0xf24FF3a9CF04c71Dbc94D0b566f7A27B94566cac"],
      });
      console.log(`   用户余额: ${formatEther(userBalance)} vDOT`);
    } catch (error) {
      console.log(`   ❌ vDOT 合约测试失败: ${error.message}`);
    }

    // 4. 测试 BTCOracle 合约
    console.log("\n4. 测试 BTCOracle 合约:");
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

    try {
      const btcPrice = await publicClient.readContract({
        address: NEW_CONTRACTS.BTCOracle,
        abi: oracleAbi,
        functionName: "getBTCPrice",
      });
      console.log(`   BTC 价格: $${(Number(btcPrice) / 1e8).toFixed(2)}`);

      const snapshotCount = await publicClient.readContract({
        address: NEW_CONTRACTS.BTCOracle,
        abi: oracleAbi,
        functionName: "getSnapshotCount",
        args: [1n],
      });
      console.log(`   快照次数: ${snapshotCount.toString()}`);
    } catch (error) {
      console.log(`   ❌ BTCOracle 合约测试失败: ${error.message}`);
    }

    // 5. 测试 MockPriceFeed 合约
    console.log("\n5. 测试 MockPriceFeed 合约:");
    const priceFeedAbi = [
      {
        inputs: [],
        name: "latestRoundData",
        outputs: [
          { type: "uint80" },
          { type: "int256" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint80" },
        ],
        stateMutability: "view",
        type: "function",
      },
    ];

    try {
      const priceData = await publicClient.readContract({
        address: NEW_CONTRACTS.MockPriceFeed,
        abi: priceFeedAbi,
        functionName: "latestRoundData",
      });
      console.log(`   价格数据: $${(Number(priceData[1]) / 1e8).toFixed(2)}`);
      console.log(
        `   更新时间: ${new Date(Number(priceData[3]) * 1000).toLocaleString()}`,
      );
    } catch (error) {
      console.log(`   ❌ MockPriceFeed 合约测试失败: ${error.message}`);
    }

    console.log("\n✅ 新合约测试完成!");
  } catch (error) {
    console.error("❌ 测试失败:", error);
  }
}

testNewContracts();
