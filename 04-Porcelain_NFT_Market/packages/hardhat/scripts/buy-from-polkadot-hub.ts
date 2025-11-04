import { ethers } from "hardhat";

async function main() {
  console.log("🛒 从 Moonbase Alpha 购买 Polkadot Hub 上的NFT...\n");

  // 合约地址配置
  const CONTRACTS = {
    moonbaseAlpha: {
      chainId: 1287,
      name: "Moonbase Alpha",
      CrossChainMarketplace: "0xa56fD2dD1E1570B46365ac277B290BAC2C1D9e83"
    },
    polkadotHub: {
      chainId: 420420422,
      name: "Polkadot Hub",
      YourCollectible: "0xB70435eD04461aA4a70f324ab54e22d4f19af4Ce",
      CrossChainMarketplace: "0x7429B770b8289Dd080ea91F8348D443d13A13563"
    }
  };

  // Polkadot Hub上已上架的NFT信息 (从上一个脚本获得)
  const POLKADOT_HUB_LISTING = {
    listingId: "0xe6d30f568072a59233c97185085ec26f8936c73761a91ae34c3c90954d1ac4b4",
    tokenId: "1",
    price: ethers.parseEther("0.1"),
    seller: "0x906CBCA3B02fd5BF783206883565c73A9Fc78e57"
  };

  const [buyer] = await ethers.getSigners();
  const currentNetwork = await ethers.provider.getNetwork();
  const currentChainId = Number(currentNetwork.chainId);
  
  console.log("👤 买家账户:", buyer.address);
  console.log("🌐 当前网络:", currentChainId);
  console.log("💰 账户余额:", ethers.formatEther(await ethers.provider.getBalance(buyer.address)), "ETH\n");

  if (currentChainId !== 1287) {
    console.log("❌ 请在 Moonbase Alpha 网络上运行此脚本");
    console.log("💡 使用命令: --network moonbaseAlpha");
    return;
  }

  // 获取Moonbase Alpha上的市场合约
  const marketplace = await ethers.getContractAt("CrossChainMarketplace", CONTRACTS.moonbaseAlpha.CrossChainMarketplace);

  try {
    console.log("🎯 购买目标信息:");
    console.log("📍 源链: Polkadot Hub");
    console.log("🆔 Token ID:", POLKADOT_HUB_LISTING.tokenId);
    console.log("🏷️ Listing ID:", POLKADOT_HUB_LISTING.listingId);
    console.log("💰 价格:", ethers.formatEther(POLKADOT_HUB_LISTING.price), "ETH");
    console.log("👤 卖家:", POLKADOT_HUB_LISTING.seller);

    console.log("\n🛒 发起跨链购买...");
    
    // 发起跨链购买请求
    const purchaseTx = await marketplace.initiateCrossChainPurchase(
      POLKADOT_HUB_LISTING.listingId,
      CONTRACTS.polkadotHub.chainId, // 目标链ID
      { 
        value: POLKADOT_HUB_LISTING.price,
        gasLimit: 500000 // 设置足够的gas限制
      }
    );
    
    console.log("📝 交易已提交:", purchaseTx.hash);
    console.log("⏳ 等待交易确认...");
    
    const receipt = await purchaseTx.wait();
    
    console.log("✅ 跨链购买请求已成功发起!");
    console.log("📋 交易详情:");
    console.log("  - 区块号:", receipt?.blockNumber);
    console.log("  - Gas使用:", receipt?.gasUsed.toString());
    console.log("  - 交易状态:", receipt?.status === 1 ? "成功" : "失败");

    // 生成购买ID用于跟踪
    const purchaseId = ethers.keccak256(
      ethers.solidityPacked(
        ["bytes32", "address", "uint256"],
        [
          POLKADOT_HUB_LISTING.listingId,
          buyer.address,
          (await ethers.provider.getBlock("latest"))?.timestamp || 0
        ]
      )
    );

    console.log("🔍 购买跟踪ID:", purchaseId);

    // 检查跨链购买记录
    try {
      const crossChainPurchase = await marketplace.crossChainPurchases(purchaseId);
      console.log("\n📊 跨链购买记录:");
      console.log("  - 买家:", crossChainPurchase.buyer);
      console.log("  - 价格:", ethers.formatEther(crossChainPurchase.price), "ETH");
      console.log("  - 源链:", crossChainPurchase.sourceChainId.toString());
      console.log("  - 目标链:", crossChainPurchase.destinationChainId.toString());
      console.log("  - 是否完成:", crossChainPurchase.completed);
    } catch (error) {
      console.log("ℹ️ 无法获取跨链购买记录 (可能需要等待处理)");
    }

    console.log("\n🔄 XCM消息处理流程:");
    console.log("1. ✅ 跨链购买请求已在 Moonbase Alpha 上发起");
    console.log("2. 🔄 XCM消息正在传递到 Polkadot Hub");
    console.log("3. ⏳ 等待 Polkadot Hub 上的合约处理购买");
    console.log("4. 🔄 NFT将通过XCM桥转移回 Moonbase Alpha");
    console.log("5. ⏳ 买家将在 Moonbase Alpha 上接收NFT");

    console.log("\n" + "=".repeat(80));
    console.log("🎉 跨链购买请求发起成功!");
    console.log("=".repeat(80));
    console.log("📝 交易哈希:", purchaseTx.hash);
    console.log("💰 支付金额:", ethers.formatEther(POLKADOT_HUB_LISTING.price), "ETH");
    console.log("🌐 从 Moonbase Alpha 购买 Polkadot Hub 上的NFT");
    console.log("=".repeat(80));

    console.log("\n📖 后续步骤:");
    console.log("1. 等待XCM消息在两链间传递");
    console.log("2. Polkadot Hub上的合约将处理购买");
    console.log("3. NFT将被锁定并准备跨链转移");
    console.log("4. 通过XCM桥将NFT转移到Moonbase Alpha");
    console.log("5. 买家在Moonbase Alpha上接收NFT");

    console.log("\n🔗 监控链接:");
    console.log("• Moonbase Alpha浏览器:", `https://moonbase.moonscan.io/tx/${purchaseTx.hash}`);
    console.log("• Polkadot Hub浏览器:", "https://polkadot-hub.subscan.io/");

    console.log("\n💡 提示:");
    console.log("• 跨链交易可能需要几分钟到几小时完成");
    console.log("• 可以通过区块链浏览器监控交易状态");
    console.log("• XCM消息处理时间取决于网络拥堵情况");

  } catch (error) {
    console.error("❌ 跨链购买失败:", error);
    
    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 解决方案:");
      console.log("• 确保账户有足够的DEV代币");
      console.log("• 获取测试代币: https://faucet.moonbeam.network/");
    } else if (error.message.includes("Listing not active")) {
      console.log("\n💡 可能原因:");
      console.log("• NFT可能已被购买");
      console.log("• Listing ID可能不正确");
      console.log("• 需要先在Polkadot Hub上创建新的上架");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  });