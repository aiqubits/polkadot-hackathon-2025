const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 深度诊断XCM消息...\n");

  const messageHash = "0x0fb2b81cc910925b61045250d33c1b8d25906ef9cc10ac0dfa258bca94c2de6c";
  
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
    console.log(`👤 使用账户: ${deployer.address}\n`);

    let addresses;
    if (chainId === "1287") {
      addresses = contractAddresses.moonbaseAlpha;
    } else if (chainId === "420420422") {
      addresses = contractAddresses.polkadotHubTestnet;
    } else {
      throw new Error(`不支持的网络: ${network}`);
    }

    const XCMBridge = await ethers.getContractFactory("XCMBridge");
    const xcmBridge = XCMBridge.attach(addresses.XCMBridge);

    console.log("=".repeat(60));
    console.log("📊 完整诊断报告");
    console.log("=".repeat(60));

    // 1. 检查XCM消息
    console.log("\n1️⃣ XCM消息状态:");
    try {
      const xcmMessage = await xcmBridge.getXCMMessage(messageHash);
      console.log(`   ✅ 消息存在`);
      console.log(`   📝 消息类型: ${xcmMessage.messageType}`);
      console.log(`   🏠 NFT合约: ${xcmMessage.nftContract}`);
      console.log(`   🎫 Token ID: ${xcmMessage.tokenId.toString()}`);
      console.log(`   👤 接收者: ${xcmMessage.recipient}`);
      console.log(`   🌐 源链ID: ${xcmMessage.sourceChainId}`);
      console.log(`   🔗 Token URI: ${xcmMessage.tokenURI || '(空)'}`);
      console.log(`   ✅ 已处理: ${xcmMessage.processed}`);
      
      // 数据有效性检查
      const validContract = xcmMessage.nftContract !== ethers.ZeroAddress;
      const validRecipient = xcmMessage.recipient !== ethers.ZeroAddress && 
                           xcmMessage.recipient !== "0x0000000000000000000000000000000000000019";
      const hasTokenURI = xcmMessage.tokenURI && xcmMessage.tokenURI.length > 0;
      
      console.log(`\n   📋 数据有效性:`);
      console.log(`   - NFT合约有效: ${validContract ? '✅' : '❌'}`);
      console.log(`   - 接收者有效: ${validRecipient ? '✅' : '❌'}`);
      console.log(`   - Token URI: ${hasTokenURI ? '✅' : '❌'}`);
      
    } catch (error) {
      console.log(`   ❌ 消息不存在或无法访问: ${error.message}`);
    }

    // 2. 检查跨链NFT记录
    console.log("\n2️⃣ 跨链NFT记录:");
    try {
      const crossChainNFT = await xcmBridge.getCrossChainNFT(messageHash);
      if (crossChainNFT.originalContract !== ethers.ZeroAddress) {
        console.log(`   ✅ 跨链记录存在`);
        console.log(`   🏠 原始合约: ${crossChainNFT.originalContract}`);
        console.log(`   🎫 原始Token ID: ${crossChainNFT.originalTokenId.toString()}`);
        console.log(`   👤 原始所有者: ${crossChainNFT.originalOwner}`);
        console.log(`   🌐 源链ID: ${crossChainNFT.sourceChainId}`);
        console.log(`   🎯 目标链ID: ${crossChainNFT.destinationChainId}`);
        console.log(`   🔒 锁定状态: ${crossChainNFT.isLocked ? '已锁定' : '未锁定'}`);
        console.log(`   ⏰ 时间戳: ${new Date(Number(crossChainNFT.timestamp) * 1000).toLocaleString()}`);
      } else {
        console.log(`   ❌ 无跨链记录`);
      }
    } catch (error) {
      console.log(`   ❌ 无法获取跨链记录: ${error.message}`);
    }

    // 3. 检查事件日志
    console.log("\n3️⃣ 相关事件日志:");
    try {
      // 查询最近的相关事件
      const currentBlock = await ethers.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // 查询最近10000个区块
      
      console.log(`   🔍 搜索区块范围: ${fromBlock} - ${currentBlock}`);
      
      // 查询XCM消息处理事件
      const processFilter = xcmBridge.filters.XCMMessageProcessed();
      const processEvents = await xcmBridge.queryFilter(processFilter, fromBlock);
      
      const relatedEvents = processEvents.filter(event => 
        event.args && event.args.messageHash === messageHash
      );
      
      if (relatedEvents.length > 0) {
        console.log(`   ✅ 找到 ${relatedEvents.length} 个相关事件:`);
        relatedEvents.forEach((event, index) => {
          console.log(`   📅 事件 ${index + 1}:`);
          console.log(`      - 区块: ${event.blockNumber}`);
          console.log(`      - 交易哈希: ${event.transactionHash}`);
          console.log(`      - 消息哈希: ${event.args.messageHash}`);
          console.log(`      - 消息类型: ${event.args.messageType}`);
        });
      } else {
        console.log(`   ❌ 未找到相关的处理事件`);
      }
      
    } catch (error) {
      console.log(`   ❌ 查询事件时出错: ${error.message}`);
    }

    // 4. 区块链浏览器链接
    console.log("\n4️⃣ 区块链浏览器:");
    if (chainId === "1287") {
      console.log(`   🔗 Moonbase Alpha: https://moonbase.moonscan.io/tx/${messageHash}`);
    } else if (chainId === "420420422") {
      console.log(`   🔗 Polkadot Hub TestNet: https://polkadot-hub-testnet.subscan.io/extrinsic/${messageHash}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("📋 诊断总结");
    console.log("=".repeat(60));
    
    console.log("\n🔍 基于以上分析，建议:");
    console.log("1. 如果消息已处理但数据异常，可能是合约版本或数据格式问题");
    console.log("2. 检查区块链浏览器确认实际交易状态");
    console.log("3. 如果是跨链操作，确认在正确的目标链上查看结果");
    console.log("4. 联系开发团队确认合约版本和数据格式兼容性");

  } catch (error) {
    console.error("❌ 诊断过程中出错:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });