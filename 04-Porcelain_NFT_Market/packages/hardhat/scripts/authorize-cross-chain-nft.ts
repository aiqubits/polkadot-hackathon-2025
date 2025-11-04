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
  
  console.log(`\n🔗 Authorizing cross-chain NFT contracts on Chain ID: ${chainId}`);
  
  let xcmBridgeAddress: string;
  let sourceNFTAddress: string;
  let networkName: string;
  
  if (chainId === 1287) { // Moonbase Alpha
    xcmBridgeAddress = MOONBASE_ALPHA_CONTRACTS.XCMBridge;
    sourceNFTAddress = POLKADOT_HUB_CONTRACTS.YourCollectible;
    networkName = "Moonbase Alpha";
  } else if (chainId === 420420422) { // Polkadot Hub TestNet
    xcmBridgeAddress = POLKADOT_HUB_CONTRACTS.XCMBridge;
    sourceNFTAddress = MOONBASE_ALPHA_CONTRACTS.YourCollectible;
    networkName = "Polkadot Hub TestNet";
  } else {
    throw new Error(`Unsupported network: ${chainId}`);
  }

  console.log(`📍 Network: ${networkName}`);
  console.log(`🔗 XCMBridge Address: ${xcmBridgeAddress}`);
  console.log(`🌐 Source NFT Address to authorize: ${sourceNFTAddress}`);

  // Get XCMBridge contract
  const XCMBridge = await ethers.getContractFactory("XCMBridge");
  const xcmBridge = XCMBridge.attach(xcmBridgeAddress);

  // Check current authorization status
  const currentAuth = await xcmBridge.authorizedContracts(sourceNFTAddress);
  console.log(`\n📋 Current authorization status: ${currentAuth}`);

  if (currentAuth) {
    console.log("✅ Contract is already authorized!");
    return;
  }

  // Authorize the source NFT contract
  console.log("\n🔄 Authorizing source NFT contract...");
  const tx = await xcmBridge.setContractAuthorization(sourceNFTAddress, true);
  console.log(`📤 Transaction sent: ${tx.hash}`);
  
  const receipt = await tx.wait();
  console.log(`✅ Transaction confirmed in block: ${receipt?.blockNumber}`);

  // Verify authorization
  const newAuth = await xcmBridge.authorizedContracts(sourceNFTAddress);
  console.log(`\n🎉 New authorization status: ${newAuth}`);
  
  if (newAuth) {
    console.log(`✅ Successfully authorized ${sourceNFTAddress} on ${networkName}!`);
  } else {
    console.log(`❌ Authorization failed!`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });