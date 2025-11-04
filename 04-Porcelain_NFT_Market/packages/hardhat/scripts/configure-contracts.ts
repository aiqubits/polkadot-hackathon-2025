import { ethers } from "hardhat";

async function main() {
  console.log("🔧 配置已部署的合约...\n");

  // Moonbase Alpha 上已部署的合约地址
  const DEPLOYED_CONTRACTS = {
    YourCollectible: "0xA8d71101fFFc06C4c1da8700f209a57553116Dea",
    XCMBridge: "0xccd4370CDC99f5EfAd36a98Aed10a549CCEaBaE0",
    CrossChainMarketplace: "0xa56fD2dD1E1570B46365ac277B290BAC2C1D9e83"
  };

  const [deployer] = await ethers.getSigners();
  console.log("📝 配置账户:", deployer.address);

  // 获取合约实例
  const xcmBridge = await ethers.getContractAt("XCMBridge", DEPLOYED_CONTRACTS.XCMBridge);
  const marketplace = await ethers.getContractAt("CrossChainMarketplace", DEPLOYED_CONTRACTS.CrossChainMarketplace);

  try {
    // 设置支持的链
    const supportedChains = [
      { id: 420420422, name: "Polkadot Hub" },
      { id: 1287, name: "Moonbase Alpha" }
    ];

    for (const chain of supportedChains) {
      console.log(`🌐 设置支持链: ${chain.name} (${chain.id})...`);
      
      try {
        const bridgeChainTx = await xcmBridge.setChainSupport(chain.id, true);
        await bridgeChainTx.wait();
        console.log(`✅ XCM Bridge - ${chain.name} 支持已启用`);
      } catch (error) {
        console.log(`⚠️ XCM Bridge - ${chain.name} 可能已经配置`);
      }

      try {
        const marketplaceChainTx = await marketplace.setChainSupport(chain.id, true);
        await marketplaceChainTx.wait();
        console.log(`✅ Marketplace - ${chain.name} 支持已启用`);
      } catch (error) {
        console.log(`⚠️ Marketplace - ${chain.name} 可能已经配置`);
      }
    }

    // 设置支持的支付代币 (原生代币)
    console.log("💰 设置支持原生代币支付...");
    try {
      const tokenTx = await marketplace.setPaymentTokenSupport(ethers.ZeroAddress, true);
      await tokenTx.wait();
      console.log("✅ 原生代币支付已启用");
    } catch (error) {
      console.log("⚠️ 原生代币支付可能已经启用");
    }

    // 验证配置
    console.log("\n🔍 验证配置...");
    
    // 检查授权
    const isAuthorized = await xcmBridge.authorizedContracts(DEPLOYED_CONTRACTS.YourCollectible);
    console.log("🔐 YourCollectible 授权状态:", isAuthorized);
    
    // 检查链支持
    const hubSupported = await xcmBridge.supportedChains(420420422);
    const moonbaseSupported = await xcmBridge.supportedChains(1287);
    console.log("🌐 Polkadot Hub 支持:", hubSupported);
    console.log("🌐 Moonbase Alpha 支持:", moonbaseSupported);

    // 检查支付代币支持
    const nativeTokenSupported = await marketplace.supportedPaymentTokens(ethers.ZeroAddress);
    console.log("💰 原生代币支持:", nativeTokenSupported);

    console.log("\n" + "=".repeat(60));
    console.log("🎉 配置完成! Moonbase Alpha 部署摘要:");
    console.log("=".repeat(60));
    console.log(`📋 YourCollectible:        ${DEPLOYED_CONTRACTS.YourCollectible}`);
    console.log(`🌉 XCM Bridge:             ${DEPLOYED_CONTRACTS.XCMBridge}`);
    console.log(`🏪 CrossChain Marketplace: ${DEPLOYED_CONTRACTS.CrossChainMarketplace}`);
    console.log(`🌐 网络: Moonbase Alpha (Chain ID: 1287)`);
    console.log("=".repeat(60));

    console.log("\n📖 使用指南:");
    console.log("1. 在 Moonbase Alpha 上铸造 NFT");
    console.log("2. 使用 XCM Bridge 进行跨链转移");
    console.log("3. 在 CrossChain Marketplace 上交易");
    console.log("4. 获取测试代币: https://faucet.moonbeam.network/");

  } catch (error) {
    console.error("❌ 配置失败:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  });