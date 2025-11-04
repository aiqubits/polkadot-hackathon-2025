import { ethers } from "hardhat";
import { Contract } from "ethers";

/**
 * 完整的XCM跨链NFT测试脚本
 * 
 * 本脚本演示了在波卡生态中使用XCM进行跨链NFT转移的完整流程：
 * 1. Moonbase Alpha (源链) -> Polkadot Hub TestNet (目标链)
 * 2. 包装NFT销毁 -> 原始NFT解锁
 * 
 * XCM (Cross-Consensus Message Format) 是波卡生态的跨链通信标准
 */

// 合约地址配置
const CONTRACT_ADDRESSES = {
  moonbaseAlpha: {
    chainId: 1287,
    xcmBridge: "0xDAdEFa39F00F60987dc1b9D6dC4776839BB52cCF",
    wrappedNFT: "0x184Ad9CF955268e44528629d3d54A4676eE93C94",
    yourCollectible: "0xA8d71101fFFc06C4c1da8700f209a57553116Dea"
  },
  polkadotHub: {
    chainId: 1000,
    xcmBridge: "0xcF0eCcaEfC1Ba660e28Db7127db6765FE389fC05",
    wrappedNFT: "0xa08125E688F14365E3614fC327b09f3b3976351C",
    yourCollectible: "0xB70435eD04461aA4a70f324ab54e22d4f19af4Ce"
  }
};

/**
 * XCM消息格式说明：
 * 
 * 在波卡生态中，XCM消息是跨链通信的标准格式，包含以下关键信息：
 * - MessageType: 消息类型（LOCK_NFT, UNLOCK_NFT, MINT_WRAPPED_NFT, BURN_WRAPPED_NFT）
 * - Origin: 消息来源链
 * - Destination: 消息目标链
 * - Assets: 涉及的资产信息
 * - Instructions: 具体的执行指令
 * 
 * 对于NFT跨链转移，XCM消息结构如下：
 */
interface XCMNFTMessage {
  messageType: "LOCK_NFT" | "UNLOCK_NFT" | "MINT_WRAPPED_NFT" | "BURN_WRAPPED_NFT";
  nftContract: string;
  tokenId: number;
  recipient: string;
  sourceChainId: number;
  destinationChainId: number;
  messageHash: string;
  tokenURI: string;
  timestamp: number;
}

