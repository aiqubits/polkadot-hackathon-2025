import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  // Contract addresses for different networks
  const MOONBASE_ALPHA_CONTRACTS = {
    XCMBridge: "0x737E65458Ee133815D03A886f174cAb2dA2bd4f5",
    YourCollectible: "0xA8d71101fFFc06C4c1da8700f209a57553116Dea"
  };

  const POLKADOT_HUB_CONTRACTS = {
    XCMBridge: "0xad004515E7aC3081cd56604A37FE7950A2d04B2D",
    YourCollectible: "0xB70435eD04461aA4a70f324ab54e22d4f19af4Ce"
  };

  // Get network info
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  console.log(`\n🔍 Checking authorization on Chain ID: ${chainId}`);
  
  let xcmBridgeAddress: string;
  let localNFTAddress: string;
  let sourceNFTAddress: string;
  
  if (chainId === 1287) { // Moonbase Alpha
    xcmBridgeAddress = MOONBASE_ALPHA_CONTRACTS.XCMBridge;
    localNFTAddress = MOONBASE_ALPHA_CONTRACTS.YourCollectible;
    sourceNFTAddress = POLKADOT_HUB_CONTRACTS.YourCollectible;
    console.log("📍 Network: Moonbase Alpha");
  } else if (chainId === 420420422) { // Polkadot Hub TestNet
    xcmBridgeAddress = POLKADOT_HUB_CONTRACTS.XCMBridge;
    localNFTAddress = POLKADOT_HUB_CONTRACTS.YourCollectible;
    sourceNFTAddress = MOONBASE_ALPHA_CONTRACTS.YourCollectible;
    console.log("📍 Network: Polkadot Hub TestNet");
  } else {
    throw new Error(`Unsupported network: ${chainId}`);
  }

  // Get XCMBridge contract
  const XCMBridge = await ethers.getContractFactory("XCMBridge");
  const xcmBridge = XCMBridge.attach(xcmBridgeAddress);

  console.log(`\n🔗 XCMBridge Address: ${xcmBridgeAddress}`);
  console.log(`📦 Local NFT Address: ${localNFTAddress}`);
  console.log(`🌐 Source NFT Address: ${sourceNFTAddress}`);

  // Check authorization for local NFT contract
  const localAuthorized = await xcmBridge.authorizedContracts(localNFTAddress);
  console.log(`\n✅ Local NFT Contract (${localNFTAddress}) authorized: ${localAuthorized}`);

  // Check authorization for source NFT contract (cross-chain)
  const sourceAuthorized = await xcmBridge.authorizedContracts(sourceNFTAddress);
  console.log(`🌐 Source NFT Contract (${sourceNFTAddress}) authorized: ${sourceAuthorized}`);

  if (!sourceAuthorized) {
    console.log(`\n⚠️  Source NFT contract is NOT authorized on this chain!`);
    console.log(`   This will cause "Contract not authorized" error in processXCMMessage`);
    console.log(`   Need to authorize: ${sourceNFTAddress}`);
  } else {
    console.log(`\n✅ All contracts are properly authorized!`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });