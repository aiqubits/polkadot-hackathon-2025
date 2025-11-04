import { ethers } from "hardhat";

async function main() {
  console.log("🚀 開始部署 DuelPlatform 合約...");
  console.log("📋 版本: v0.1.0-mvp\n");

  const [deployer] = await ethers.getSigners();
  console.log("👤 部署賬戶:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 賬戶餘額:", ethers.formatEther(balance), "DOT\n");

  // 獲取環境變量或使用部署者地址作為默認值
  const platformWallet = process.env.PLATFORM_WALLET || deployer.address;
  const oracleAddress = process.env.ORACLE_ADDRESS || deployer.address;

  console.log("⚙️  配置:");
  console.log("   平台錢包:", platformWallet);
  console.log("   Oracle 地址:", oracleAddress);
  console.log("");

  // 部署合約
  const DuelPlatform = await ethers.getContractFactory("DuelPlatform");
  const duelPlatform = await DuelPlatform.deploy(platformWallet, oracleAddress);

  await duelPlatform.waitForDeployment();

  const contractAddress = await duelPlatform.getAddress();

  console.log("✅ DuelPlatform 部署成功!");
  console.log("📍 合約地址:", contractAddress);
  console.log("🔗 區塊鏈:", (await ethers.provider.getNetwork()).name);
  console.log("📦 部署區塊:", duelPlatform.deploymentTransaction()?.blockNumber);
  console.log("");

  // 驗證合約版本
  const version = await duelPlatform.VERSION();
  console.log("📌 合約版本:", version);

  // 驗證配置
  const storedPlatformWallet = await duelPlatform.platformWallet();
  const storedOracleAddress = await duelPlatform.oracleAddress();
  console.log("✓ 平台錢包已設置:", storedPlatformWallet);
  console.log("✓ Oracle 地址已設置:", storedOracleAddress);
  console.log("");

  console.log("🎉 部署完成！");
  console.log("");
  console.log("📝 請保存以下信息:");
  console.log("=" .repeat(50));
  console.log("合約地址:", contractAddress);
  console.log("部署者:", deployer.address);
  console.log("平台錢包:", storedPlatformWallet);
  console.log("Oracle:", storedOracleAddress);
  console.log("=" .repeat(50));
  console.log("");
  console.log("🔧 下一步:");
  console.log("1. 更新前端配置 (VITE_CONTRACT_ADDRESS)");
  console.log("2. 更新後端配置 (CONTRACT_ADDRESS)");
  console.log("3. 在區塊瀏覽器驗證合約（可選）");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 部署失敗:", error);
    process.exit(1);
  });

