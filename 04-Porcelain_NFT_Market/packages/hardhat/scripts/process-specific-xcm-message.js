const { ethers } = require("hardhat");

async function main() {
  console.log("🔄 处理特定XCM消息...\n");

  // 用户提供的消息哈希
  const messageHash = "0x0fb2b81cc910925b61045250d33c1b8d25906ef9cc10ac0dfa258bca94c2de6c";
  
  // 合约地址配置
  const contractAddresses = {
    moonbaseAlpha: {
      XCMBridge: "0x1519c05ABD62bdcc2adf7c9028Dc0260755B021a",
      YourCollectible: "0xA8d71101fFFc06C4c1da8700f209a57553116Dea"
    },
    polkadotHubTestnet: {
      XCMBridge: "0xcF0eCcaEfC1Ba660e28Db7127db6765FE389fC05",
      YourCollectible: "0xB70435eD04461aA4a70f324ab54e22d4f19af4Ce"
    }
  };

  const network = hre.network.name;
  const chainId = await hre.getChainId();
  console.log(`📡 当前网络: ${network} (Chain ID: ${chainId})`);
  console.log(`🔐 消息哈希: ${messageHash}\n`);

  try {
    const [deployer] = await ethers.getSigners();
    console.log(`👤 使用账户: ${deployer.address}`);
    console.log(`💰 账户余额: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

    // 根据网络选择合约地址
    let addresses;
    if (chainId === "1287") { // Moonbase Alpha
      addresses = contractAddresses.moonbaseAlpha;
    } else if (chainId === "420420422") { // Polkadot Hub TestNet
      addresses = contractAddresses.polkadotHubTestnet;
    } else {
      throw new Error(`不支持的网络: ${network} (Chain ID: ${chainId})`);
    }

    console.log(`🏗️  XCMBridge地址: ${addresses.XCMBridge}`);

    // 获取XCMBridge合约实例
    const XCMBridge = await ethers.getContractFactory("XCMBridge");
    const xcmBridge = XCMBridge.attach(addresses.XCMBridge);

    // 首先检查XCM消息是否存在
    console.log("🔍 检查XCM消息状态...");
    
    try {
      const xcmMessage = await xcmBridge.getXCMMessage(messageHash);
      console.log("📋 XCM消息信息:");
      console.log(`  消息类型: ${xcmMessage.messageType}`);
      console.log(`  NFT合约: ${xcmMessage.nftContract}`);
      console.log(`  Token ID: ${xcmMessage.tokenId.toString()}`);
      console.log(`  接收者: ${xcmMessage.recipient}`);
      console.log(`  源链ID: ${xcmMessage.sourceChainId}`);
      console.log(`  Token URI: ${xcmMessage.tokenURI || 'undefined'}`);
      console.log(`  是否已处理: ${xcmMessage.processed}\n`);

      // 检查数据有效性
      const isValidMessage = xcmMessage.nftContract !== ethers.ZeroAddress && 
                           xcmMessage.recipient !== ethers.ZeroAddress &&
                           xcmMessage.recipient !== "0x0000000000000000000000000000000000000019";

      if (!isValidMessage) {
        console.log("⚠️  检测到异常的消息数据:");
        if (xcmMessage.nftContract === ethers.ZeroAddress) {
          console.log("   - NFT合约地址为零地址");
        }
        if (xcmMessage.recipient === ethers.ZeroAddress || xcmMessage.recipient === "0x0000000000000000000000000000000000000019") {
          console.log("   - 接收者地址异常");
        }
        if (!xcmMessage.tokenURI) {
          console.log("   - Token URI 缺失");
        }
        
        console.log("\n💡 这可能表明:");
        console.log("   1. 消息数据损坏或解析错误");
        console.log("   2. 合约版本不匹配");
        console.log("   3. 消息格式发生变化");
        
        if (xcmMessage.processed) {
          console.log("\n✅ 尽管数据异常，但消息已标记为已处理");
          console.log("🔍 建议检查区块链浏览器确认实际交易状态");
        }
        return;
      }

      if (xcmMessage.processed) {
        console.log("✅ 此XCM消息已经被处理过了");
        return;
      }

      // 处理XCM消息
      console.log("🎯 开始处理XCM消息...");
      
      const tx = await xcmBridge.processXCMMessage(
        messageHash,
        xcmMessage.messageType,
        xcmMessage.nftContract,
        xcmMessage.tokenId,
        xcmMessage.recipient,
        xcmMessage.sourceChainId,
        xcmMessage.tokenURI
      );

      console.log(`📤 交易已发送: ${tx.hash}`);
      console.log("⏳ 等待交易确认...");

      const receipt = await tx.wait();
      console.log(`✅ 交易已确认，区块号: ${receipt.blockNumber}`);

      // 检查事件
      console.log("\n🔍 检查交易事件:");
      if (receipt.logs && receipt.logs.length > 0) {
        receipt.logs.forEach((log, index) => {
          try {
            const parsedLog = xcmBridge.interface.parseLog(log);
            console.log(`  事件 ${index + 1}: ${parsedLog.name}`);
            console.log(`    参数:`, parsedLog.args);
          } catch (e) {
            console.log(`  日志 ${index + 1}: 无法解析 (可能来自其他合约)`);
          }
        });
      }

      console.log("\n🎉 XCM消息处理完成！");
      
      // 验证消息是否已被标记为已处理
      const updatedMessage = await xcmBridge.getXCMMessage(messageHash);
      console.log(`✅ 消息处理状态: ${updatedMessage.processed ? '已处理' : '未处理'}`);

    } catch (error) {
      if (error.message.includes("Message not found")) {
        console.log("❌ 未找到对应的XCM消息");
        console.log("💡 可能的原因:");
        console.log("   1. 消息哈希不正确");
        console.log("   2. 消息还未发送到此网络");
        console.log("   3. 需要在不同的网络上查找");
        
        // 尝试检查跨链NFT记录
        console.log("\n🔍 尝试检查跨链NFT记录...");
        try {
          const crossChainNFT = await xcmBridge.getCrossChainNFT(messageHash);
          if (crossChainNFT.originalContract !== ethers.ZeroAddress) {
            console.log("📋 找到跨链NFT记录:");
            console.log(`  原始合约: ${crossChainNFT.originalContract}`);
            console.log(`  原始Token ID: ${crossChainNFT.originalTokenId.toString()}`);
            console.log(`  原始所有者: ${crossChainNFT.originalOwner}`);
            console.log(`  源链ID: ${crossChainNFT.sourceChainId}`);
            console.log(`  目标链ID: ${crossChainNFT.destinationChainId}`);
            console.log(`  是否锁定: ${crossChainNFT.isLocked}`);
            console.log(`  时间戳: ${new Date(Number(crossChainNFT.timestamp) * 1000).toLocaleString()}`);
            
            if (crossChainNFT.isLocked) {
              console.log("\n💡 这是一个锁定记录，可能需要在目标链处理解锁消息");
            }
          } else {
            console.log("❌ 也未找到跨链NFT记录");
          }
        } catch (e) {
          console.log("❌ 检查跨链NFT记录时出错:", e.message);
        }
      } else {
        throw error;
      }
    }

  } catch (error) {
    console.error("❌ 处理过程中出错:", error.message);
    if (error.reason) {
      console.error("错误原因:", error.reason);
    }
    if (error.data) {
      console.error("错误数据:", error.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });