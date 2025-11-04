import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * 部署XCMBridgeV2和WrappedNFT合约
 * 
 * @param hre HardhatRuntimeEnvironment对象
 */
const deployXCMV2: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const { ethers } = hre;

  console.log("\n🚀 开始部署XCMBridgeV2和WrappedNFT合约...");
  console.log("部署者地址:", deployer);
  console.log("网络:", hre.network.name);

  // 获取链ID
  const chainId = await hre.getChainId();
  console.log("链ID:", chainId);

  // 部署XCMBridgeV2合约
  console.log("\n📦 部署XCMBridgeV2合约...");
  const xcmBridgeV2Result = await deploy("XCMBridgeV2", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  console.log("✅ XCMBridgeV2合约已部署到:", xcmBridgeV2Result.address);

  // 部署WrappedNFT合约
  console.log("\n📦 部署WrappedNFT合约...");
  
  // 根据网络设置不同的名称和符号
  let wrappedNFTName: string;
  let wrappedNFTSymbol: string;
  
  if (hre.network.name === "moonbaseAlpha") {
    wrappedNFTName = "Wrapped Polkadot Hub NFT";
    wrappedNFTSymbol = "wPHNFT";
  } else if (hre.network.name === "polkadotHubTestnet") {
    wrappedNFTName = "Wrapped Moonbase Alpha NFT";
    wrappedNFTSymbol = "wMANFT";
  } else {
    wrappedNFTName = "Wrapped Cross-Chain NFT";
    wrappedNFTSymbol = "wXCNFT";
  }

  const wrappedNFTResult = await deploy("WrappedNFT", {
    from: deployer,
    args: [wrappedNFTName, wrappedNFTSymbol, xcmBridgeV2Result.address],
    log: true,
    autoMine: true,
  });

  console.log("✅ WrappedNFT合约已部署到:", wrappedNFTResult.address);

  // 获取合约实例
  const xcmBridgeV2 = await ethers.getContract<Contract>("XCMBridgeV2", deployer);

  // 配置XCMBridgeV2合约
  console.log("\n⚙️  配置XCMBridgeV2合约...");

  // 设置包装NFT合约地址
  const currentChainId = parseInt(chainId);
  console.log(`设置链ID ${currentChainId} 的包装NFT合约地址...`);
  const setWrappedContractTx = await xcmBridgeV2.setWrappedNFTContract(currentChainId, wrappedNFTResult.address);
  await setWrappedContractTx.wait();
  console.log("✅ 包装NFT合约地址已设置");

  // 检查是否存在YourCollectible合约并授权
  try {
    const yourCollectible = await ethers.getContract("YourCollectible");
    console.log(`发现YourCollectible合约: ${yourCollectible.target}`);
    
    // 授权YourCollectible合约
    console.log("授权YourCollectible合约进行跨链转移...");
    const authorizeTx = await xcmBridgeV2.setContractAuthorization(yourCollectible.target, true);
    await authorizeTx.wait();
    console.log("✅ YourCollectible合约已授权");
  } catch (error) {
    console.log("⚠️  未找到YourCollectible合约，跳过授权");
  }

  // 根据网络授权对方链的NFT合约
  if (hre.network.name === "moonbaseAlpha") {
    // 在Moonbase Alpha上，授权Polkadot Hub TestNet的NFT合约
    const polkadotHubNFTAddress = "0xB70435eD04461aA4a70f324ab54e22d4f19af4Ce";
    console.log(`授权Polkadot Hub TestNet NFT合约: ${polkadotHubNFTAddress}`);
    try {
      const authorizeCrossChainTx = await xcmBridgeV2.setContractAuthorization(polkadotHubNFTAddress, true);
      await authorizeCrossChainTx.wait();
      console.log("✅ Polkadot Hub TestNet NFT合约已授权");
    } catch (error) {
      console.log("⚠️  授权Polkadot Hub TestNet NFT合约失败:", error);
    }
  } else if (hre.network.name === "polkadotHubTestnet") {
    // 在Polkadot Hub TestNet上，授权Moonbase Alpha的NFT合约
    const moonbaseAlphaNFTAddress = "0xA8d71101fFFc06C4c1da8700f209a57553116Dea";
    console.log(`授权Moonbase Alpha NFT合约: ${moonbaseAlphaNFTAddress}`);
    try {
      const authorizeCrossChainTx = await xcmBridgeV2.setContractAuthorization(moonbaseAlphaNFTAddress, true);
      await authorizeCrossChainTx.wait();
      console.log("✅ Moonbase Alpha NFT合约已授权");
    } catch (error) {
      console.log("⚠️  授权Moonbase Alpha NFT合约失败:", error);
    }
  }

  console.log("\n🎉 XCMBridgeV2和WrappedNFT合约部署完成!");
  console.log("📋 部署摘要:");
  console.log(`   XCMBridgeV2: ${xcmBridgeV2Result.address}`);
  console.log(`   WrappedNFT: ${wrappedNFTResult.address}`);
  console.log(`   网络: ${hre.network.name}`);
  console.log(`   链ID: ${chainId}`);
};

export default deployXCMV2;
deployXCMV2.tags = ["XCMBridgeV2", "WrappedNFT", "CrossChainV2"];