const { ethers } = require("hardhat");

async function main() {
  console.log("Testing Wrapped NFT functionality...");

  // Get deployed contract addresses
  const moonbaseAlphaChainId = 1287;
  const polkadotHubTestnetChainId = 420420422;

  // Contract addresses
  const moonbaseXCMBridgeV2Address = "0x1519c05ABD62bdcc2adf7c9028Dc0260755B021a";
  const moonbaseWrappedNFTAddress = "0x88A4dcB01B775c2509E32e03452Ced4022be4eeC";
  
  const polkadotXCMBridgeV2Address = "0x73C506D96F474653f7bEbDDDf2b92AC95983e1E0";
  const polkadotWrappedNFTAddress = "0xfB5919787800552eBc98980fB84531c89dDaaA14";

  // Get contract instances
  const XCMBridgeV2 = await ethers.getContractFactory("XCMBridgeV2");
  const WrappedNFT = await ethers.getContractFactory("WrappedNFT");

  try {
    // Test on current network
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    console.log(`Testing on network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`Deployer address: ${deployer.address}`);

    let xcmBridge, wrappedNFT, currentChainId;

    if (network.chainId == moonbaseAlphaChainId) {
      xcmBridge = XCMBridgeV2.attach(moonbaseXCMBridgeV2Address);
      wrappedNFT = WrappedNFT.attach(moonbaseWrappedNFTAddress);
      currentChainId = moonbaseAlphaChainId;
      console.log("Using Moonbase Alpha contracts");
    } else if (network.chainId == polkadotHubTestnetChainId) {
      xcmBridge = XCMBridgeV2.attach(polkadotXCMBridgeV2Address);
      wrappedNFT = WrappedNFT.attach(polkadotWrappedNFTAddress);
      currentChainId = polkadotHubTestnetChainId;
      console.log("Using Polkadot Hub Testnet contracts");
    } else {
      throw new Error(`Unsupported network: ${network.chainId}`);
    }

    // Test 1: Check if wrapped NFT contract is set in XCMBridge
    console.log("\n=== Test 1: Checking wrapped NFT contract configuration ===");
    try {
      const wrappedNFTContractAddress = await xcmBridge.wrappedNFTContracts(currentChainId);
      console.log(`Wrapped NFT contract for chain ${currentChainId}: ${wrappedNFTContractAddress}`);
      
      if (wrappedNFTContractAddress.toLowerCase() === wrappedNFT.target.toLowerCase()) {
        console.log("✅ Wrapped NFT contract is correctly configured");
      } else {
        console.log("❌ Wrapped NFT contract address mismatch");
        console.log(`Expected: ${wrappedNFT.target}`);
        console.log(`Actual: ${wrappedNFTContractAddress}`);
      }
    } catch (error) {
      console.log("❌ Error checking wrapped NFT contract:", error.message);
    }

    // Test 2: Check if XCMBridge is set as the bridge in WrappedNFT
    console.log("\n=== Test 2: Checking XCM Bridge configuration in WrappedNFT ===");
    try {
      const bridgeAddress = await wrappedNFT.xcmBridge();
      console.log(`XCM Bridge address in WrappedNFT: ${bridgeAddress}`);
      
      if (bridgeAddress.toLowerCase() === xcmBridge.target.toLowerCase()) {
        console.log("✅ XCM Bridge is correctly configured in WrappedNFT");
      } else {
        console.log("❌ XCM Bridge address mismatch in WrappedNFT");
        console.log(`Expected: ${xcmBridge.target}`);
        console.log(`Actual: ${bridgeAddress}`);
      }
    } catch (error) {
      console.log("❌ Error checking XCM Bridge in WrappedNFT:", error.message);
    }

    // Test 3: Check contract ownership
    console.log("\n=== Test 3: Checking contract ownership ===");
    try {
      const xcmBridgeOwner = await xcmBridge.owner();
      const wrappedNFTOwner = await wrappedNFT.owner();
      
      console.log(`XCMBridge owner: ${xcmBridgeOwner}`);
      console.log(`WrappedNFT owner: ${wrappedNFTOwner}`);
      console.log(`Current deployer: ${deployer.address}`);
      
      if (xcmBridgeOwner.toLowerCase() === deployer.address.toLowerCase()) {
        console.log("✅ XCMBridge ownership is correct");
      } else {
        console.log("⚠️  XCMBridge owner is different from deployer");
      }
      
      if (wrappedNFTOwner.toLowerCase() === deployer.address.toLowerCase()) {
        console.log("✅ WrappedNFT ownership is correct");
      } else {
        console.log("⚠️  WrappedNFT owner is different from deployer");
      }
    } catch (error) {
      console.log("❌ Error checking ownership:", error.message);
    }

    console.log("\n=== Test Summary ===");
    console.log("All configuration tests completed. Check the results above.");

  } catch (error) {
    console.error("Error during testing:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });