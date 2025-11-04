import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("使用账户:", deployer.address);

  // 获取网络信息
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  console.log("当前网络链ID:", chainId);

  let nftAddress: string;
  let xcmBridgeAddress: string;

  if (chainId === 1287) {
    // Moonbase Alpha
    nftAddress = "0xA8d71101fFFc06C4c1da8700f209a57553116Dea";
    xcmBridgeAddress = "0x24788F091cB8fb806Fe0Afb358c76fFf28c99b31";
    console.log("网络: Moonbase Alpha");
  } else if (chainId === 420420422) {
    // Polkadot Hub TestNet
    nftAddress = "0xB70435eD04461aA4a70f324ab54e22d4f19af4Ce";
    xcmBridgeAddress = "0x7b9177ff2115cac95B0B2e8cE4466A80Fc29e888";
    console.log("网络: Polkadot Hub TestNet");
  } else {
    throw new Error(`不支持的网络: ${chainId}`);
  }

  console.log("NFT合约地址:", nftAddress);
  console.log("XCM Bridge地址:", xcmBridgeAddress);

  // 获取合约实例
  const nftContract = await ethers.getContractAt("YourCollectible", nftAddress);

  // 检查Token ID 21的当前授权状态
  const tokenId = 21;
  try {
    const currentApproval = await nftContract.getApproved(tokenId);
    console.log(`\nToken ID ${tokenId} 当前授权给:`, currentApproval);
    console.log("XCM Bridge地址:", xcmBridgeAddress);
    console.log("是否已授权给XCM Bridge:", currentApproval.toLowerCase() === xcmBridgeAddress.toLowerCase());

    // 检查Token所有者
    const owner = await nftContract.ownerOf(tokenId);
    console.log("Token所有者:", owner);
    console.log("当前账户:", deployer.address);
    console.log("是否为所有者:", owner.toLowerCase() === deployer.address.toLowerCase());

    if (currentApproval.toLowerCase() !== xcmBridgeAddress.toLowerCase()) {
      console.log("\n🔄 重新授权NFT给新的XCM Bridge...");
      
      // 重新授权
      const approveTx = await nftContract.approve(xcmBridgeAddress, tokenId);
      console.log("授权交易哈希:", approveTx.hash);
      
      // 等待交易确认
      await approveTx.wait();
      console.log("✅ 授权交易已确认");

      // 验证授权结果
      const newApproval = await nftContract.getApproved(tokenId);
      console.log("新的授权地址:", newApproval);
      console.log("授权成功:", newApproval.toLowerCase() === xcmBridgeAddress.toLowerCase());
    } else {
      console.log("✅ NFT已经授权给正确的XCM Bridge地址");
    }

  } catch (error: any) {
    console.error("操作失败:", error.message);
    if (error.message.includes("ERC721: invalid token ID")) {
      console.log("Token ID 21 不存在，请先铸造NFT");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });