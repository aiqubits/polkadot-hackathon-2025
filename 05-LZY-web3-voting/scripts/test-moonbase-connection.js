/**
 * 测试与 Moonbase Alpha 网络的连接和交互
 */

import { createPublicClient, http, formatEther, defineChain } from "viem";

// Moonbase Alpha 配置（直接从 chains.ts 复制）
const moonbaseAlpha = defineChain({
  id: 1287,
  name: "Moonbase Alpha",
  network: "moonbase-alpha",
  nativeCurrency: {
    decimals: 18,
    name: "DEV",
    symbol: "DEV",
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_MOONBASE_ALPHA_RPC_URL ??
          "https://rpc.api.moonbase.moonbeam.network",
      ],
      webSocket: ["wss://wss.api.moonbase.moonbeam.network"],
    },
    public: {
      http: ["https://rpc.api.moonbase.moonbeam.network"],
      webSocket: ["wss://wss.api.moonbase.moonbeam.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Moonscan",
      url: "https://moonbase.moonscan.io",
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 1850686,
    },
  },
  testnet: true,
});

// Moonbase Alpha 合约地址（直接从 contracts.ts 复制）
const MOONBASE_ALPHA_CONTRACTS = {
  vDOT: "0xD8e779Ca9D22E587f64f613dE9615c797095d225",
  StakingContract: "0xc0b279c4918F236e9d82f54DFd2e4A819c1Ce156",
  VotingTicket: "0x911896E86EC581cAD2D919247F5ae2f61F17849C",
  VotingContract: "0x0CeCa1B57D8f024c81223ABAE786C643BBBd3F8B",
  VotingNFTReward: "0xF7496a303D8D811f8A10203B5825fed9e6119b01",
  BTCOracle: "0x0bc48e6406C91448D8BE6c00AD77Cad8FaE4Fb2b",
  OmniLSAdapter: "0x0000000000000000000000000000000000000000",
};

// 创建 public client
const client = createPublicClient({
  chain: moonbaseAlpha,
  transport: http(moonbaseAlpha.rpcUrls.default.http[0], {
    retryCount: 3,
    retryDelay: 1000,
    timeout: 30000,
    fetchOptions: {
      cache: "no-store",
    },
  }),
});

