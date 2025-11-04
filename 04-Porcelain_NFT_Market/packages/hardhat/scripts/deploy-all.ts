import { ethers } from "hardhat";

async function main() {
  console.log("🚀 开始部署瓷板画NFT跨链平台合约...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📝 部署账户:", deployer.address);
  console.log("💰 账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // 1. 部署 YourCollectible (主NFT合约)
  console.log("1️⃣ 部署 YourCollectible 合约...");
  const YourCollectibleFactory = await ethers.getContractFactory("YourCollectible");
  const yourCollectible = await YourCollectibleFactory.deploy();
  await yourCollectible.waitForDeployment();
  const yourCollectibleAddress = await yourCollectible.getAddress();
  console.log("✅ YourCollectible 部署成功:", yourCollectibleAddress);

  // 2. 部署 XCM Bridge (跨链桥)
  console.log("\n2️⃣ 部署 XCM Bridge 合约...");
  const XCMBridgeFactory = await ethers.getContractFactory("XCMBridge");
  const xcmBridge = await XCMBridgeFactory.deploy();
  await xcmBridge.waitForDeployment();
  const xcmBridgeAddress = await xcmBridge.getAddress();
  console.log("✅ XCM Bridge 部署成功:", xcmBridgeAddress);

  // 3. 部署 CrossChainMarketplace (跨链市场)
  console.log("\n3️⃣ 部署 CrossChain Marketplace 合约...");
  const MarketplaceFactory = await ethers.getContractFactory("CrossChainMarketplace");
  const marketplace = await MarketplaceFactory.deploy(
    xcmBridgeAddress,
    deployer.address // 手续费接收地址
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("✅ CrossChain Marketplace 部署成功:", marketplaceAddress);

  // 4. 配置合约权限和设置
  console.log("\n🔧 配置合约权限和设置...");

  // 授权 YourCollectible 合约使用 XCM Bridge
  console.log("🔗 授权 YourCollectible 使用 XCM Bridge...");
  const authTx = await xcmBridge.setContractAuthorization(yourCollectibleAddress, true);
  await authTx.wait();
  console.log("✅ 授权完成");

  // 设置支持的链
  const supportedChains = [
    { id: 420420422, name: "Polkadot Hub" },
    { id: 1287, name: "Moonbase Alpha" }
  ];

  for (const chain of supportedChains) {
    console.log(`🌐 设置支持链: ${chain.name} (${chain.id})...`);
    
    const bridgeChainTx = await xcmBridge.setChainSupport(chain.id, true);
    await bridgeChainTx.wait();
    
    const marketplaceChainTx = await marketplace.setChainSupport(chain.id, true);
    await marketplaceChainTx.wait();
    
    console.log(`✅ ${chain.name} 支持已启用`);
  }

  // 设置支持的支付代币 (原生代币)
  console.log("💰 设置支持原生代币支付...");
  const tokenTx = await marketplace.setPaymentTokenSupport(ethers.ZeroAddress, true);
  await tokenTx.wait();
  console.log("✅ 原生代币支付已启用");

  // 5. 验证部署
  console.log("\n🔍 验证部署结果...");
  
  // 检查 YourCollectible
  const tokenCounter = await yourCollectible.tokenIdCounter();
  console.log("📊 YourCollectible tokenCounter:", tokenCounter.toString());
  
  // 检查 XCM Bridge 授权
  const isAuthorized = await xcmBridge.authorizedContracts(yourCollectibleAddress);
  console.log("🔐 YourCollectible 授权状态:", isAuthorized);
  
  // 检查链支持
  const hubSupported = await xcmBridge.supportedChains(420420422);
  const moonbaseSupported = await xcmBridge.supportedChains(1287);
  console.log("🌐 Polkadot Hub 支持:", hubSupported);
  console.log("🌐 Moonbase Alpha 支持:", moonbaseSupported);

  // 6. 输出部署摘要
  console.log("\n" + "=".repeat(60));
  console.log("🎉 部署完成! 合约地址摘要:");
  console.log("=".repeat(60));
  console.log(`📋 YourCollectible (主NFT合约):     ${yourCollectibleAddress}`);
  console.log(`🌉 XCM Bridge (跨链桥):            ${xcmBridgeAddress}`);
  console.log(`🏪 CrossChain Marketplace (市场):  ${marketplaceAddress}`);
  console.log(`👤 部署者地址:                     ${deployer.address}`);
  console.log("=".repeat(60));

  // 7. 使用说明
  console.log("\n📖 使用说明:");
  console.log("1. 铸造NFT: 调用 YourCollectible.mintItem()");
  console.log("2. 跨链转移: 先授权后调用 XCMBridge.lockNFT()");
  console.log("3. 市场交易: 调用 CrossChainMarketplace.listNFT() 和 purchaseNFT()");
  console.log("4. 支持的链: Polkadot Hub (420420422), Moonbase Alpha (1287)");

  // 8. 保存部署信息到文件
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      YourCollectible: yourCollectibleAddress,
      XCMBridge: xcmBridgeAddress,
      CrossChainMarketplace: marketplaceAddress
    },
    supportedChains: supportedChains,
    configuration: {
      marketplaceFee: "250", // 2.5%
      feeRecipient: deployer.address,
      nativeTokenSupported: true
    }
  };

  console.log("\n💾 部署信息已保存到控制台，请复制保存!");
  console.log("📄 部署信息 JSON:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 部署失败:", error);
    process.exit(1);
  });