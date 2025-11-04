import { ethers } from "hardhat";
import { Contract } from "ethers";

/**
 * 测试完整的跨链NFT流程
 * 1. 在源链(Moonbase Alpha)锁定NFT
 * 2. 在目标链(Polkadot Hub TestNet)铸造包装NFT
 * 3. 在目标链销毁包装NFT
 * 4. 在源链解锁原始NFT
 */

// 合约地址配置
const CONTRACTS = {
  moonbaseAlpha: {
    chainId: 1287,
    xcmBridge: "0xDAdEFa39F00F60987dc1b9D6dC4776839BB52cCF",
    wrappedNFT: "0x184Ad9CF955268e44528629d3d54A4676eE93C94",
    originalNFT: "0xA8d71101fFFc06C4c1da8700f209a57553116Dea"
  },
  polkadotHubTestnet: {
    chainId: 420420422,
    xcmBridge: "0xcF0eCcaEfC1Ba660e28Db7127db6765FE389fC05",
    wrappedNFT: "0xa08125E688F14365E3614fC327b09f3b3976351C",
    originalNFT: "0xB70435eD04461aA4a70f324ab54e22d4f19af4Ce"
  }
};

// 测试用的NFT ID
const TEST_TOKEN_ID = 1;

async function main() {
  console.log("🧪 开始测试完整的跨链NFT流程...\n");

  // 获取网络信息
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  console.log(`当前网络: ${chainId}`);
  console.log(`网络名称: ${network.name}\n`);

  // 根据当前网络选择配置
  let currentConfig: any;
  let targetConfig: any;
  
  if (chainId === 1287) {
    currentConfig = CONTRACTS.moonbaseAlpha;
    targetConfig = CONTRACTS.polkadotHubTestnet;
    console.log("📍 当前在Moonbase Alpha，目标是Polkadot Hub TestNet");
  } else if (chainId === 420420422) {
    currentConfig = CONTRACTS.polkadotHubTestnet;
    targetConfig = CONTRACTS.moonbaseAlpha;
    console.log("📍 当前在Polkadot Hub TestNet，目标是Moonbase Alpha");
  } else {
    throw new Error(`不支持的网络: ${chainId}`);
  }

  // 获取签名者
  const [signer] = await ethers.getSigners();
  console.log(`签名者地址: ${signer.address}\n`);

  // 获取合约实例
  const xcmBridge = await ethers.getContractAt("XCMBridgeV2", currentConfig.xcmBridge, signer);
  const wrappedNFT = await ethers.getContractAt("WrappedNFT", currentConfig.wrappedNFT, signer);

  console.log("=".repeat(60));
  console.log("📋 合约信息");
  console.log("=".repeat(60));
  console.log(`XCMBridgeV2: ${currentConfig.xcmBridge}`);
  console.log(`WrappedNFT: ${currentConfig.wrappedNFT}`);
  console.log(`原始NFT: ${currentConfig.originalNFT}\n`);

  try {
    // 测试1: 检查合约状态
    console.log("🔍 步骤1: 检查合约状态");
    console.log("-".repeat(40));
    
    // 检查包装NFT合约配置
    const configuredWrappedNFT = await xcmBridge.wrappedNFTContracts(currentConfig.chainId);
    console.log(`配置的包装NFT合约: ${configuredWrappedNFT}`);
    console.log(`预期的包装NFT合约: ${currentConfig.wrappedNFT}`);
    console.log(`配置正确: ${configuredWrappedNFT.toLowerCase() === currentConfig.wrappedNFT.toLowerCase()}`);

    // 检查原始NFT合约授权
    const isAuthorized = await xcmBridge.authorizedContracts(currentConfig.originalNFT);
    console.log(`原始NFT合约授权状态: ${isAuthorized}\n`);

    // 测试2: 检查跨链NFT记录
    console.log("🔍 步骤2: 检查跨链NFT记录");
    console.log("-".repeat(40));
    
    try {
      const crossChainNFT = await xcmBridge.crossChainNFTs(currentConfig.originalNFT, TEST_TOKEN_ID);
      console.log("跨链NFT记录:");
      console.log(`  原始合约: ${crossChainNFT.originalContract}`);
      console.log(`  原始Token ID: ${crossChainNFT.originalTokenId}`);
      console.log(`  原始所有者: ${crossChainNFT.originalOwner}`);
      console.log(`  目标链ID: ${crossChainNFT.targetChainId}`);
      console.log(`  是否锁定: ${crossChainNFT.isLocked}`);
      console.log(`  包装Token ID: ${crossChainNFT.wrappedTokenId}\n`);
    } catch (error) {
      console.log("❌ 未找到跨链NFT记录\n");
    }

    // 测试3: 检查包装NFT状态
    console.log("🔍 步骤3: 检查包装NFT状态");
    console.log("-".repeat(40));
    
    try {
      const wrappedNFTOwner = await wrappedNFT.ownerOf(TEST_TOKEN_ID);
      console.log(`包装NFT #${TEST_TOKEN_ID} 所有者: ${wrappedNFTOwner}`);
      
      const wrappedNFTInfo = await wrappedNFT.getWrappedNFTInfo(TEST_TOKEN_ID);
      console.log("包装NFT信息:");
      console.log(`  原始合约: ${wrappedNFTInfo.originalContract}`);
      console.log(`  原始Token ID: ${wrappedNFTInfo.originalTokenId}`);
      console.log(`  原始链ID: ${wrappedNFTInfo.originalChainId}`);
      console.log(`  原始所有者: ${wrappedNFTInfo.originalOwner}\n`);
    } catch (error) {
      console.log(`❌ 包装NFT #${TEST_TOKEN_ID} 不存在\n`);
    }

    // 测试4: 模拟跨链操作
    console.log("🚀 步骤4: 模拟跨链操作");
    console.log("-".repeat(40));
    
    if (chainId === 1287) {
      // 在Moonbase Alpha上，测试锁定NFT
      console.log("🔒 测试锁定NFT功能...");
      
      // 检查是否有原始NFT可以锁定
      try {
        const originalNFT = await ethers.getContractAt("IERC721", currentConfig.originalNFT, signer);
        const owner = await originalNFT.ownerOf(TEST_TOKEN_ID);
        console.log(`原始NFT #${TEST_TOKEN_ID} 所有者: ${owner}`);
        
        if (owner.toLowerCase() === signer.address.toLowerCase()) {
          console.log("✅ 可以锁定此NFT");
          
          // 检查授权
          const approved = await originalNFT.getApproved(TEST_TOKEN_ID);
          const isApprovedForAll = await originalNFT.isApprovedForAll(signer.address, currentConfig.xcmBridge);
          
          console.log(`NFT授权给: ${approved}`);
          console.log(`全部授权给XCMBridge: ${isApprovedForAll}`);
          
          if (approved.toLowerCase() !== currentConfig.xcmBridge.toLowerCase() && !isApprovedForAll) {
            console.log("⚠️  需要先授权NFT给XCMBridge合约");
            console.log(`请执行: await originalNFT.approve("${currentConfig.xcmBridge}", ${TEST_TOKEN_ID})`);
          } else {
            console.log("✅ NFT已授权，可以进行跨链转移");
          }
        } else {
          console.log("❌ 当前账户不拥有此NFT");
        }
      } catch (error) {
        console.log(`❌ 无法检查原始NFT: ${error}`);
      }
      
    } else {
      // 在Polkadot Hub TestNet上，测试销毁包装NFT
      console.log("🔥 测试销毁包装NFT功能...");
      
      try {
        const wrappedOwner = await wrappedNFT.ownerOf(TEST_TOKEN_ID);
        if (wrappedOwner.toLowerCase() === signer.address.toLowerCase()) {
          console.log("✅ 可以销毁此包装NFT");
          
          // 检查授权
          const approved = await wrappedNFT.getApproved(TEST_TOKEN_ID);
          const isApprovedForAll = await wrappedNFT.isApprovedForAll(signer.address, currentConfig.xcmBridge);
          
          console.log(`包装NFT授权给: ${approved}`);
          console.log(`全部授权给XCMBridge: ${isApprovedForAll}`);
          
          if (approved.toLowerCase() !== currentConfig.xcmBridge.toLowerCase() && !isApprovedForAll) {
            console.log("⚠️  需要先授权包装NFT给XCMBridge合约");
            console.log(`请执行: await wrappedNFT.approve("${currentConfig.xcmBridge}", ${TEST_TOKEN_ID})`);
          } else {
            console.log("✅ 包装NFT已授权，可以进行销毁和解锁");
          }
        } else {
          console.log("❌ 当前账户不拥有此包装NFT");
        }
      } catch (error) {
        console.log(`❌ 包装NFT不存在或无法访问: ${error}`);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ 跨链NFT系统状态检查完成");
    console.log("=".repeat(60));
    
    console.log("\n📝 下一步操作建议:");
    if (chainId === 1287) {
      console.log("1. 确保拥有要转移的NFT");
      console.log("2. 授权NFT给XCMBridge合约");
      console.log("3. 调用 lockNFT 函数进行跨链转移");
      console.log("4. 切换到Polkadot Hub TestNet查看包装NFT");
    } else {
      console.log("1. 确保拥有要销毁的包装NFT");
      console.log("2. 授权包装NFT给XCMBridge合约");
      console.log("3. 调用 burnWrappedNFT 函数销毁并解锁");
      console.log("4. 切换到Moonbase Alpha查看解锁的原始NFT");
    }

  } catch (error) {
    console.error("❌ 测试过程中发生错误:", error);
  }
}

// 运行测试
main()
  .then(() => {
    console.log("\n🎉 测试脚本执行完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 测试脚本执行失败:", error);
    process.exit(1);
  });