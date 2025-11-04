import { ethers } from "hardhat";
import { Contract } from "ethers";

// 合约地址
const MOONBASE_ALPHA_ADDRESSES = {
  XCMBridgeV2: "0xDAdEFa39F00F60987dc1b9D6dC4776839BB52cCF",
  WrappedNFT: "0x184Ad9CF955268e44528629d3d54A4676eE93C94",
  YourCollectible: "0xA8d71101fFFc06C4c1da8700f209a57553116Dea"
};

const POLKADOT_HUB_ADDRESSES = {
  XCMBridgeV2: "0xcF0eCcaEfC1Ba660e28Db7127db6765FE389fC05",
  WrappedNFT: "0xa08125E688F14365E3614fC327b09f3b3976351C",
  YourCollectible: "0xB70435eD04461aA4a70f324ab54e22d4f19af4Ce"
};

async function testCompleteFlow() {
  console.log("🚀 开始测试完整的跨链NFT流程...\n");

  const [deployer] = await ethers.getSigners();
  console.log("测试账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH\n");

  // 获取合约实例
  const xcmBridge = await ethers.getContractAt("XCMBridgeV2", MOONBASE_ALPHA_ADDRESSES.XCMBridgeV2);
  const wrappedNFT = await ethers.getContractAt("WrappedNFT", MOONBASE_ALPHA_ADDRESSES.WrappedNFT);
  const yourCollectible = await ethers.getContractAt("YourCollectible", MOONBASE_ALPHA_ADDRESSES.YourCollectible);

  console.log("📋 合约信息:");
  console.log("XCMBridgeV2:", await xcmBridge.getAddress());
  console.log("WrappedNFT:", await wrappedNFT.getAddress());
  console.log("YourCollectible:", await yourCollectible.getAddress());
  console.log();

  try {
    // 1. 检查现有NFT
    console.log("1️⃣ 检查现有NFT...");
    const totalSupply = await yourCollectible.totalSupply();
    console.log(`总NFT数量: ${totalSupply}`);
    
    let tokenId = 1;
    let owner;
    
    if (totalSupply > 0) {
      // 使用现有的NFT
      tokenId = Number(await yourCollectible.tokenByIndex(0));
      owner = await yourCollectible.ownerOf(tokenId);
      console.log(`✅ 使用现有NFT #${tokenId}，所有者:`, owner);
    } else {
      console.log(`❌ 没有现有NFT，尝试铸造...`);
      
      // 铸造NFT
      const mintTx = await yourCollectible.mintItem(
        deployer.address, 
        "https://example.com/metadata/1",
        250 // 2.5% royalty fee
      );
      await mintTx.wait();
      console.log("✅ NFT铸造成功");
      
      owner = await yourCollectible.ownerOf(tokenId);
      console.log(`✅ NFT #${tokenId} 所有者:`, owner);
    }

    // 2. 检查NFT所有权
    console.log("\n2️⃣ 检查NFT所有权...");
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.log(`⚠️ 当前账户 ${deployer.address} 不是NFT所有者`);
      console.log(`NFT所有者: ${owner}`);
      console.log("跳过需要所有权的测试，继续检查合约配置...");
    } else {
      console.log("✅ 当前账户是NFT所有者，可以进行完整测试");
      
      // 授权NFT给XCMBridge
      const approved = await yourCollectible.getApproved(tokenId);
      if (approved !== await xcmBridge.getAddress()) {
        const approveTx = await yourCollectible.approve(await xcmBridge.getAddress(), tokenId);
        await approveTx.wait();
        console.log("✅ NFT授权成功");
      } else {
        console.log("✅ NFT已授权");
      }
    }

    // 3. 授权NFT合约给XCMBridge
    console.log("\n3️⃣ 检查NFT合约授权...");
    const isAuthorized = await xcmBridge.isContractAuthorized(await yourCollectible.getAddress());
    if (!isAuthorized) {
      console.log("❌ NFT合约未授权，需要管理员授权");
      try {
        const authTx = await xcmBridge.setContractAuthorization(await yourCollectible.getAddress(), true);
        await authTx.wait();
        console.log("✅ NFT合约授权成功");
      } catch (error) {
        console.log("❌ 授权失败:", error.message);
      }
    } else {
      console.log("✅ NFT合约已授权");
    }

    // 4. 锁定NFT并发送跨链消息（仅在拥有NFT时执行）
    console.log("\n4️⃣ 测试锁定NFT功能...");
    if (owner.toLowerCase() === deployer.address.toLowerCase()) {
      const targetChainId = 420420422; // Polkadot Hub TestNet
      const recipient = deployer.address;
      
      try {
        const lockTx = await xcmBridge.lockNFTAndSendMessage(
          await yourCollectible.getAddress(),
          tokenId,
          targetChainId,
          recipient
        );
        const receipt = await lockTx.wait();
        console.log("✅ NFT锁定成功，交易哈希:", receipt.hash);

        // 检查事件
        const events = receipt.logs;
        console.log("📝 交易事件数量:", events.length);
        
        // 检查NFT是否被锁定
        try {
          const newOwner = await yourCollectible.ownerOf(tokenId);
          if (newOwner === await xcmBridge.getAddress()) {
            console.log("✅ NFT已成功锁定到XCMBridge");
          } else {
            console.log("❌ NFT锁定失败，当前所有者:", newOwner);
          }
        } catch (error) {
          console.log("❌ 检查NFT所有者失败:", error.message);
        }

      } catch (error) {
        console.log("❌ 锁定NFT失败:", error.message);
      }
    } else {
      console.log("⚠️ 跳过锁定测试（需要NFT所有权）");
      console.log("💡 要测试锁定功能，请使用NFT所有者账户");
    }

    // 5. 检查跨链NFT记录
    console.log("\n5️⃣ 检查跨链NFT记录...");
    try {
      const crossChainNFT = await xcmBridge.crossChainNFTs(await yourCollectible.getAddress(), tokenId);
      console.log("跨链NFT记录:", {
        originalContract: crossChainNFT.originalContract,
        originalTokenId: crossChainNFT.originalTokenId.toString(),
        originalOwner: crossChainNFT.originalOwner,
        targetChainId: crossChainNFT.targetChainId.toString(),
        isLocked: crossChainNFT.isLocked
      });
    } catch (error) {
      console.log("❌ 获取跨链NFT记录失败:", error.message);
    }

    // 6. 模拟在目标链上的操作
    console.log("\n6️⃣ 模拟目标链操作说明:");
    console.log("📍 在Polkadot Hub TestNet上:");
    console.log("   1. 调用 XCMBridgeV2.mintWrappedNFT() 铸造包装NFT");
    console.log("   2. 包装NFT将铸造给指定的接收者");
    console.log("   3. 用户可以在目标链上使用包装NFT");
    console.log("   4. 要解锁原始NFT，需要调用 burnWrappedNFTAndUnlock()");

    console.log("\n✅ 测试完成！");
    console.log("\n📋 下一步操作:");
    console.log("1. 切换到Polkadot Hub TestNet");
    console.log("2. 运行相应的铸造和销毁测试");
    console.log("3. 验证完整的跨链流程");

  } catch (error) {
    console.error("❌ 测试过程中发生错误:", error);
  }
}

// 运行测试
testCompleteFlow()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });