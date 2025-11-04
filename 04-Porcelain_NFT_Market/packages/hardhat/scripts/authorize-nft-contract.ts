import { ethers } from "hardhat";
import * as dotenv from "dotenv";

// 加载环境变量
dotenv.config();

async function main() {
  console.log("🔐 开始授权NFT合约...");

  // 合约地址
  const XCM_BRIDGE_ADDRESS = "0x1519c05ABD62bdcc2adf7c9028Dc0260755B021a";
  const NFT_CONTRACT_ADDRESS = "0xA8d71101fFFc06C4c1da8700f209a57553116Dea";

  // 使用环境变量中的私钥创建钱包
  const privateKey = process.env.MOONBASE_ALPHA_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("MOONBASE_ALPHA_PRIVATE_KEY not found in .env file");
  }

  // 连接到Moonbase Alpha网络
  const provider = new ethers.JsonRpcProvider("https://rpc.api.moonbase.moonbeam.network");
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("📋 授权信息:");
  console.log("• 授权者地址:", wallet.address);
  console.log("• XCM Bridge地址:", XCM_BRIDGE_ADDRESS);
  console.log("• NFT合约地址:", NFT_CONTRACT_ADDRESS);

  // 获取XCM Bridge合约实例
  const xcmBridgeAbi = [
    "function setContractAuthorization(address nftContract, bool authorized) external",
    "function authorizedContracts(address) external view returns (bool)",
    "function owner() external view returns (address)"
  ];

  const xcmBridge = new ethers.Contract(XCM_BRIDGE_ADDRESS, xcmBridgeAbi, wallet);

  try {
    // 检查当前合约所有者
    const owner = await xcmBridge.owner();
    console.log("• 合约所有者:", owner);
    console.log("• 当前钱包:", wallet.address);

    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
      console.error("❌ 错误: 当前钱包不是合约所有者");
      console.log("请确保使用正确的私钥");
      return;
    }

    // 检查当前授权状态
    const isAuthorized = await xcmBridge.authorizedContracts(NFT_CONTRACT_ADDRESS);
    console.log("• 当前授权状态:", isAuthorized);

    if (isAuthorized) {
      console.log("✅ NFT合约已经被授权，无需重复授权");
      return;
    }

    // 执行授权
    console.log("🔄 正在执行授权交易...");
    const tx = await xcmBridge.setContractAuthorization(NFT_CONTRACT_ADDRESS, true);
    console.log("📤 交易已提交:", tx.hash);

    // 等待交易确认
    console.log("⏳ 等待交易确认...");
    const receipt = await tx.wait();
    console.log("✅ 交易已确认!");
    console.log("• 区块号:", receipt.blockNumber);
    console.log("• Gas使用量:", receipt.gasUsed.toString());

    // 验证授权状态
    const newAuthStatus = await xcmBridge.authorizedContracts(NFT_CONTRACT_ADDRESS);
    console.log("• 新的授权状态:", newAuthStatus);

    if (newAuthStatus) {
      console.log("🎉 NFT合约授权成功！现在可以进行跨链转移了。");
    } else {
      console.log("❌ 授权可能失败，请检查交易状态");
    }

  } catch (error: any) {
    console.error("❌ 授权失败:", error.message);
    
    if (error.message.includes("Ownable: caller is not the owner")) {
      console.log("💡 解决方案: 请确保使用合约所有者的私钥");
    } else if (error.message.includes("insufficient funds")) {
      console.log("💡 解决方案: 请确保钱包有足够的ETH支付gas费");
    }
  }
}

// 运行脚本
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });