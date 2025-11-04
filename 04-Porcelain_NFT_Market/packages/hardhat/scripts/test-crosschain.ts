import { ethers } from "hardhat";

async function main() {
  console.log("🌉 测试跨链NFT操作...\n");

  // Moonbase Alpha 上已部署的合约地址
  const DEPLOYED_CONTRACTS = {
    YourCollectible: "0xA8d71101fFFc06C4c1da8700f209a57553116Dea",
    XCMBridge: "0xccd4370CDC99f5EfAd36a98Aed10a549CCEaBaE0",
    CrossChainMarketplace: "0xa56fD2dD1E1570B46365ac277B290BAC2C1D9e83"
  };

  const [deployer] = await ethers.getSigners();
  console.log("📝 测试账户:", deployer.address);
  console.log("💰 账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "DEV\n");

  // 获取合约实例
  const yourCollectible = await ethers.getContractAt("YourCollectible", DEPLOYED_CONTRACTS.YourCollectible);
  const xcmBridge = await ethers.getContractAt("XCMBridge", DEPLOYED_CONTRACTS.XCMBridge);
  const marketplace = await ethers.getContractAt("CrossChainMarketplace", DEPLOYED_CONTRACTS.CrossChainMarketplace);

  try {
    // 1. 铸造NFT
    console.log("1️⃣ 铸造瓷板画NFT...");
    const tokenURI = "QmPorcelainPainting123"; // 瓷板画元数据
    const royaltyFee = 250; // 2.5%
    
    const mintTx = await yourCollectible.mintItem(deployer.address, tokenURI, royaltyFee);
    const mintReceipt = await mintTx.wait();
    
    // 获取tokenId
    const tokenCounter = await yourCollectible.tokenIdCounter();
    const tokenId = tokenCounter.toString();
    
    console.log("✅ NFT铸造成功!");
    console.log("🎨 Token ID:", tokenId);
    console.log("🏷️ Token URI:", tokenURI);
    console.log("💎 版税:", royaltyFee / 100, "%");

    // 2. 检查NFT所有权
    const owner = await yourCollectible.ownerOf(tokenId);
    console.log("👤 NFT所有者:", owner);

    // 3. 授权XCM Bridge操作NFT
    console.log("\n2️⃣ 授权XCM Bridge操作NFT...");
    const approveTx = await yourCollectible.approve(DEPLOYED_CONTRACTS.XCMBridge, tokenId);
    await approveTx.wait();
    console.log("✅ 授权完成");

    // 4. 锁定NFT进行跨链转移
    console.log("\n3️⃣ 锁定NFT进行跨链转移...");
    const destinationChainId = 420420422; // Polkadot Hub
    
    const lockTx = await xcmBridge.lockNFT(
      DEPLOYED_CONTRACTS.YourCollectible,
      tokenId,
      destinationChainId
    );
    const lockReceipt = await lockTx.wait();
    
    console.log("✅ NFT已锁定到XCM Bridge!");
    console.log("🔒 目标链:", destinationChainId, "(Polkadot Hub)");
    console.log("📝 交易哈希:", lockTx.hash);

    // 5. 验证NFT现在由Bridge持有
    const newOwner = await yourCollectible.ownerOf(tokenId);
    console.log("🔄 NFT现在由Bridge持有:", newOwner === DEPLOYED_CONTRACTS.XCMBridge);

    // 6. 在跨链市场上架NFT
    console.log("\n4️⃣ 在跨链市场上架NFT...");
    
    // 首先需要将NFT转回给用户或者直接从Bridge上架
    // 为了演示，我们先解锁NFT
    
    // 生成消息哈希（简化版本）
    const messageHash = ethers.keccak256(
      ethers.solidityPacked(
        ["address", "uint256", "address", "uint256", "uint32", "uint256"],
        [
          DEPLOYED_CONTRACTS.YourCollectible,
          tokenId,
          deployer.address,
          await ethers.provider.getNetwork().then(n => n.chainId),
          destinationChainId,
          (await ethers.provider.getBlock("latest"))?.timestamp || 0
        ]
      )
    );

    console.log("📋 生成的消息哈希:", messageHash);

    // 7. 显示部署摘要和使用指南
    console.log("\n" + "=".repeat(80));
    console.log("🎉 跨链NFT测试完成! 部署摘要:");
    console.log("=".repeat(80));
    console.log(`🎨 瓷板画NFT合约:      ${DEPLOYED_CONTRACTS.YourCollectible}`);
    console.log(`🌉 XCM跨链桥:          ${DEPLOYED_CONTRACTS.XCMBridge}`);
    console.log(`🏪 跨链市场:           ${DEPLOYED_CONTRACTS.CrossChainMarketplace}`);
    console.log(`🆔 测试NFT Token ID:   ${tokenId}`);
    console.log(`🔗 网络: Moonbase Alpha (Chain ID: 1287)`);
    console.log("=".repeat(80));

    console.log("\n📖 跨链操作指南:");
    console.log("1. ✅ NFT已在Moonbase Alpha上铸造");
    console.log("2. ✅ NFT已锁定到XCM Bridge");
    console.log("3. 🔄 可以通过XCM消息在Polkadot Hub上解锁");
    console.log("4. 💱 可以在跨链市场上进行交易");

    console.log("\n🔗 有用的链接:");
    console.log("• Moonbase Alpha浏览器: https://moonbase.moonscan.io/");
    console.log("• 测试代币水龙头: https://faucet.moonbeam.network/");
    console.log("• Polkadot.js Apps: https://polkadot.js.org/apps/");

    console.log("\n🎯 下一步操作:");
    console.log("1. 在前端界面中连接到Moonbase Alpha");
    console.log("2. 导入合约地址进行交互");
    console.log("3. 测试跨链转移和市场交易功能");

  } catch (error) {
    console.error("❌ 测试失败:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  });