async function main() {
  console.log("🚀 开始完整的XCM跨链NFT测试流程");
  console.log("=" .repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("测试账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // 获取当前网络信息
  const network = await ethers.provider.getNetwork();
  const currentChainId = Number(network.chainId);
  console.log("当前网络链ID:", currentChainId);

  let sourceConfig, targetConfig;
  if (currentChainId === 1287) {
    sourceConfig = CONTRACT_ADDRESSES.moonbaseAlpha;
    targetConfig = CONTRACT_ADDRESSES.polkadotHub;
    console.log("📍 当前在 Moonbase Alpha，目标链为 Polkadot Hub TestNet");
  } else if (currentChainId === 1000) {
    sourceConfig = CONTRACT_ADDRESSES.polkadotHub;
    targetConfig = CONTRACT_ADDRESSES.moonbaseAlpha;
    console.log("📍 当前在 Polkadot Hub TestNet，目标链为 Moonbase Alpha");
  } else {
    throw new Error(`不支持的网络链ID: ${currentChainId}`);
  }

  console.log("\\n" + "=".repeat(60));
  console.log("🔗 第一步：XCM跨链消息格式验证");
  console.log("=".repeat(60));

  // 获取合约实例
  const xcmBridge = await ethers.getContractAt("XCMBridgeV2", sourceConfig.xcmBridge);
  const nftContract = await ethers.getContractAt("YourCollectible", sourceConfig.yourCollectible);

  // 检查NFT合约授权状态
  console.log("\\n📋 检查NFT合约授权状态...");
  try {
    const isAuthorized = await xcmBridge.isContractAuthorized(sourceConfig.yourCollectible);
    console.log("NFT合约授权状态:", isAuthorized ? "✅ 已授权" : "❌ 未授权");
    
    if (!isAuthorized) {
      console.log("正在授权NFT合约...");
      const authTx = await xcmBridge.setContractAuthorization(sourceConfig.yourCollectible, true);
      await authTx.wait();
      console.log("✅ NFT合约授权成功");
    }
  } catch (error) {
    console.log("⚠️ 检查授权状态失败:", error.message);
  }

  // 检查现有NFT
  console.log("\\n🎨 检查现有NFT...");
  try {
    const totalSupply = await nftContract.totalSupply();
    console.log("NFT总供应量:", totalSupply.toString());

    if (totalSupply > 0) {
      const tokenId = await nftContract.tokenByIndex(0);
      const owner = await nftContract.ownerOf(tokenId);
      const tokenURI = await nftContract.tokenURI(tokenId);
      
      console.log("找到NFT #" + tokenId.toString());
      console.log("所有者:", owner);
      console.log("TokenURI:", tokenURI);

      // 演示XCM消息格式
      console.log("\\n" + "=".repeat(60));
      console.log("📨 XCM消息格式演示");
      console.log("=".repeat(60));

      const xcmMessage: XCMNFTMessage = {
        messageType: "LOCK_NFT",
        nftContract: sourceConfig.yourCollectible,
        tokenId: Number(tokenId),
        recipient: deployer.address,
        sourceChainId: sourceConfig.chainId,
        destinationChainId: targetConfig.chainId,
        messageHash: ethers.keccak256(
          ethers.solidityPacked(
            ["address", "uint256", "address", "uint32", "uint32", "uint256"],
            [sourceConfig.yourCollectible, tokenId, deployer.address, sourceConfig.chainId, targetConfig.chainId, Date.now()]
          )
        ),
        tokenURI: tokenURI,
        timestamp: Math.floor(Date.now() / 1000)
      };

      console.log("\\n🔗 XCM跨链消息结构:");
      console.log(JSON.stringify(xcmMessage, null, 2));

      console.log("\\n" + "=".repeat(60));
      console.log("🌉 波卡XCM跨链机制说明");
      console.log("=".repeat(60));
      
      console.log(`
📡 XCM (Cross-Consensus Message Format) 跨链通信机制：

1. 🏗️ 消息构建阶段：
   - 源链构建XCM消息，包含NFT转移指令
   - 消息包含目标链信息、资产详情、执行指令
   - 生成唯一的消息哈希用于追踪

2. 🚀 消息发送阶段：
   - 通过XCMP (Cross-Chain Message Passing) 发送消息
   - 消息在波卡中继链上排队等待处理
   - 中继链验证消息格式和权限

3. 📥 消息接收阶段：
   - 目标链接收并验证XCM消息
   - 解析消息内容，提取NFT转移指令
   - 执行相应的智能合约调用

4. ✅ 消息执行阶段：
   - 在目标链上铸造包装NFT
   - 更新跨链状态记录
   - 发出执行完成事件

🔄 完整的跨链NFT流程：

Moonbase Alpha (源链)          Polkadot Hub TestNet (目标链)
     │                                    │
     ├─ 1. 锁定原始NFT                     │
     ├─ 2. 发送XCM消息 ──────────────────→ ├─ 3. 接收XCM消息
     │                                    ├─ 4. 铸造包装NFT
     │                                    │
     │    ← ─ ─ ─ ─ ─ 用户操作 ─ ─ ─ ─ ─ ─ │
     │                                    │
     ├─ 7. 接收解锁消息                    │
     ├─ 8. 解锁原始NFT    ←──────────────── ├─ 5. 销毁包装NFT
     │                                    ├─ 6. 发送解锁消息

🛡️ 安全机制：
- 消息哈希防重放攻击
- 多重签名验证
- 状态一致性检查
- 超时和回滚机制
      `);

      // 如果当前账户是NFT所有者，演示锁定流程
      if (owner.toLowerCase() === deployer.address.toLowerCase()) {
        console.log("\\n" + "=".repeat(60));
        console.log("🔒 演示NFT锁定和XCM消息发送");
        console.log("=".repeat(60));

        // 检查NFT授权
        const approved = await nftContract.getApproved(tokenId);
        if (approved.toLowerCase() !== sourceConfig.xcmBridge.toLowerCase()) {
          console.log("正在授权NFT给XCMBridge...");
          const approveTx = await nftContract.approve(sourceConfig.xcmBridge, tokenId);
          await approveTx.wait();
          console.log("✅ NFT授权成功");
        }

        console.log("\\n🚀 发送跨链锁定交易...");
        try {
          const lockTx = await xcmBridge.lockNFTAndSendMessage(
            sourceConfig.yourCollectible,
            tokenId,
            targetConfig.chainId
          );
          
          console.log("交易哈希:", lockTx.hash);
          console.log("等待交易确认...");
          
          const receipt = await lockTx.wait();
          console.log("✅ 交易确认成功！");
          console.log("Gas使用量:", receipt.gasUsed.toString());

          // 解析事件
          const events = receipt.logs;
          for (const event of events) {
            try {
              const parsedEvent = xcmBridge.interface.parseLog(event);
              if (parsedEvent) {
                console.log("\\n📋 事件:", parsedEvent.name);
                console.log("参数:", parsedEvent.args);
              }
            } catch (e) {
              // 忽略无法解析的事件
            }
          }

        } catch (error) {
          console.log("❌ 锁定交易失败:", error.message);
        }
      } else {
        console.log("\\n⚠️ 当前账户不是NFT所有者，跳过锁定演示");
        console.log("NFT所有者:", owner);
        console.log("当前账户:", deployer.address);
      }
    } else {
      console.log("❌ 没有找到现有NFT");
    }
  } catch (error) {
    console.log("❌ 检查NFT失败:", error.message);
  }

  console.log("\\n" + "=".repeat(60));
  console.log("📚 XCM跨链操作指南");
  console.log("=".repeat(60));
  
  console.log(`
🎯 在目标链上的操作步骤：

1. 切换到目标链网络 (${targetConfig.chainId === 1000 ? 'Polkadot Hub TestNet' : 'Moonbase Alpha'})
2. 调用 processXCMMessage() 处理跨链消息
3. 自动铸造包装NFT给指定接收者
4. 用户可以在目标链上使用包装NFT

🔄 返回源链的操作步骤：

1. 在目标链上调用 burnWrappedNFTAndUnlock()
2. 销毁包装NFT并发送解锁消息
3. 切换回源链网络
4. 调用 processXCMMessage() 处理解锁消息
5. 原始NFT自动解锁给原始所有者

💡 重要提示：
- XCM消息需要在两个链之间手动中继（在测试环境中）
- 生产环境中，XCM消息会通过波卡中继链自动传递
- 每个操作都会生成唯一的消息哈希用于追踪
- 确保在操作前检查网络连接和账户余额
  `);

  console.log("\\n🎉 XCM跨链NFT测试完成！");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 测试失败:", error);
    process.exit(1);
  });