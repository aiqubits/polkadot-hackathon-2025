import { ethers } from "hardhat";

async function main() {
  const messageHash = "0x294da1ef653bbc4d61c121fd69a8936f517e0ff19c8e4f308e678d482b9eef10";
  const xcmBridgeAddress = "0xad004515E7aC3081cd56604A37FE7950A2d04B2D";
  const nftContract = "0xA8d71101fFFc06C4c1da8700f209a57553116Dea"; // Moonbase Alpha NFT合约
  const tokenId = 22;
  const originalOwner = "0xBfADd27C429466e4E50c8A161Bf82d1C43b4D616";

  console.log("=== 检查NFT所有权状态 ===");
  console.log(`NFT合约: ${nftContract}`);
  console.log(`TokenId: ${tokenId}`);
  console.log(`XCMBridge地址: ${xcmBridgeAddress}`);
  console.log(`原始所有者: ${originalOwner}`);
  console.log("");

  try {
    // 获取NFT合约实例
    const ERC721 = await ethers.getContractFactory("YourCollectible");
    const nft = ERC721.attach(nftContract);

    // 检查当前所有者
    console.log("=== NFT所有权检查 ===");
    try {
      const currentOwner = await nft.ownerOf(tokenId);
      console.log(`当前所有者: ${currentOwner}`);
      
      const isOwnedByBridge = currentOwner.toLowerCase() === xcmBridgeAddress.toLowerCase();
      const isOwnedByOriginal = currentOwner.toLowerCase() === originalOwner.toLowerCase();
      
      console.log(`是否被XCMBridge拥有: ${isOwnedByBridge}`);
      console.log(`是否被原始所有者拥有: ${isOwnedByOriginal}`);
      
      if (isOwnedByBridge) {
        console.log("✅ XCMBridge拥有此NFT，可以进行解锁");
      } else if (isOwnedByOriginal) {
        console.log("⚠️  NFT仍被原始所有者拥有，可能锁定失败");
      } else {
        console.log("❌ NFT被其他地址拥有");
      }
    } catch (error) {
      console.log("❌ 无法获取NFT所有者，可能TokenId不存在:", error);
    }

    // 检查NFT合约的批准状态
    console.log("");
    console.log("=== 批准状态检查 ===");
    try {
      const approved = await nft.getApproved(tokenId);
      console.log(`TokenId ${tokenId}的批准地址: ${approved}`);
      
      const isApprovedForAll = await nft.isApprovedForAll(originalOwner, xcmBridgeAddress);
      console.log(`原始所有者是否批准XCMBridge操作所有NFT: ${isApprovedForAll}`);
    } catch (error) {
      console.log("无法检查批准状态:", error);
    }

    // 检查合约是否存在
    console.log("");
    console.log("=== 合约存在性检查 ===");
    const nftCode = await ethers.provider.getCode(nftContract);
    const bridgeCode = await ethers.provider.getCode(xcmBridgeAddress);
    
    console.log(`NFT合约代码长度: ${nftCode.length}`);
    console.log(`XCMBridge合约代码长度: ${bridgeCode.length}`);
    
    if (nftCode === "0x") {
      console.log("❌ NFT合约不存在于当前网络");
    } else {
      console.log("✅ NFT合约存在");
    }
    
    if (bridgeCode === "0x") {
      console.log("❌ XCMBridge合约不存在");
    } else {
      console.log("✅ XCMBridge合约存在");
    }

  } catch (error) {
    console.error("检查失败:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });