import { ethers } from "hardhat";

async function main() {
  console.log("🔐 使用合约所有者账户授权NFT合约...\n");

  // 获取当前网络信息
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  console.log("🌐 当前网络链ID:", chainId);

  // 根据网络获取合约地址
  let xcmBridgeAddress: string;
  let nftContractAddress: string;
  
  if (chainId === 1287) { // Moonbase Alpha
    xcmBridgeAddress = "0x1519c05ABD62bdcc2adf7c9028Dc0260755B021a";
    nftContractAddress = "0xA8d71101fFFc06C4c1da8700f209a57553116Dea";
    console.log("📍 网络: Moonbase Alpha");
  } else if (chainId === 420420422) { // Polkadot Hub TestNet
    xcmBridgeAddress = "0xcF0eCcaEfC1Ba660e28Db7127db6765FE389fC05";
    nftContractAddress = "0xB70435eD04461aA4a70f324ab54e22d4f19af4Ce";
    console.log("📍 网络: Polkadot Hub TestNet");
  } else {
    throw new Error(`不支持的网络: ${chainId}`);
  }

  console.log("📋 合约地址:");
  console.log(`   XCMBridge: ${xcmBridgeAddress}`);
  console.log(`   NFT合约: ${nftContractAddress}`);

  // 获取部署者账户（应该是合约所有者）
  const [deployer] = await ethers.getSigners();
  console.log("\n👤 当前账户:", deployer.address);
  console.log("💰 账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // 获取XCMBridge合约实例
  const xcmBridge = await ethers.getContractAt("XCMBridge", xcmBridgeAddress);

  try {
    // 检查当前账户是否为合约所有者
    const owner = await xcmBridge.owner();
    console.log("\n🔍 合约所有者:", owner);
    
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.log("❌ 错误: 当前账户不是合约所有者");
      console.log(`   合约所有者: ${owner}`);
      console.log(`   当前账户: ${deployer.address}`);
      console.log("\n💡 解决方案:");
      console.log("   1. 使用正确的私钥（合约所有者的私钥）");
      console.log("   2. 或者让合约所有者转移所有权给当前账户");
      return;
    }

    console.log("✅ 当前账户是合约所有者，可以进行授权操作");

    // 检查NFT合约是否已经授权
    const isAuthorized = await xcmBridge.authorizedContracts(nftContractAddress);
    console.log(`\n📋 NFT合约授权状态: ${isAuthorized ? "已授权" : "未授权"}`);

    if (isAuthorized) {
      console.log("✅ NFT合约已经授权，无需重复授权");
      return;
    }

    // 授权NFT合约
    console.log("\n🔗 正在授权NFT合约...");
    const authorizeTx = await xcmBridge.setContractAuthorization(nftContractAddress, true);
    console.log("📝 交易哈希:", authorizeTx.hash);
    
    console.log("⏳ 等待交易确认...");
    const receipt = await authorizeTx.wait();
    console.log("✅ 交易已确认，区块号:", receipt?.blockNumber);

    // 验证授权结果
    const newAuthStatus = await xcmBridge.authorizedContracts(nftContractAddress);
    console.log(`\n🎉 授权完成! NFT合约授权状态: ${newAuthStatus ? "已授权" : "未授权"}`);

    if (newAuthStatus) {
      console.log("✅ NFT合约授权成功，现在可以进行跨链转移操作");
    } else {
      console.log("❌ 授权失败，请检查交易状态");
    }

  } catch (error: any) {
    console.error("❌ 授权过程中发生错误:", error.message);
    
    if (error.message.includes("Ownable: caller is not the owner")) {
      console.log("\n💡 解决方案:");
      console.log("   请确保使用合约所有者的私钥进行操作");
      console.log("   或者联系合约所有者进行授权操作");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  });