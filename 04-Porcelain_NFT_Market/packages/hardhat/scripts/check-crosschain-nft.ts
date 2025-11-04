import { ethers } from "hardhat";
import { XCMBridge } from "../typechain-types";

async function main() {
  const messageHash = "0x294da1ef653bbc4d61c121fd69a8936f517e0ff19c8e4f308e678d482b9eef10";
  const xcmBridgeAddress = "0xad004515E7aC3081cd56604A37FE7950A2d04B2D";
  const userAddress = "0xBfADd27C429466e4E50c8A161Bf82d1C43b4D616";

  console.log("=== 检查CrossChainNFT记录状态 ===");
  console.log(`MessageHash: ${messageHash}`);
  console.log(`XCMBridge地址: ${xcmBridgeAddress}`);
  console.log(`用户地址: ${userAddress}`);
  console.log("");

  // 获取XCMBridge合约实例
  const XCMBridge = await ethers.getContractFactory("XCMBridge");
  const xcmBridge = XCMBridge.attach(xcmBridgeAddress) as XCMBridge;

  try {
    // 获取CrossChainNFT记录
    const nftInfo = await xcmBridge.crossChainNFTs(messageHash);
    
    console.log("CrossChainNFT记录:");
    console.log(`- 原始合约: ${nftInfo.originalContract}`);
    console.log(`- 原始TokenId: ${nftInfo.originalTokenId.toString()}`);
    console.log(`- 原始所有者: ${nftInfo.originalOwner}`);
    console.log(`- 源链ID: ${nftInfo.sourceChainId}`);
    console.log(`- 目标链ID: ${nftInfo.destinationChainId}`);
    console.log(`- 是否锁定: ${nftInfo.isLocked}`);
    console.log(`- 时间戳: ${new Date(Number(nftInfo.timestamp) * 1000).toLocaleString()}`);
    console.log("");

    // 检查记录是否存在（通过检查原始合约地址是否为零地址）
    const isRecordExists = nftInfo.originalContract !== ethers.ZeroAddress;
    console.log(`记录是否存在: ${isRecordExists}`);
    
    if (isRecordExists) {
      // 检查用户是否为原始所有者
      const isOriginalOwner = nftInfo.originalOwner.toLowerCase() === userAddress.toLowerCase();
      console.log(`用户是否为原始所有者: ${isOriginalOwner}`);
      
      // 检查NFT是否锁定
      console.log(`NFT是否锁定: ${nftInfo.isLocked}`);
      
      // 检查解锁条件
      console.log("");
      console.log("=== 解锁条件检查 ===");
      if (!isRecordExists) {
        console.log("❌ 记录不存在");
      } else if (!nftInfo.isLocked) {
        console.log("❌ NFT未锁定或已解锁");
      } else if (!isOriginalOwner) {
        console.log("❌ 用户不是原始所有者");
      } else {
        console.log("✅ 所有解锁条件满足");
      }
    } else {
      console.log("❌ 该messageHash没有对应的CrossChainNFT记录");
    }

    // 检查XCM消息记录
    console.log("");
    console.log("=== XCM消息记录 ===");
    try {
      const xcmMessage = await xcmBridge.xcmMessages(messageHash);
      console.log(`消息类型: ${xcmMessage.messageType}`);
      console.log(`NFT合约: ${xcmMessage.nftContract}`);
      console.log(`TokenId: ${xcmMessage.tokenId.toString()}`);
      console.log(`接收者: ${xcmMessage.recipient}`);
      console.log(`源链ID: ${xcmMessage.sourceChainId}`);
      console.log(`目标链ID: ${xcmMessage.destinationChainId}`);
      console.log(`是否已处理: ${xcmMessage.processed}`);
    } catch (error) {
      console.log("无法获取XCM消息记录:", error);
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