import { ethers } from "hardhat";

/**
 * XCM消息处理器
 * 
 * 本脚本演示如何在目标链上处理来自源链的XCM消息
 * 包括：接收锁定消息、铸造包装NFT、处理解锁消息等
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
    chainId: 420420422, // 更新为正确的链ID
    xcmBridge: "0xcF0eCcaEfC1Ba660e28Db7127db6765FE389fC05",
    wrappedNFT: "0xa08125E688F14365E3614fC327b09f3b3976351C",
    yourCollectible: "0xB70435eD04461aA4a70f324ab54e22d4f19af4Ce"
  }
};

// 模拟的XCM消息数据（在实际环境中，这些数据会从XCM消息中解析）
const SAMPLE_XCM_MESSAGES = {
  lockMessage: {
    messageHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    messageType: 0, // LOCK_NFT
    nftContract: "0xA8d71101fFFc06C4c1da8700f209a57553116Dea", // Moonbase Alpha NFT
    tokenId: 1,
    recipient: "0x23bac0341A88A6B51C323CBBbC4053915f7A1A57",
    sourceChainId: 1287, // Moonbase Alpha
    tokenURI: "https://gateway.pinata.cloud/ipfs/QmYxT4LnK8sqLupjbS6eRvu1si7Ly2wFQAqFebxhWntcf6"
  },
  unlockMessage: {
    messageHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    messageType: 1, // UNLOCK_NFT
    nftContract: "0xA8d71101fFFc06C4c1da8700f209a57553116Dea", // Moonbase Alpha NFT
    tokenId: 1,
    recipient: "0xccd4370CDC99f5EfAd36a98Aed10a549CCEaBaE0", // 原始所有者
    sourceChainId: 1000, // Polkadot Hub TestNet
    tokenURI: "https://gateway.pinata.cloud/ipfs/QmYxT4LnK8sqLupjbS6eRvu1si7Ly2wFQAqFebxhWntcf6"
  }
};

async function main() {
  console.log("🔄 XCM消息处理器启动");
  console.log("=" .repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("操作账户:", deployer.address);

  // 获取当前网络信息
  const network = await ethers.provider.getNetwork();
  const currentChainId = Number(network.chainId);
  console.log("当前网络链ID:", currentChainId);

  let currentConfig, sourceConfig;
  if (currentChainId === 1287) {
    currentConfig = CONTRACT_ADDRESSES.moonbaseAlpha;
    sourceConfig = CONTRACT_ADDRESSES.polkadotHub;
    console.log("📍 当前在 Moonbase Alpha");
  } else if (currentChainId === 420420422) {
    currentConfig = CONTRACT_ADDRESSES.polkadotHub;
    sourceConfig = CONTRACT_ADDRESSES.moonbaseAlpha;
    console.log("📍 当前在 Polkadot Hub TestNet");
  } else {
    throw new Error(`不支持的网络链ID: ${currentChainId}`);
  }

  // 获取合约实例
  const xcmBridge = await ethers.getContractAt("XCMBridgeV2", currentConfig.xcmBridge);
  const wrappedNFT = await ethers.getContractAt("WrappedNFT", currentConfig.wrappedNFT);

  console.log("\\n" + "=".repeat(60));
  console.log("📨 XCM消息处理演示");
  console.log("=".repeat(60));

  // 选择要处理的消息类型
  const isTargetChain = currentChainId === 420420422; // Polkadot Hub TestNet 作为目标链
  
  if (isTargetChain) {
    console.log("\\n🎯 作为目标链，处理LOCK_NFT消息并铸造包装NFT");
    await processLockMessage(xcmBridge, wrappedNFT);
    
    console.log("\\n🔥 演示销毁包装NFT并发送解锁消息");
    await demonstrateBurnWrappedNFT(xcmBridge, wrappedNFT);
  } else {
    console.log("\\n🔓 作为源链，处理UNLOCK_NFT消息并解锁原始NFT");
    await processUnlockMessage(xcmBridge);
  }

  console.log("\\n🎉 XCM消息处理演示完成！");
}

async function processLockMessage(xcmBridge: any, wrappedNFT: any) {
  const lockMsg = SAMPLE_XCM_MESSAGES.lockMessage;
  
  console.log("\\n📋 处理锁定消息:");
  console.log("消息哈希:", lockMsg.messageHash);
  console.log("NFT合约:", lockMsg.nftContract);
  console.log("Token ID:", lockMsg.tokenId);
  console.log("接收者:", lockMsg.recipient);
  console.log("源链ID:", lockMsg.sourceChainId);

  try {
    // 检查消息是否已处理
    console.log("\\n🔍 检查消息处理状态...");
    const messageInfo = await xcmBridge.xcmMessages(lockMsg.messageHash);
    
    if (messageInfo.processed) {
      console.log("⚠️ 消息已经处理过了");
      
      // 检查是否有对应的包装NFT
      console.log("\\n🎨 检查包装NFT状态...");
      try {
        const totalSupply = await wrappedNFT.totalSupply();
        console.log("包装NFT总供应量:", totalSupply.toString());
        
        if (totalSupply > 0) {
          for (let i = 0; i < Math.min(Number(totalSupply), 5); i++) {
            const wrappedTokenId = await wrappedNFT.tokenByIndex(i);
            const owner = await wrappedNFT.ownerOf(wrappedTokenId);
            const [originalContract, originalTokenId, sourceChainId, originalTokenURI, lockMessageHash] = 
              await wrappedNFT.getOriginalNFTInfo(wrappedTokenId);
            
            console.log(`\\n包装NFT #${wrappedTokenId}:`);
            console.log("  所有者:", owner);
            console.log("  原始合约:", originalContract);
            console.log("  原始Token ID:", originalTokenId.toString());
            console.log("  源链ID:", sourceChainId);
            console.log("  锁定消息哈希:", lockMessageHash);
          }
        }
      } catch (error) {
        console.log("❌ 检查包装NFT失败:", error.message);
      }
      
      return;
    }

    console.log("\\n🚀 处理XCM锁定消息...");
    const processTx = await xcmBridge.processXCMMessage(
      lockMsg.messageHash,
      lockMsg.messageType,
      lockMsg.nftContract,
      lockMsg.tokenId,
      lockMsg.recipient,
      lockMsg.sourceChainId,
      lockMsg.tokenURI
    );

    console.log("交易哈希:", processTx.hash);
    console.log("等待交易确认...");
    
    const receipt = await processTx.wait();
    console.log("✅ 消息处理成功！");
    console.log("Gas使用量:", receipt.gasUsed.toString());

    // 解析事件
    console.log("\\n📋 交易事件:");
    for (const log of receipt.logs) {
      try {
        const parsedLog = xcmBridge.interface.parseLog(log);
        if (parsedLog) {
          console.log("事件:", parsedLog.name);
          console.log("参数:", parsedLog.args);
        }
      } catch (e) {
        // 尝试解析包装NFT事件
        try {
          const parsedLog = wrappedNFT.interface.parseLog(log);
          if (parsedLog) {
            console.log("包装NFT事件:", parsedLog.name);
            console.log("参数:", parsedLog.args);
          }
        } catch (e2) {
          // 忽略无法解析的事件
        }
      }
    }

  } catch (error) {
    console.log("❌ 处理锁定消息失败:", error.message);
  }
}

async function demonstrateBurnWrappedNFT(xcmBridge: any, wrappedNFT: any) {
  try {
    console.log("\\n🔍 查找可销毁的包装NFT...");
    const totalSupply = await wrappedNFT.totalSupply();
    
    if (totalSupply === 0) {
      console.log("❌ 没有找到包装NFT");
      return;
    }

    // 查找第一个包装NFT
    const wrappedTokenId = await wrappedNFT.tokenByIndex(0);
    const owner = await wrappedNFT.ownerOf(wrappedTokenId);
    
    console.log("找到包装NFT #" + wrappedTokenId.toString());
    console.log("所有者:", owner);

    const [deployer] = await ethers.getSigners();
    
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.log("⚠️ 当前账户不是包装NFT所有者，无法演示销毁");
      console.log("包装NFT所有者:", owner);
      console.log("当前账户:", deployer.address);
      return;
    }

    console.log("\\n🔥 销毁包装NFT并发送解锁消息...");
    const burnTx = await xcmBridge.burnWrappedNFTAndUnlock(wrappedTokenId);
    
    console.log("交易哈希:", burnTx.hash);
    console.log("等待交易确认...");
    
    const receipt = await burnTx.wait();
    console.log("✅ 包装NFT销毁成功！");
    console.log("Gas使用量:", receipt.gasUsed.toString());

    // 解析事件
    console.log("\\n📋 销毁事件:");
    for (const log of receipt.logs) {
      try {
        const parsedLog = xcmBridge.interface.parseLog(log);
        if (parsedLog) {
          console.log("事件:", parsedLog.name);
          console.log("参数:", parsedLog.args);
        }
      } catch (e) {
        // 忽略无法解析的事件
      }
    }

  } catch (error) {
    console.log("❌ 销毁包装NFT失败:", error.message);
  }
}

async function processUnlockMessage(xcmBridge: any) {
  const unlockMsg = SAMPLE_XCM_MESSAGES.unlockMessage;
  
  console.log("\\n📋 处理解锁消息:");
  console.log("消息哈希:", unlockMsg.messageHash);
  console.log("NFT合约:", unlockMsg.nftContract);
  console.log("Token ID:", unlockMsg.tokenId);
  console.log("接收者:", unlockMsg.recipient);
  console.log("源链ID:", unlockMsg.sourceChainId);

  try {
    console.log("\\n🚀 处理XCM解锁消息...");
    const processTx = await xcmBridge.processXCMMessage(
      unlockMsg.messageHash,
      unlockMsg.messageType,
      unlockMsg.nftContract,
      unlockMsg.tokenId,
      unlockMsg.recipient,
      unlockMsg.sourceChainId,
      unlockMsg.tokenURI
    );

    console.log("交易哈希:", processTx.hash);
    console.log("等待交易确认...");
    
    const receipt = await processTx.wait();
    console.log("✅ 解锁消息处理成功！");
    console.log("Gas使用量:", receipt.gasUsed.toString());

    // 解析事件
    console.log("\\n📋 交易事件:");
    for (const log of receipt.logs) {
      try {
        const parsedLog = xcmBridge.interface.parseLog(log);
        if (parsedLog) {
          console.log("事件:", parsedLog.name);
          console.log("参数:", parsedLog.args);
        }
      } catch (e) {
        // 忽略无法解析的事件
      }
    }

  } catch (error) {
    console.log("❌ 处理解锁消息失败:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ XCM消息处理失败:", error);
    process.exit(1);
  });