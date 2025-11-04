/**
 * 简单的铸造测试脚本
 * 使用 eth_sendTransaction 直接与 PolkaVM 链交互
 */

import { ethers } from "ethers";

// 配置
const RPC_URL = "http://127.0.0.1:8545";
const VDOT_ADDRESS = "0x82745827D0B8972eC0583B3100eCb30b81Db0072";
const ACCOUNT_ADDRESS = "0xf24FF3a9CF04c71Dbc94D0b566f7A27B94566cac";

// 创建 provider
const provider = new ethers.JsonRpcProvider(RPC_URL);

async function testMint() {
  console.log("🧪 测试铸造 vDOT\n");

  try {
    // 1. 查询初始状态
    console.log("📊 查询初始状态...");
    const ethBalance = await provider.getBalance(ACCOUNT_ADDRESS);
    console.log(`账户 ETH 余额: ${ethers.formatEther(ethBalance)} ETH\n`);

    // 2. 准备交易
    const amount = ethers.parseEther("0.001"); // 0.001 ETH
    console.log(`准备铸造: ${ethers.formatEther(amount)} ETH\n`);

    // 3. 尝试方法 1: 直接发送 ETH (触发 receive 函数)
    console.log("方法 1: 直接发送 ETH 到合约地址");
    try {
      const tx1 = {
        from: ACCOUNT_ADDRESS,
        to: VDOT_ADDRESS,
        value: "0x" + amount.toString(16),
        gas: "0x186a0", // 100000
        gasPrice: "0x1", // 1 wei
      };

      console.log("交易参数:", JSON.stringify(tx1, null, 2));
      const hash1 = await provider.send("eth_sendTransaction", [tx1]);
      console.log(`✅ 交易已发送: ${hash1}\n`);
    } catch (error) {
      console.log(`❌ 方法 1 失败: ${error.message}\n`);
    }

    // 4. 尝试方法 2: 调用 deposit() 函数
    console.log("方法 2: 调用 deposit() 函数");
    try {
      const depositData = "0xd0e30db0"; // deposit() 函数选择器
      const tx2 = {
        from: ACCOUNT_ADDRESS,
        to: VDOT_ADDRESS,
        data: depositData,
        value: "0x" + amount.toString(16),
        gas: "0x186a0", // 100000
        gasPrice: "0x1", // 1 wei
      };

      console.log("交易参数:", JSON.stringify(tx2, null, 2));
      const hash2 = await provider.send("eth_sendTransaction", [tx2]);
      console.log(`✅ 交易已发送: ${hash2}\n`);
    } catch (error) {
      console.log(`❌ 方法 2 失败: ${error.message}\n`);
    }

    // 5. 尝试方法 3: 使用 eth_call 测试
    console.log("方法 3: 使用 eth_call 测试合约调用");
    try {
      const result = await provider.send("eth_call", [
        {
          from: ACCOUNT_ADDRESS,
          to: VDOT_ADDRESS,
          data: "0xd0e30db0",
          value: "0x" + amount.toString(16),
        },
        "latest",
      ]);
      console.log(`✅ eth_call 成功: ${result}\n`);
    } catch (error) {
      console.log(`❌ 方法 3 失败: ${error.message}\n`);
    }

    // 6. 检查合约状态
    console.log("📊 检查合约状态...");
    const vDOTABI = ["function paused() external view returns (bool)"];
    const contract = new ethers.Contract(VDOT_ADDRESS, vDOTABI, provider);
    const isPaused = await contract.paused();
    console.log(`合约暂停状态: ${isPaused ? "已暂停" : "运行中"}\n`);
  } catch (error) {
    console.error("❌ 测试失败:", error);
  }
}

// 运行测试
testMint().catch(console.error);