// 简单的 ERC20 ABI（用于测试合约读取）
const erc20Abi = [
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

async function testMoonbaseConnection() {
  console.log("🔍 Testing Moonbase Alpha Network Connection...\n");
  console.log(`Network: ${moonbaseAlpha.name}`);
  console.log(`Chain ID: ${moonbaseAlpha.id}`);
  console.log(`RPC URL: ${moonbaseAlpha.rpcUrls.default.http[0]}\n`);

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
  };

  try {
    // Test 1: 获取链 ID
    console.log("1️⃣  Testing Chain ID...");
    try {
      const chainId = await client.getChainId();
      if (chainId === 1287) {
        console.log(`   ✅ Chain ID matches: ${chainId}\n`);
        results.passed++;
      } else {
        console.log(`   ❌ Chain ID mismatch! Expected 1287, got ${chainId}\n`);
        results.failed++;
      }
    } catch (error) {
      console.log(`   ❌ Failed to get chain ID: ${error.message}\n`);
      results.failed++;
    }

    // Test 2: 获取最新区块号
    console.log("2️⃣  Testing Block Number...");
    try {
      const blockNumber = await client.getBlockNumber();
      console.log(`   ✅ Latest block number: ${blockNumber}\n`);
      results.passed++;
    } catch (error) {
      console.log(`   ❌ Failed to get block number: ${error.message}\n`);
      results.failed++;
    }

    // Test 3: 获取区块信息
    console.log("3️⃣  Testing Block Info...");
    try {
      const blockNumber = await client.getBlockNumber();
      const block = await client.getBlock({ blockNumber });
      console.log(`   ✅ Block hash: ${block.hash}`);
      console.log(
        `   ✅ Block timestamp: ${new Date(Number(block.timestamp) * 1000).toLocaleString()}\n`,
      );
      results.passed++;
    } catch (error) {
      console.log(`   ❌ Failed to get block info: ${error.message}\n`);
      results.failed++;
    }

    // Test 4: 测试合约地址
    console.log("4️⃣  Testing Contract Addresses...");
    try {
      const contracts = MOONBASE_ALPHA_CONTRACTS;
      console.log(`   ✅ Contract addresses loaded:`);
      console.log(`      - vDOT: ${contracts.vDOT}`);
      console.log(`      - StakingContract: ${contracts.StakingContract}`);
      console.log(`      - VotingContract: ${contracts.VotingContract}`);
      console.log(`      - BTCOracle: ${contracts.BTCOracle}\n`);
      results.passed++;
    } catch (error) {
      console.log(`   ❌ Failed to get contract addresses: ${error.message}\n`);
      results.failed++;
    }

    // Test 5: 测试合约代码是否存在
    console.log("5️⃣  Testing Contract Deployment...");
    try {
      const contracts = MOONBASE_ALPHA_CONTRACTS;
      const contractNames = [
        "vDOT",
        "StakingContract",
        "VotingContract",
        "BTCOracle",
      ];

      for (const name of contractNames) {
        const address = contracts[name];
        try {
          const code = await client.getBytecode({ address });
          if (code && code !== "0x") {
            console.log(`   ✅ ${name}: Deployed at ${address}`);
          } else {
            console.log(
              `   ⚠️  ${name}: No code at ${address} (may not be deployed)`,
            );
            results.warnings++;
          }
        } catch (error) {
          console.log(
            `   ❌ ${name}: Error checking deployment - ${error.message}`,
          );
          results.failed++;
        }
      }
      console.log();
    } catch (error) {
      console.log(
        `   ❌ Failed to check contract deployment: ${error.message}\n`,
      );
      results.failed++;
    }

    // Test 6: 测试读取合约（vDOT）
    console.log("6️⃣  Testing Contract Read (vDOT)...");
    try {
      const contracts = MOONBASE_ALPHA_CONTRACTS;
      const vDOTAddress = contracts.vDOT;

      const code = await client.getBytecode({ address: vDOTAddress });
      if (code && code !== "0x") {
        try {
          const name = await client.readContract({
            address: vDOTAddress,
            abi: erc20Abi,
            functionName: "name",
          });
          const symbol = await client.readContract({
            address: vDOTAddress,
            abi: erc20Abi,
            functionName: "symbol",
          });
          const totalSupply = await client.readContract({
            address: vDOTAddress,
            abi: erc20Abi,
            functionName: "totalSupply",
          });

          console.log(`   ✅ Contract name: ${name}`);
          console.log(`   ✅ Contract symbol: ${symbol}`);
          console.log(
            `   ✅ Total supply: ${formatEther(totalSupply)} ${symbol}\n`,
          );
          results.passed++;
        } catch (error) {
          console.log(
            `   ⚠️  Contract deployed but read failed: ${error.message}\n`,
          );
          results.warnings++;
        }
      } else {
        console.log(`   ⚠️  Contract not deployed at ${vDOTAddress}\n`);
        results.warnings++;
      }
    } catch (error) {
      console.log(`   ❌ Failed to read contract: ${error.message}\n`);
      results.failed++;
    }

    // Test 7: 测试 Gas Price
    console.log("7️⃣  Testing Gas Price...");
    try {
      const gasPrice = await client.getGasPrice();
      console.log(
        `   ✅ Current gas price: ${formatEther(gasPrice)} ${moonbaseAlpha.nativeCurrency.symbol}\n`,
      );
      results.passed++;
    } catch (error) {
      console.log(`   ⚠️  Failed to get gas price: ${error.message}\n`);
      results.warnings++;
    }

    // Summary
    console.log("=".repeat(60));
    console.log("📊 Test Summary:");
    console.log(`   ✅ Passed: ${results.passed}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   ⚠️  Warnings: ${results.warnings}`);
    console.log("=".repeat(60));

    if (results.failed === 0) {
      console.log(
        "\n✅ All critical tests passed! Moonbase Alpha connection is working.\n",
      );
      return true;
    } else {
      console.log("\n❌ Some tests failed. Please check the errors above.\n");
      return false;
    }
  } catch (error) {
    console.error("\n❌ Critical error during testing:");
    console.error(error.message);
    if (error.message.includes("circuit breaker")) {
      console.error("\n💡 Tip: RPC endpoint might be temporarily unavailable.");
      console.error("   Try again later or use a different RPC endpoint.");
    }
    return false;
  }
}

// Run the test
testMoonbaseConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
