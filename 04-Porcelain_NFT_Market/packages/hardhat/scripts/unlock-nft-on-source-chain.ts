import { ethers } from "hardhat";
import { XCMBridge } from "../typechain-types";

async function main() {
  const messageHash = "0x294da1ef653bbc4d61c121fd69a8936f517e0ff19c8e4f308e678d482b9eef10";
  
  // Moonbase Alpha上的XCMBridge地址
  const xcmBridgeAddress = "0x737E65458Ee133815D03A886f174cAb2dA2bd4f5";
  
  console.log("=== 在源链（Moonbase Alpha）上解锁NFT ===");
  console.log(`MessageHash: ${messageHash}`);
  console.log(`XCMBridge地址: ${xcmBridgeAddress}`);
  console.log("");

  // 获取签名者
  const [signer] = await ethers.getSigners();
  console.log(`签名者地址: ${signer.address}`);

  // 获取XCMBridge合约实例
  const XCMBridge = await ethers.getContractFactory("XCMBridge");
  const xcmBridge = XCMBridge.attach(xcmBridgeAddress) as XCMBridge;

  try {
    // 首先检查CrossChainNFT记录
    console.log("检查CrossChainNFT记录...");
    const nftInfo = await xcmBridge.crossChainNFTs(messageHash);
    
    console.log(`原始合约: ${nftInfo.originalContract}`);
    console.log(`原始TokenId: ${nftInfo.originalTokenId.toString()}`);
    console.log(`原始所有者: ${nftInfo.originalOwner}`);
    console.log(`是否锁定: ${nftInfo.isLocked}`);
    console.log("");

    // 检查记录是否存在
    if (nftInfo.originalContract === ethers.ZeroAddress) {
      console.log("❌ 该messageHash没有对应的CrossChainNFT记录");
      return;
    }

    if (!nftInfo.isLocked) {
      console.log("❌ NFT未锁定或已解锁");
      return;
    }

    if (nftInfo.originalOwner.toLowerCase() !== signer.address.toLowerCase()) {
      console.log("❌ 当前签名者不是原始所有者");
      console.log(`需要的地址: ${nftInfo.originalOwner}`);
      console.log(`当前地址: ${signer.address}`);
      return;
    }

    // 检查XCMBridge是否拥有NFT
    console.log("检查NFT所有权...");
    const ERC721 = await ethers.getContractFactory("YourCollectible");
    const nft = ERC721.attach(nftInfo.originalContract);
    
    const currentOwner = await nft.ownerOf(nftInfo.originalTokenId);
    console.log(`NFT当前所有者: ${currentOwner}`);
    
    if (currentOwner.toLowerCase() !== xcmBridgeAddress.toLowerCase()) {
      console.log("❌ XCMBridge不拥有此NFT，无法解锁");
      return;
    }

    console.log("✅ 所有条件满足，开始解锁NFT...");
    
    // 执行解锁
    const tx = await xcmBridge.unlockNFT(messageHash);
    console.log(`交易已发送: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`交易已确认，区块: ${receipt?.blockNumber}`);
    
    // 验证解锁结果
    const updatedNftInfo = await xcmBridge.crossChainNFTs(messageHash);
    const newOwner = await nft.ownerOf(nftInfo.originalTokenId);
    
    console.log("");
    console.log("=== 解锁结果 ===");
    console.log(`NFT锁定状态: ${updatedNftInfo.isLocked}`);
    console.log(`NFT新所有者: ${newOwner}`);
    
    if (!updatedNftInfo.isLocked && newOwner.toLowerCase() === signer.address.toLowerCase()) {
      console.log("🎉 NFT解锁成功！");
    } else {
      console.log("❌ 解锁可能失败，请检查状态");
    }

  } catch (error) {
    console.error("解锁失败:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });