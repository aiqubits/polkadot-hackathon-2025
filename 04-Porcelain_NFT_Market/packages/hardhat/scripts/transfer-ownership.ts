import { ethers } from "hardhat";

async function main() {
  console.log("🔄 转移合约所有权...\n");

  // 用户的钱包地址（从错误信息中获取）
  const newOwnerAddress = "0xBfADd27C429466e4E50c8A161Bf82d1C43b4D616";

  // 获取当前网络信息
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  console.log("🌐 当前网络链ID:", chainId);

  // 根据网络获取合约地址
  let xcmBridgeAddress: string;
  
  if (chainId === 1287) { // Moonbase Alpha
    xcmBridgeAddress = "0x1519c05ABD62bdcc2adf7c9028Dc0260755B021a";
    console.log("📍 网络: Moonbase Alpha");
  } else if (chainId === 420420422) { // Polkadot Hub TestNet
    xcmBridgeAddress = "0xcF0eCcaEfC1Ba660e28Db7127db6765FE389fC05";
    console.log("📍 网络: Polkadot Hub TestNet");
  } else {
    throw new Error(`不支持的网络: ${chainId}`);
  }

  console.log("📋 合约信息:");
  console.log(`   XCMBridge: ${xcmBridgeAddress}`);
  console.log(`   新所有者: ${newOwnerAddress}`);

  // 获取部署者账户（当前合约所有者）
  const [deployer] = await ethers.getSigners();
  console.log("\n👤 当前账户:", deployer.address);
  console.log("💰 账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // 获取XCMBridge合约实例
  const xcmBridge = await ethers.getContractAt("XCMBridge", xcmBridgeAddress);

  try {
    // 检查当前合约所有者
    const currentOwner = await xcmBridge.owner();
    console.log("\n🔍 当前合约所有者:", currentOwner);
    
    if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.log("❌ 错误: 当前账户不是合约所有者，无法转移所有权");
      console.log(`   合约所有者: ${currentOwner}`);
      console.log(`   当前账户: ${deployer.address}`);
      return;
    }

    // 检查新所有者地址是否有效
    if (!ethers.isAddress(newOwnerAddress)) {
      console.log("❌ 错误: 新所有者地址无效");
      return;
    }

    if (currentOwner.toLowerCase() === newOwnerAddress.toLowerCase()) {
      console.log("✅ 新所有者地址与当前所有者相同，无需转移");
      return;
    }

    console.log("✅ 当前账户是合约所有者，可以进行所有权转移");

    // 转移合约所有权
    console.log("\n🔄 正在转移合约所有权...");
    console.log(`   从: ${currentOwner}`);
    console.log(`   到: ${newOwnerAddress}`);
    
    const transferTx = await xcmBridge.transferOwnership(newOwnerAddress);
    console.log("📝 交易哈希:", transferTx.hash);
    
    console.log("⏳ 等待交易确认...");
    const receipt = await transferTx.wait();
    console.log("✅ 交易已确认，区块号:", receipt?.blockNumber);

    // 验证所有权转移结果
    const newOwner = await xcmBridge.owner();
    console.log(`\n🎉 所有权转移完成!`);
    console.log(`   新合约所有者: ${newOwner}`);

    if (newOwner.toLowerCase() === newOwnerAddress.toLowerCase()) {
      console.log("✅ 所有权转移成功！");
      console.log("\n💡 现在用户可以使用以下功能:");
      console.log("   • 授权NFT合约进行跨链转移");
      console.log("   • 设置链支持");
      console.log("   • 暂停/恢复合约");
      console.log("   • 其他管理员功能");
    } else {
      console.log("❌ 所有权转移失败，请检查交易状态");
    }

  } catch (error: any) {
    console.error("❌ 所有权转移过程中发生错误:", error.message);
    
    if (error.message.includes("Ownable: caller is not the owner")) {
      console.log("\n💡 解决方案:");
      console.log("   请确保使用合约所有者的私钥进行操作");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  });