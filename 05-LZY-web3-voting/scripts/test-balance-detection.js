/**
 * 测试余额检测问题
 */

import { createPublicClient, http, formatEther } from "viem";

const RPC_URL = "http://127.0.0.1:8545";
const CHAIN_ID = 420420420; // PolkaVM Chain ID
const ACCOUNT_ADDRESS = "0xf24FF3a9CF04c71Dbc94D0b566f7A27B94566cac";

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

async function testBalanceDetection() {
  console.log("🔍 测试余额检测问题\n");

  try {
    // 1. 直接查询余额
    console.log("1. 直接查询余额:");
    const balance = await publicClient.getBalance({
      address: ACCOUNT_ADDRESS,
    });
    console.log(`   余额: ${formatEther(balance)} PVM`);
    console.log(`   原始值: ${balance.toString()}\n`);

    // 2. 检查链 ID
    console.log("2. 检查链 ID:");
    const chainId = await publicClient.getChainId();
    console.log(`   链 ID: ${chainId}`);
    console.log(`   预期: ${CHAIN_ID}`);
    console.log(`   匹配: ${chainId === CHAIN_ID ? "✅" : "❌"}\n`);

    // 3. 检查网络信息
    console.log("3. 检查网络信息:");
    try {
      const block = await publicClient.getBlock();
      console.log(`   最新区块: ${block.number}`);
      console.log(
        `   时间戳: ${new Date(Number(block.timestamp) * 1000).toLocaleString()}`,
      );
    } catch (error) {
      console.log(`   ❌ 获取区块信息失败: ${error.message}`);
    }

    // 4. 测试 eth_getBalance RPC 调用
    console.log("\n4. 测试 eth_getBalance RPC 调用:");
    try {
      const response = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_getBalance",
          params: [ACCOUNT_ADDRESS, "latest"],
          id: 1,
        }),
      });

      const data = await response.json();
      if (data.result) {
        const balanceHex = data.result;
        const balanceWei = BigInt(balanceHex);
        console.log(`   RPC 余额: ${formatEther(balanceWei)} PVM`);
        console.log(`   十六进制: ${balanceHex}`);
      } else {
        console.log(
          `   ❌ RPC 调用失败: ${data.error?.message || "Unknown error"}`,
        );
      }
    } catch (error) {
      console.log(`   ❌ RPC 调用异常: ${error.message}`);
    }

    // 5. 检查前端可能的问题
    console.log("\n5. 前端可能的问题:");
    console.log("   - Chain ID 不匹配: 前端可能使用 31337，实际是 420420420");
    console.log("   - 钱包连接问题: 钱包可能连接到错误的链");
    console.log("   - 缓存问题: 浏览器可能缓存了旧的链信息");
    console.log("   - 代币符号: 前端可能期望 ETH，但链使用 PVM");

    console.log("\n✅ 余额检测测试完成!");
  } catch (error) {
    console.error("❌ 测试失败:", error);
  }
}

// 运行测试
testBalanceDetection();
