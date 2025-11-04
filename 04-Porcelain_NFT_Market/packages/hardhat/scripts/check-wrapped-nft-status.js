const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 检查包装NFT状态...\n");

  // 合约地址
  const contractAddresses = {
    moonbaseAlpha: {
      XCMBridge: "0x1519c05ABD62bdcc2adf7c9028Dc0260755B021a",
      WrappedNFT: "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    },
    polkadotHubTestnet: {
      XCMBridge: "0x73C506D96F474653f7bEbDDDf2b92AC95983e1E0", 
      WrappedNFT: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
    }
  };

  const network = hre.network.name;
  console.log(`📡 当前网络: ${network}`);
  
  let addresses;
  if (network === "moonbaseAlpha") {
    addresses = contractAddresses.moonbaseAlpha;
  } else if (network === "polkadotHubTestnet") {
    addresses = contractAddresses.polkadotHubTestnet;
  } else {
    console.log("❌ 不支持的网络");
    return;
  }

  console.log(`🏗️  XCMBridge地址: ${addresses.XCMBridge}`);
  console.log(`🎁 WrappedNFT地址: ${addresses.WrappedNFT}\n`);

  try {
    // 获取合约实例
    const WrappedNFT = await ethers.getContractFactory("WrappedNFT");
    const wrappedNFT = WrappedNFT.attach(addresses.WrappedNFT);

    const XCMBridge = await ethers.getContractFactory("XCMBridgeV2");
    const xcmBridge = XCMBridge.attach(addresses.XCMBridge);

    // 检查最近的包装NFT铸造事件
    console.log("📋 检查包装NFT铸造事件...");
    
    // 获取最近的铸造事件
    const mintFilter = wrappedNFT.filters.WrappedNFTMinted();
    const mintEvents = await wrappedNFT.queryFilter(mintFilter, -1000); // 最近1000个区块
    console.log(`🎯 找到 ${mintEvents.length} 个铸造事件`);

    if (mintEvents.length > 0) {
      console.log("\n🎁 已铸造的包装NFT:");
      const activeTokens = new Set();
      
      mintEvents.forEach((event, index) => {
        console.log(`  铸造事件 ${index + 1}:`);
        console.log(`    Token ID: ${event.args.wrappedTokenId}`);
        console.log(`    接收者: ${event.args.recipient}`);
        console.log(`    源链ID: ${event.args.sourceChainId}`);
        console.log(`    源合约: ${event.args.originalContract}`);
        console.log(`    源Token ID: ${event.args.originalTokenId}`);
        console.log(`    区块号: ${event.blockNumber}`);
        console.log("    ---");
        activeTokens.add(event.args.wrappedTokenId.toString());
      });

      // 检查销毁事件
       const burnFilter = wrappedNFT.filters.WrappedNFTBurned();
       const burnEvents = await wrappedNFT.queryFilter(burnFilter, -1000);
      console.log(`🔥 找到 ${burnEvents.length} 个销毁事件`);

      if (burnEvents.length > 0) {
        console.log("\n销毁的包装NFT:");
        burnEvents.forEach((event, index) => {
          console.log(`  销毁事件 ${index + 1}:`);
          console.log(`    Token ID: ${event.args.wrappedTokenId}`);
          console.log(`    原拥有者: ${event.args.owner}`);
          console.log(`    区块号: ${event.blockNumber}`);
          activeTokens.delete(event.args.wrappedTokenId.toString());
        });
      }

      console.log(`\n📊 当前活跃的包装NFT数量: ${activeTokens.size}`);
      
      if (activeTokens.size > 0) {
        console.log("当前活跃的包装NFT:");
        for (const tokenId of activeTokens) {
          try {
            const owner = await wrappedNFT.ownerOf(tokenId);
            const tokenURI = await wrappedNFT.tokenURI(tokenId);
            const info = await wrappedNFT.getOriginalNFTInfo(tokenId);
            
            console.log(`  Token ID: ${tokenId}`);
            console.log(`    拥有者: ${owner}`);
            console.log(`    源链ID: ${info.sourceChainId}`);
            console.log(`    源合约: ${info.originalContract}`);
            console.log(`    源Token ID: ${info.originalTokenId}`);
            console.log(`    Token URI: ${tokenURI}`);
            console.log("    ---");
          } catch (error) {
            console.log(`  ❌ Token ${tokenId} 可能已被销毁或不存在`);
          }
        }
      }
    } else {
      console.log("📭 当前没有铸造的包装NFT");
    }

    // 检查XCM Bridge的锁定事件
    console.log("\n🔒 检查XCM Bridge锁定事件...");
    const lockFilter = xcmBridge.filters.NFTLocked();
    const lockEvents = await xcmBridge.queryFilter(lockFilter, -1000);
    console.log(`🔐 找到 ${lockEvents.length} 个NFT锁定事件`);

    if (lockEvents.length > 0) {
      console.log("最近的锁定事件:");
      lockEvents.slice(-3).forEach((event, index) => {
        console.log(`  事件 ${index + 1}:`);
        console.log(`    Token ID: ${event.args.tokenId}`);
        console.log(`    拥有者: ${event.args.owner}`);
        console.log(`    目标链ID: ${event.args.targetChainId}`);
        console.log(`    区块号: ${event.blockNumber}`);
      });
    }

    // 检查XCM消息处理事件
    console.log("\n📨 检查XCM消息处理事件...");
    const messageFilter = xcmBridge.filters.XCMMessageProcessed();
    const messageEvents = await xcmBridge.queryFilter(messageFilter, -1000);
    console.log(`📬 找到 ${messageEvents.length} 个XCM消息处理事件`);

    if (messageEvents.length > 0) {
      console.log("最近的XCM消息处理事件:");
      messageEvents.slice(-3).forEach((event, index) => {
        console.log(`  事件 ${index + 1}:`);
        console.log(`    消息类型: ${event.args.messageType}`);
        console.log(`    源链ID: ${event.args.sourceChainId}`);
        console.log(`    区块号: ${event.blockNumber}`);
      });
    }

  } catch (error) {
    console.error("❌ 检查过程中出错:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });