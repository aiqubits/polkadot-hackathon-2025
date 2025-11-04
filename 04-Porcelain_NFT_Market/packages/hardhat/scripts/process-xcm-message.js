const { ethers } = require("hardhat");

async function main() {
  console.log("🔄 手动处理XCM消息以铸造包装NFT...\n");

  // 合约地址
  const contractAddresses = {
    moonbaseAlpha: {
      XCMBridge: "0x1519c05ABD62bdcc2adf7c9028Dc0260755B021a",
      WrappedNFT: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      YourCollectible: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
    },
    polkadotHubTestnet: {
      XCMBridge: "0x73C506D96F474653f7bEbDDDf2b92AC95983e1E0", 
      WrappedNFT: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      YourCollectible: "0x5FbDB2315678afecb367f032d93F642f64180aa3"
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
  console.log(`🎁 WrappedNFT地址: ${addresses.WrappedNFT}\n`);

  try {
    const [deployer] = await ethers.getSigners();
    console.log(`👤 使用账户: ${deployer.address}`);

    // 获取合约实例
    const XCMBridge = await ethers.getContractFactory("XCMBridgeV2");
    const xcmBridge = XCMBridge.attach(addresses.XCMBridge);

    // 使用用户提供的消息哈希
    const lockMessageHash = "0x0fb2b81cc910925b61045250d33c1b8d25906ef9cc10ac0dfa258bca94c2de6c";
    
    // 从Moonbase Alpha锁定的NFT信息
    const sourceChainId = 1287; // Moonbase Alpha chain ID
    const sourceContract = contractAddresses.moonbaseAlpha.YourCollectible;
    const tokenId = 25; // 从检查结果中看到的锁定的Token ID
    const recipient = "0xBfADd27C429466e4E50c8A161Bf82d1C43b4D616"; // 从锁定事件中看到的拥有者
    const tokenURI = "https://example.com/token/24"; // 示例URI，实际应该从源链获取

    console.log("📋 XCM消息信息:");
    console.log(`  消息哈希: ${lockMessageHash}`);
    console.log(`  源链ID: ${sourceChainId}`);
    console.log(`  源合约: ${sourceContract}`);
    console.log(`  Token ID: ${tokenId}`);
    console.log(`  接收者: ${recipient}`);
    console.log(`  Token URI: ${tokenURI}\n`);

    // 检查是否已经铸造过包装NFT
    const WrappedNFT = await ethers.getContractFactory("WrappedNFT");
    const wrappedNFT = WrappedNFT.attach(addresses.WrappedNFT);

    console.log("🎯 开始处理XCM消息...");

    // 调用processXCMMessage函数
    const tx = await xcmBridge.processXCMMessage(
      lockMessageHash,      // messageHash
      0,                    // MessageType.LOCK_NFT (这会触发铸造包装NFT)
      sourceContract,       // nftContract
      tokenId,             // tokenId
      recipient,           // recipient
      sourceChainId,       // sourceChainId
      tokenURI             // tokenURI
    );

    console.log(`📤 交易已发送: ${tx.hash}`);
    console.log("⏳ 等待交易确认...");

    const receipt = await tx.wait();
    console.log(`✅ 交易已确认，区块号: ${receipt.blockNumber}`);

    // 检查事件
    const mintEvents = receipt.events?.filter(event => event.event === "WrappedNFTMinted");
    if (mintEvents && mintEvents.length > 0) {
      const mintEvent = mintEvents[0];
      console.log("\n🎉 包装NFT铸造成功!");
      console.log(`  新Token ID: ${mintEvent.args.wrappedTokenId}`);
      console.log(`  接收者: ${mintEvent.args.recipient}`);
      console.log(`  源链ID: ${mintEvent.args.sourceChainId}`);
      console.log(`  源合约: ${mintEvent.args.originalContract}`);
      console.log(`  源Token ID: ${mintEvent.args.originalTokenId}`);
    } else {
      console.log("\n🔍 检查所有事件:");
      receipt.events?.forEach((event, index) => {
        console.log(`  事件 ${index + 1}: ${event.event || '未知事件'}`);
        if (event.args) {
          console.log(`    参数:`, event.args);
        }
      });
    }

    console.log("\n✅ XCM消息处理完成！请检查前端是否显示包装NFT。");

  } catch (error) {
    console.error("❌ 处理过程中出错:", error.message);
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