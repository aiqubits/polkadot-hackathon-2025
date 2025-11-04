const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 检查特定XCM消息状态...\n");

  // 用户提供的消息哈希
  const messageHash = "0x0fb2b81cc910925b61045250d33c1b8d25906ef9cc10ac0dfa258bca94c2de6c";
  
  // 合约地址 - 尝试旧的地址
  const contractAddresses = {
    polkadotHubTestnet: {
      XCMBridge: "0x73C506D96F474653f7bEbDDDf2b92AC95983e1E0", // 旧的地址
      WrappedNFT: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
    }
  };

  const network = hre.network.name;
  console.log(`📡 当前网络: ${network}`);
  
  if (network !== "polkadotHubTestnet") {
    console.log("❌ 此脚本需要在 polkadotHubTestnet 网络上运行");
    return;
  }

  const addresses = contractAddresses.polkadotHubTestnet;
  console.log(`🏗️  XCMBridge地址: ${addresses.XCMBridge}`);
  console.log(`🎁 WrappedNFT地址: ${addresses.WrappedNFT}`);
  console.log(`📝 消息哈希: ${messageHash}\n`);

  try {
    const [deployer] = await ethers.getSigners();
    console.log(`👤 使用账户: ${deployer.address}`);

    // 获取合约实例
    const XCMBridge = await ethers.getContractFactory("XCMBridgeV2");
    const xcmBridge = XCMBridge.attach(addresses.XCMBridge);

    // 检查XCM消息记录
    console.log("🔍 检查XCM消息记录...");
    const xcmMessage = await xcmBridge.xcmMessages(messageHash);
    
    console.log("📋 XCM消息详情:");
    console.log(`  消息类型: ${xcmMessage.messageType}`);
    console.log(`  NFT合约: ${xcmMessage.nftContract}`);
    console.log(`  Token ID: ${xcmMessage.tokenId}`);
    console.log(`  接收者: ${xcmMessage.recipient}`);
    console.log(`  源链ID: ${xcmMessage.sourceChainId}`);
    console.log(`  目标链ID: ${xcmMessage.targetChainId}`);
    console.log(`  是否已处理: ${xcmMessage.processed}`);

    // 如果消息已处理，检查包装NFT
    if (xcmMessage.processed) {
      console.log("\n✅ 消息已处理，检查包装NFT...");
      
      const WrappedNFT = await ethers.getContractFactory("WrappedNFT");
      const wrappedNFT = WrappedNFT.attach(addresses.WrappedNFT);
      
      // 查找包装NFT的Token ID
      try {
        const wrappedTokenId = await xcmBridge.getWrappedTokenId(
          xcmMessage.sourceChainId,
          xcmMessage.nftContract,
          xcmMessage.tokenId
        );
        
        console.log(`🎁 包装NFT Token ID: ${wrappedTokenId}`);
        
        // 检查包装NFT的所有者
        const owner = await wrappedNFT.ownerOf(wrappedTokenId);
        console.log(`👤 包装NFT所有者: ${owner}`);
        
        // 检查Token URI
        const tokenURI = await wrappedNFT.tokenURI(wrappedTokenId);
        console.log(`🔗 Token URI: ${tokenURI}`);
        
        // 检查原始NFT信息
        const originalInfo = await wrappedNFT.getOriginalNFTInfo(wrappedTokenId);
        console.log(`📄 原始NFT信息:`);
        console.log(`  源链ID: ${originalInfo.sourceChainId}`);
        console.log(`  原始合约: ${originalInfo.originalContract}`);
        console.log(`  原始Token ID: ${originalInfo.originalTokenId}`);
        
      } catch (error) {
        console.log("❌ 获取包装NFT信息失败:", error.message);
      }
    } else {
      console.log("\n⏳ 消息尚未处理");
    }

  } catch (error) {
    console.error("❌ 检查过程中出错:", error.message);
    if (error.reason) {
      console.error("错误原因:", error.reason);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });