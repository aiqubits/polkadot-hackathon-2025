import { ethers } from "hardhat";

async function main() {
  console.log("🔧 修复合约授权...\n");

  // Moonbase Alpha 上已部署的合约地址
  const DEPLOYED_CONTRACTS = {
    YourCollectible: "0xA8d71101fFFc06C4c1da8700f209a57553116Dea",
    XCMBridge: "0xccd4370CDC99f5EfAd36a98Aed10a549CCEaBaE0",
    CrossChainMarketplace: "0xa56fD2dD1E1570B46365ac277B290BAC2C1D9e83"
  };

  const [deployer] = await ethers.getSigners();
  console.log("📝 操作账户:", deployer.address);

  // 获取合约实例
  const xcmBridge = await ethers.getContractAt("XCMBridge", DEPLOYED_CONTRACTS.XCMBridge);

  try {
    // 授权 YourCollectible 合约使用 XCM Bridge
    console.log("🔗 授权 YourCollectible 使用 XCM Bridge...");
    const authTx = await xcmBridge.setContractAuthorization(DEPLOYED_CONTRACTS.YourCollectible, true);
    await authTx.wait();
    console.log("✅ 授权完成");

    // 验证授权
    const isAuthorized = await xcmBridge.authorizedContracts(DEPLOYED_CONTRACTS.YourCollectible);
    console.log("🔐 YourCollectible 授权状态:", isAuthorized);

    console.log("\n🎉 授权修复完成!");

  } catch (error) {
    console.error("❌ 授权失败:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  });