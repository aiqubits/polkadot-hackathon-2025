/**
 * 测试与 PolkaVM 本地链上的智能合约交互
 *
 * 功能：
 * 1. 查询合约状态
 * 2. 铸造 vDOT 代币
 * 3. 查询余额
 * 4. 赎回 ETH
 */

import { ethers } from "ethers";

// 配置
const CONFIG = {
  rpcUrl: "http://127.0.0.1:8545",
  chainId: 31337,
  // 从链上获取的账户地址
  accountAddress: "0xf24FF3a9CF04c71Dbc94D0b566f7A27B94566cac",
  // 合约地址
  contracts: {
    vDOT: "0x82745827D0B8972eC0583B3100eCb30b81Db0072",
    StakingContract: "0xe78A45427B4797ae9b1852427476A956037B5bC2",
    VotingTicket: "0x38762083399e60af42e6fD694e7d430a170c9Caf",
    VotingContract: "0x7acc1aC65892CF3547b1b0590066FB93199b430D",
    VotingNFTReward: "0xab7785d56697E65c2683c8121Aac93D3A028Ba95",
    BTCOracle: "0x85b108660f47caDfAB9e0503104C08C1c96e0DA9",
  },
};

// vDOT 合约 ABI (简化版，只包含需要的函数)
const vDOT_ABI = [
  "function deposit() external payable",
  "function withdraw(uint256 amount) external",
  "function balanceOf(address account) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function getContractBalance() external view returns (uint256)",
  "function paused() external view returns (bool)",
  "event Deposit(address indexed user, uint256 amount)",
  "event Withdraw(address indexed user, uint256 amount)",
];

// 创建 provider
const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl, {
  chainId: CONFIG.chainId,
  name: "PolkaVM Local",
});

// 创建合约实例
const vDOTContract = new ethers.Contract(
  CONFIG.contracts.vDOT,
  vDOT_ABI,
  provider,
);

// 工具函数：格式化余额
function formatBalance(balance) {
  return ethers.formatEther(balance);
}

// 工具函数：解析金额
function parseAmount(amount) {
  return ethers.parseEther(amount.toString());
}

