/**
 * 手动触发市场快照
 * 尝试激活开奖监控面板
 */

import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const RPC_URL = "http://127.0.0.1:8545";
const CHAIN_ID = 420420420;
const PRIVATE_KEY =
  "0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133";

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

async function triggerSnapshot() {
  console.log("📸 尝试触发市场快照...\n");

  try {
    // 1. 检查当前状态
    console.log("1. 检查当前状态:");
    const snapshotCount = await publicClient.readContract({
      address: "0x527FC4060Ac7Bf9Cd19608EDEeE8f09063A16cd4",
      abi: [
        {
          inputs: [{ type: "uint256" }],
          name: "getSnapshotCount",
          outputs: [{ type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "getSnapshotCount",
      args: [1n],
    });
    console.log(`   当前快照次数: ${snapshotCount.toString()}`);

    // 2. 尝试触发快照
    console.log("\n2. 触发市场快照:");
    try {
      const snapshotTx = await walletClient.writeContract({
        address: "0x527FC4060Ac7Bf9Cd19608EDEeE8f09063A16cd4",
        abi: [
          {
            inputs: [{ type: "uint256" }],
            name: "takeMarketSnapshot",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        functionName: "takeMarketSnapshot",
        args: [1n],
        gas: 500000n,
        gasPrice: 10000n,
      });
      console.log(`   快照交易哈希: ${snapshotTx}`);
      console.log("   ✅ 快照触发成功");

      // 等待交易确认
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // 检查新的快照数量
      const newSnapshotCount = await publicClient.readContract({
        address: "0x527FC4060Ac7Bf9Cd19608EDEeE8f09063A16cd4",
        abi: [
          {
            inputs: [{ type: "uint256" }],
            name: "getSnapshotCount",
            outputs: [{ type: "uint256" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        functionName: "getSnapshotCount",
        args: [1n],
      });
      console.log(`   新的快照次数: ${newSnapshotCount.toString()}`);

      if (newSnapshotCount > snapshotCount) {
        console.log("   🎉 快照成功！开奖监控面板应该有数据了");
      } else {
        console.log("   ⚠️ 快照可能失败，请检查交易状态");
      }
    } catch (error) {
      console.log(`   ❌ 快照触发失败: ${error.message}`);

      if (error.message.includes("Invalid Transaction")) {
        console.log("   💡 建议: 可能需要先创建投票期或配置预言机参数");
      }
    }

    // 3. 检查面板数据
    console.log("\n3. 检查面板数据:");
    const finalSnapshotCount = await publicClient.readContract({
      address: "0x527FC4060Ac7Bf9Cd19608EDEeE8f09063A16cd4",
      abi: [
        {
          inputs: [{ type: "uint256" }],
          name: "getSnapshotCount",
          outputs: [{ type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "getSnapshotCount",
      args: [1n],
    });

    if (finalSnapshotCount > 0n) {
      console.log("   ✅ 面板应该有数据了:");
      console.log("   - 最近一次检查: 有数据");
      console.log("   - 下一次检查: 有数据");
      console.log(`   - 快照次数: ${finalSnapshotCount.toString()}次`);
    } else {
      console.log("   ❌ 面板仍然没有数据");
      console.log("   💡 可能需要:");
      console.log("   1. 先创建投票期");
      console.log("   2. 配置预言机参数");
      console.log("   3. 添加竞争链数据");
    }
  } catch (error) {
    console.error("❌ 操作失败:", error);
  }
}

triggerSnapshot();
