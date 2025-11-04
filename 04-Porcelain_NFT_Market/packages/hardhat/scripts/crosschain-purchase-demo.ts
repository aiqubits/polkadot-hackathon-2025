import { ethers } from "hardhat";

async function main() {
  console.log("🛒 跨链NFT购买演示...\n");

  // 合约地址配置
  const CONTRACTS = {
    moonbaseAlpha: {
      chainId: 1287,
      name: "Moonbase Alpha",
      YourCollectible: "0xA8d71101fFFc06C4c1da8700f209a57553116Dea",
      XCMBridge: "0xccd4370CDC99f5EfAd36a98Aed10a549CCEaBaE0",
      CrossChainMarketplace: "0xa56fD2dD1E1570B46365ac277B290BAC2C1D9e83"
    },
    polkadotHub: {
      chainId: 420420422,
      name: "Polkadot Hub",
      YourCollectible: "0xB70435eD04461aA4a70f324ab54e22d4f19af4Ce",
      XCMBridge: "0xf5Ed5e17C846ECB57EBd66fcA89216274F60F426",
      CrossChainMarketplace: "0x7429B770b8289Dd080ea91F8348D443d13A13563"
    }
  };

  const [deployer] = await ethers.getSigners();
  const currentNetwork = await ethers.provider.getNetwork();
  const currentChainId = Number(currentNetwork.chainId);
  
  console.log("📝 操作账户:", deployer.address);
  console.log("🌐 当前网络:", currentChainId);
  console.log("💰 账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // 确定当前网络和目标网络
  let currentChain, targetChain;
  if (currentChainId === 1287) {
    currentChain = CONTRACTS.moonbaseAlpha;
    targetChain = CONTRACTS.polkadotHub;
  } else if (currentChainId === 420420422) {
    currentChain = CONTRACTS.polkadotHub;
    targetChain = CONTRACTS.moonbaseAlpha;
  } else {
    throw new Error("请在 Moonbase Alpha 或 Polkadot Hub 网络上运行此脚本");
  }

  console.log(`📍 当前链: ${currentChain.name} (${currentChain.chainId})`);
  console.log(`🎯 目标链: ${targetChain.name} (${targetChain.chainId})\n`);

  // 获取当前链的合约实例
  const yourCollectible = await ethers.getContractAt("YourCollectible", currentChain.YourCollectible);
  const xcmBridge = await ethers.getContractAt("XCMBridge", currentChain.XCMBridge);
  const marketplace = await ethers.getContractAt("CrossChainMarketplace", currentChain.CrossChainMarketplace);

  try {
    // 场景1: 在当前链上铸造并上架NFT
    console.log("🎨 场景1: 在当前链铸造瓷板画NFT并上架...");
    
    const tokenURI = `QmPorcelainPainting_${currentChain.name}_${Date.now()}`;
    const royaltyFee = 250; // 2.5%
    const listingPrice = ethers.parseEther("0.1"); // 0.1 ETH
    
    // 铸造NFT
    console.log("1️⃣ 铸造NFT...");
    const mintTx = await yourCollectible.mintItem(deployer.address, tokenURI, royaltyFee);
    await mintTx.wait();
    
    const tokenCounter = await yourCollectible.tokenIdCounter();
    const tokenId = tokenCounter.toString();
    
    console.log("✅ NFT铸造成功!");
    console.log("🆔 Token ID:", tokenId);
    console.log("🏷️ Token URI:", tokenURI);

    // 授权市场合约
    console.log("\n2️⃣ 授权市场合约...");
    const approveTx = await yourCollectible.setApprovalForAll(currentChain.CrossChainMarketplace, true);
    await approveTx.wait();
    console.log("✅ 市场授权完成");

    // 上架NFT到跨链市场
    console.log("\n3️⃣ 上架NFT到跨链市场...");
    const listTx = await marketplace.listNFT(
      currentChain.YourCollectible,
      tokenId,
      listingPrice,
      ethers.ZeroAddress, // 使用原生代币
      true // 跨链上架
    );
    const listReceipt = await listTx.wait();
    
    // 生成listing ID
    const listingId = ethers.keccak256(
      ethers.solidityPacked(
        ["address", "uint256", "address", "uint256", "uint256"],
        [
          currentChain.YourCollectible,
          tokenId,
          deployer.address,
          (await ethers.provider.getBlock("latest"))?.timestamp || 0,
          currentChainId
        ]
      )
    );

    console.log("✅ NFT已上架到跨链市场!");
    console.log("🏷️ Listing ID:", listingId);
    console.log("💰 价格:", ethers.formatEther(listingPrice), "ETH");
    console.log("📝 交易哈希:", listTx.hash);

    // 验证上架状态
    const listing = await marketplace.listings(listingId);
    console.log("🔍 上架验证:");
    console.log("  - 是否激活:", listing.isActive);
    console.log("  - 是否跨链:", listing.isCrossChain);
    console.log("  - 卖家:", listing.seller);
    console.log("  - 价格:", ethers.formatEther(listing.price), "ETH");

    // 场景2: 模拟跨链购买流程
    console.log("\n🛒 场景2: 跨链购买流程演示...");
    console.log("📋 购买步骤说明:");
    console.log("1. 买家在目标链上发起跨链购买请求");
    console.log("2. XCM消息传递购买信息到源链");
    console.log("3. 源链验证并执行交易");
    console.log("4. NFT通过XCM桥转移到目标链");
    console.log("5. 买家在目标链上接收NFT");

    // 模拟跨链购买请求
    console.log("\n4️⃣ 发起跨链购买请求...");
    try {
      const purchaseTx = await marketplace.initiateCrossChainPurchase(
        listingId,
        targetChain.chainId,
        { value: listingPrice }
      );
      await purchaseTx.wait();
      
      console.log("✅ 跨链购买请求已发起!");
      console.log("📝 交易哈希:", purchaseTx.hash);
      console.log("🎯 目标链:", targetChain.name);
      
    } catch (error) {
      console.log("ℹ️ 跨链购买请求演示 (实际需要在目标链执行)");
      console.log("💡 在实际应用中，买家需要:");
      console.log("  1. 切换到目标链网络");
      console.log("  2. 调用 initiateCrossChainPurchase()");
      console.log("  3. 等待XCM消息处理");
    }

    // 场景3: 同链购买演示
    console.log("\n🏪 场景3: 同链购买演示...");
    
    // 先创建一个同链上架
    console.log("5️⃣ 创建同链NFT上架...");
    const mintTx2 = await yourCollectible.mintItem(deployer.address, `${tokenURI}_local`, royaltyFee);
    await mintTx2.wait();
    
    const tokenCounter2 = await yourCollectible.tokenIdCounter();
    const tokenId2 = tokenCounter2.toString();
    
    const localListTx = await marketplace.listNFT(
      currentChain.YourCollectible,
      tokenId2,
      listingPrice,
      ethers.ZeroAddress,
      false // 同链上架
    );
    await localListTx.wait();
    
    const localListingId = ethers.keccak256(
      ethers.solidityPacked(
        ["address", "uint256", "address", "uint256", "uint256"],
        [
          currentChain.YourCollectible,
          tokenId2,
          deployer.address,
          (await ethers.provider.getBlock("latest"))?.timestamp || 0,
          currentChainId
        ]
      )
    );

    console.log("✅ 同链NFT已上架!");
    console.log("🆔 Token ID:", tokenId2);
    console.log("🏷️ Listing ID:", localListingId);

    // 执行同链购买
    console.log("\n6️⃣ 执行同链购买...");
    try {
      const buyTx = await marketplace.purchaseNFT(localListingId, { value: listingPrice });
      await buyTx.wait();
      
      console.log("✅ 同链购买成功!");
      console.log("📝 交易哈希:", buyTx.hash);
      
      // 验证所有权转移
      const newOwner = await yourCollectible.ownerOf(tokenId2);
      console.log("👤 新所有者:", newOwner);
      
    } catch (error) {
      console.log("⚠️ 同链购买演示失败 (可能是同一账户购买)");
    }

    // 总结
    console.log("\n" + "=".repeat(80));
    console.log("🎉 跨链购买演示完成!");
    console.log("=".repeat(80));
    console.log(`📍 当前网络: ${currentChain.name} (${currentChain.chainId})`);
    console.log(`🎯 目标网络: ${targetChain.name} (${targetChain.chainId})`);
    console.log("\n📋 合约地址:");
    console.log(`🎨 NFT合约:    ${currentChain.YourCollectible}`);
    console.log(`🌉 跨链桥:     ${currentChain.XCMBridge}`);
    console.log(`🏪 市场合约:   ${currentChain.CrossChainMarketplace}`);
    console.log("=".repeat(80));

    console.log("\n🎯 实际跨链购买步骤:");
    console.log("1. 在 Moonbase Alpha 上铸造并上架NFT");
    console.log("2. 切换到 Polkadot Hub 网络");
    console.log("3. 调用 CrossChainMarketplace.initiateCrossChainPurchase()");
    console.log("4. 等待XCM消息处理和NFT转移");
    console.log("5. 在目标链上接收NFT");

    console.log("\n🔗 网络切换命令:");
    console.log("• Moonbase Alpha: --network moonbaseAlpha");
    console.log("• Polkadot Hub:   --network polkadotHubTestnet");

  } catch (error) {
    console.error("❌ 演示失败:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  });