// 1. 查询合约状态
async function queryContractState() {
  console.log("\n=== 📊 查询合约状态 ===\n");

  try {
    // 检查合约是否暂停
    const isPaused = await vDOTContract.paused();
    console.log(`合约状态: ${isPaused ? "⏸️  已暂停" : "✅ 运行中"}`);

    // 查询总供应量
    const totalSupply = await vDOTContract.totalSupply();
    console.log(`vDOT 总供应量: ${formatBalance(totalSupply)} vDOT`);

    // 查询合约 ETH 余额
    const contractBalance = await vDOTContract.getContractBalance();
    console.log(`合约 ETH 余额: ${formatBalance(contractBalance)} ETH`);

    // 查询账户 ETH 余额
    const ethBalance = await provider.getBalance(CONFIG.accountAddress);
    console.log(`账户 ETH 余额: ${formatBalance(ethBalance)} ETH`);

    // 查询账户 vDOT 余额
    const vDOTBalance = await vDOTContract.balanceOf(CONFIG.accountAddress);
    console.log(`账户 vDOT 余额: ${formatBalance(vDOTBalance)} vDOT`);

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

// 2. 铸造 vDOT (使用 eth_sendTransaction)
async function mintVDOT(amount) {
  console.log(`\n=== 🪙 铸造 ${amount} vDOT ===\n`);

  try {
    const amountWei = parseAmount(amount);
    console.log(`发送金额: ${amount} ETH (${amountWei.toString()} wei)`);

    // 准备交易数据
    const txData = {
      from: CONFIG.accountAddress,
      to: CONFIG.contracts.vDOT,
      value: "0x" + amountWei.toString(16),
      gas: "0x186a0", // 100000
      gasPrice: "0x1", // 1 wei
    };

    console.log("交易参数:", JSON.stringify(txData, null, 2));

    // 发送交易
    const txHash = await provider.send("eth_sendTransaction", [txData]);
    console.log(`✅ 交易已发送: ${txHash}`);

    // 等待交易确认
    console.log("⏳ 等待交易确认...");
    const receipt = await provider.waitForTransaction(txHash);
    console.log(`✅ 交易已确认! Gas 使用: ${receipt.gasUsed.toString()}`);

    return receipt;
  } catch (error) {
    console.error("❌ 铸造失败:", error.message);
    if (error.data) {
      console.error("错误详情:", error.data);
    }
    throw error;
  }
}

// 3. 铸造 vDOT (使用 deposit 函数)
async function mintVDOTWithFunction(amount, privateKey) {
  console.log(`\n=== 🪙 使用 deposit() 铸造 ${amount} vDOT ===\n`);

  try {
    // 创建 wallet
    const wallet = new ethers.Wallet(privateKey, provider);
    const vDOTWithSigner = vDOTContract.connect(wallet);

    const amountWei = parseAmount(amount);
    console.log(`发送金额: ${amount} ETH`);

    // 调用 deposit 函数
    const tx = await vDOTWithSigner.deposit({
      value: amountWei,
      gasLimit: 100000,
      gasPrice: 1,
    });

    console.log(`✅ 交易已发送: ${tx.hash}`);

    // 等待确认
    console.log("⏳ 等待交易确认...");
    const receipt = await tx.wait();
    console.log(`✅ 交易已确认! Gas 使用: ${receipt.gasUsed.toString()}`);

    // 解析事件
    const depositEvent = receipt.logs
      .map((log) => {
        try {
          return vDOTContract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((event) => event && event.name === "Deposit");

    if (depositEvent) {
      console.log(
        `📢 Deposit 事件: 用户 ${depositEvent.args.user}, 金额 ${formatBalance(depositEvent.args.amount)} ETH`,
      );
    }

    return receipt;
  } catch (error) {
    console.error("❌ 铸造失败:", error.message);
    throw error;
  }
}

// 4. 赎回 ETH
async function redeemETH(amount, privateKey) {
  console.log(`\n=== 💰 赎回 ${amount} ETH ===\n`);

  try {
    // 创建 wallet
    const wallet = new ethers.Wallet(privateKey, provider);
    const vDOTWithSigner = vDOTContract.connect(wallet);

    const amountWei = parseAmount(amount);
    console.log(`赎回金额: ${amount} vDOT`);

    // 调用 withdraw 函数
    const tx = await vDOTWithSigner.withdraw(amountWei, {
      gasLimit: 150000,
      gasPrice: 1,
    });

    console.log(`✅ 交易已发送: ${tx.hash}`);

    // 等待确认
    console.log("⏳ 等待交易确认...");
    const receipt = await tx.wait();
    console.log(`✅ 交易已确认! Gas 使用: ${receipt.gasUsed.toString()}`);

    // 解析事件
    const withdrawEvent = receipt.logs
      .map((log) => {
        try {
          return vDOTContract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((event) => event && event.name === "Withdraw");

    if (withdrawEvent) {
      console.log(
        `📢 Withdraw 事件: 用户 ${withdrawEvent.args.user}, 金额 ${formatBalance(withdrawEvent.args.amount)} ETH`,
      );
    }

    return receipt;
  } catch (error) {
    console.error("❌ 赎回失败:", error.message);
    throw error;
  }
}

// 5. 监听事件
async function listenToEvents() {
  console.log("\n=== 👂 监听合约事件 ===\n");

  // 监听 Deposit 事件
  vDOTContract.on("Deposit", (user, amount, event) => {
    console.log(`\n📢 新的 Deposit 事件:`);
    console.log(`  用户: ${user}`);
    console.log(`  金额: ${formatBalance(amount)} ETH`);
    console.log(`  区块: ${event.log.blockNumber}`);
    console.log(`  交易: ${event.log.transactionHash}`);
  });

  // 监听 Withdraw 事件
  vDOTContract.on("Withdraw", (user, amount, event) => {
    console.log(`\n📢 新的 Withdraw 事件:`);
    console.log(`  用户: ${user}`);
    console.log(`  金额: ${formatBalance(amount)} ETH`);
    console.log(`  区块: ${event.log.blockNumber}`);
    console.log(`  交易: ${event.log.transactionHash}`);
  });

  console.log("✅ 事件监听已启动");
}

// 6. 查询历史事件
async function queryHistoricalEvents(fromBlock = 0) {
  console.log(`\n=== 📜 查询历史事件 (从区块 ${fromBlock}) ===\n`);

  try {
    // 查询 Deposit 事件
    const depositFilter = vDOTContract.filters.Deposit();
    const deposits = await vDOTContract.queryFilter(depositFilter, fromBlock);
    console.log(`找到 ${deposits.length} 个 Deposit 事件:`);
    deposits.forEach((event, index) => {
      console.log(
        `  ${index + 1}. 用户: ${event.args.user}, 金额: ${formatBalance(event.args.amount)} ETH, 区块: ${event.blockNumber}`,
      );
    });

    // 查询 Withdraw 事件
    const withdrawFilter = vDOTContract.filters.Withdraw();
    const withdrawals = await vDOTContract.queryFilter(
      withdrawFilter,
      fromBlock,
    );
    console.log(`\n找到 ${withdrawals.length} 个 Withdraw 事件:`);
    withdrawals.forEach((event, index) => {
      console.log(
        `  ${index + 1}. 用户: ${event.args.user}, 金额: ${formatBalance(event.args.amount)} ETH, 区块: ${event.blockNumber}`,
      );
    });
  } catch (error) {
    console.error("❌ 查询失败:", error.message);
    throw error;
  }
}

// 主函数
async function main() {
  console.log("🚀 开始与 PolkaVM 本地链交互\n");
  console.log(`RPC URL: ${CONFIG.rpcUrl}`);
  console.log(`Chain ID: ${CONFIG.chainId}`);
  console.log(`vDOT 合约: ${CONFIG.contracts.vDOT}\n`);

  try {
    // 1. 查询合约状态
    await queryContractState();

    // 2. 查询历史事件
    await queryHistoricalEvents();

    // 3. 如果你有私钥，可以执行交易
    // 注意：这里需要你提供私钥
    const PRIVATE_KEY = process.env.PRIVATE_KEY;

    if (PRIVATE_KEY) {
      console.log("\n✅ 检测到私钥，可以执行交易操作");

      // 取消注释以下代码来执行交易
      // await mintVDOTWithFunction("0.1", PRIVATE_KEY);
      // await queryContractState();
      // await redeemETH("0.1", PRIVATE_KEY);
    } else {
      console.log("\n⚠️  未提供私钥，跳过交易操作");
      console.log("提示: 设置环境变量 PRIVATE_KEY 来执行交易");
    }

    // 4. 启动事件监听（可选）
    // await listenToEvents();
    // console.log("\n按 Ctrl+C 停止监听...");

    console.log("\n✅ 测试完成!");
  } catch (error) {
    console.error("\n❌ 测试失败:", error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
main().catch((error) => {
  console.error(error);
  process.exit(1);
});

// 导出函数供其他脚本使用
export {
  queryContractState,
  mintVDOT,
  mintVDOTWithFunction,
  redeemETH,
  listenToEvents,
  queryHistoricalEvents,
  vDOTContract,
  provider,
};
