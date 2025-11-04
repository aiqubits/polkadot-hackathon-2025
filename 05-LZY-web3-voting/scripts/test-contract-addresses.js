/**
 * 测试合约地址配置
 */

import { createPublicClient, http } from "viem";

const RPC_URL = "http://127.0.0.1:8545";
const CHAIN_ID = 420420420; // PolkaVM Chain ID

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

// 合约地址（从 contracts.ts 复制）
const CONTRACTS = {
  vDOT: "0x82745827D0B8972eC0583B3100eCb30b81Db0072",
  StakingContract: "0xe78A45427B4797ae9b1852427476A956037B5bC2",
  VotingTicket: "0x38762083399e60af42e6fD694e7d430a170c9Caf",
  VotingContract: "0x7acc1aC65892CF3547b1b0590066FB93199b430D",
  VotingNFTReward: "0xab7785d56697E65c2683c8121Aac93D3A028Ba95",
  BTCOracle: "0x85b108660f47caDfAB9e0503104C08C1c96e0DA9",
};

// vDOT ABI (简化版)
const vDOT_ABI = [
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
];

async function testContractAddresses() {
  console.log("🔍 测试合约地址配置\n");

  try {
    // 1. 检查链 ID
    console.log("1. 检查链 ID:");
    const chainId = await publicClient.getChainId();
    console.log(`   当前链 ID: ${chainId}`);
    console.log(`   预期链 ID: ${CHAIN_ID}`);
    console.log(`   匹配: ${chainId === CHAIN_ID ? "✅" : "❌"}\n`);

    // 2. 测试每个合约地址
    for (const [name, address] of Object.entries(CONTRACTS)) {
      console.log(`2. 测试 ${name} 合约 (${address}):`);

      try {
        // 检查合约代码
        const code = await publicClient.getCode({ address });
        const hasCode = code !== "0x";
        console.log(`   合约代码: ${hasCode ? "✅ 已部署" : "❌ 未部署"}`);

        if (hasCode && name === "vDOT") {
          // 测试 vDOT 合约函数
          try {
            const totalSupply = await publicClient.readContract({
              address,
              abi: vDOT_ABI,
              functionName: "totalSupply",
            });
            console.log(`   totalSupply(): ${totalSupply.toString()} ✅`);
          } catch (error) {
            console.log(`   totalSupply(): ❌ ${error.message}`);
          }

          try {
            const name = await publicClient.readContract({
              address,
              abi: vDOT_ABI,
              functionName: "name",
            });
            console.log(`   name(): "${name}" ✅`);
          } catch (error) {
            console.log(`   name(): ❌ ${error.message}`);
          }

          try {
            const symbol = await publicClient.readContract({
              address,
              abi: vDOT_ABI,
              functionName: "symbol",
            });
            console.log(`   symbol(): "${symbol}" ✅`);
          } catch (error) {
            console.log(`   symbol(): ❌ ${error.message}`);
          }
        }
      } catch (error) {
        console.log(`   ❌ 检查失败: ${error.message}`);
      }

      console.log("");
    }

    console.log("✅ 合约地址测试完成!");
  } catch (error) {
    console.error("❌ 测试失败:", error);
  }
}

// 运行测试
testContractAddresses();
