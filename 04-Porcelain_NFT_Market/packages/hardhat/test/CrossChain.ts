//
// Cross-Chain NFT Bridge and Marketplace Tests
//

import { ethers } from "hardhat";
import { expect } from "chai";
import { YourCollectible, XCMBridge, CrossChainMarketplace } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("🌉 Cross-Chain NFT Bridge & Marketplace Tests", function () {
  let yourCollectible: YourCollectible;
  let xcmBridge: XCMBridge;
  let marketplace: CrossChainMarketplace;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let feeRecipient: SignerWithAddress;

  const POLKADOT_HUB_CHAIN_ID = 420420422;
  const MOONBASE_ALPHA_CHAIN_ID = 1287;
  const ROYALTY_FEE = 250; // 2.5%

  beforeEach(async function () {
    [owner, user1, user2, feeRecipient] = await ethers.getSigners();

    console.log("🚀 Deploying contracts...");

    // Deploy YourCollectible
    const YourCollectibleFactory = await ethers.getContractFactory("YourCollectible");
    yourCollectible = await YourCollectibleFactory.deploy();
    console.log("✅ YourCollectible deployed to:", await yourCollectible.getAddress());

    // Deploy XCM Bridge
    const XCMBridgeFactory = await ethers.getContractFactory("XCMBridge");
    xcmBridge = await XCMBridgeFactory.deploy();
    console.log("✅ XCM Bridge deployed to:", await xcmBridge.getAddress());

    // Deploy Cross-Chain Marketplace
    const MarketplaceFactory = await ethers.getContractFactory("CrossChainMarketplace");
    marketplace = await MarketplaceFactory.deploy(
      await xcmBridge.getAddress(),
      feeRecipient.address
    );
    console.log("✅ Cross-Chain Marketplace deployed to:", await marketplace.getAddress());

    // Setup authorizations and configurations
    await xcmBridge.setContractAuthorization(await yourCollectible.getAddress(), true);
    await xcmBridge.setChainSupport(POLKADOT_HUB_CHAIN_ID, true);
    await xcmBridge.setChainSupport(MOONBASE_ALPHA_CHAIN_ID, true);

    console.log("🔧 Contracts configured successfully");
  });

  describe("YourCollectible Basic Functions", function () {
    it("Should mint NFT with royalty", async function () {
      const tokenURI = "QmTestHash123";
      
      const tx = await yourCollectible.connect(user1).mintItem(
        user1.address,
        tokenURI,
        ROYALTY_FEE
      );
      
      await tx.wait();
      
      expect(await yourCollectible.balanceOf(user1.address)).to.equal(1);
      expect(await yourCollectible.ownerOf(1)).to.equal(user1.address);
      
      // Check royalty info
      const [receiver, royaltyAmount] = await yourCollectible.royaltyInfo(1, ethers.parseEther("1"));
      expect(receiver).to.equal(user1.address);
      expect(royaltyAmount).to.equal(ethers.parseEther("0.025")); // 2.5% of 1 ETH
    });

    it("Should list and buy NFT", async function () {
      // Mint NFT
      await yourCollectible.connect(user1).mintItem(user1.address, "QmTestHash123", ROYALTY_FEE);
      
      // List NFT
      const listingFee = ethers.parseEther("0.025");
      const price = ethers.parseEther("1");
      
      await yourCollectible.connect(user1).listItem(1, price, { value: listingFee });
      
      // Check listing
      const nftItem = await yourCollectible.getNFTItemByTokenId(1);
      expect(nftItem.isListed).to.be.true;
      expect(nftItem.price).to.equal(price);
      
      // Buy NFT
      await yourCollectible.connect(user2).buyItem(1, { value: price });
      
      // Check ownership transfer
      expect(await yourCollectible.ownerOf(1)).to.equal(user2.address);
    });
  });

  describe("XCM Bridge Functions", function () {
    beforeEach(async function () {
      // Mint NFT for testing
      await yourCollectible.connect(user1).mintItem(user1.address, "QmTestHash123", ROYALTY_FEE);
      
      // Approve bridge to transfer NFT
      await yourCollectible.connect(user1).approve(await xcmBridge.getAddress(), 1);
    });

    it("Should lock NFT for cross-chain transfer", async function () {
      const tx = await xcmBridge.connect(user1).lockNFT(
        await yourCollectible.getAddress(),
        1,
        MOONBASE_ALPHA_CHAIN_ID
      );
      
      const receipt = await tx.wait();
      
      // Check that NFT is now owned by bridge
      expect(await yourCollectible.ownerOf(1)).to.equal(await xcmBridge.getAddress());
      
      // Check event emission
      const events = receipt?.logs || [];
      expect(events.length).to.be.greaterThan(0);
    });

    it("Should unlock NFT from cross-chain", async function () {
      // First lock the NFT
      const lockTx = await xcmBridge.connect(user1).lockNFT(
        await yourCollectible.getAddress(),
        1,
        MOONBASE_ALPHA_CHAIN_ID
      );
      
      const lockReceipt = await lockTx.wait();
      
      // Extract message hash from events (simplified for test)
      const messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "uint256", "address", "uint256", "uint32", "uint256"],
          [
            await yourCollectible.getAddress(),
            1,
            user1.address,
            await ethers.provider.getNetwork().then(n => n.chainId),
            MOONBASE_ALPHA_CHAIN_ID,
            (await ethers.provider.getBlock("latest"))?.timestamp || 0
          ]
        )
      );
      
      // Unlock NFT (simulating cross-chain message)
      await xcmBridge.connect(owner).unlockNFT(messageHash);
      
      // Check that NFT is returned to original owner
      expect(await yourCollectible.ownerOf(1)).to.equal(user1.address);
    });

    it("Should handle contract authorization", async function () {
      // Test unauthorized contract
      const UnauthorizedFactory = await ethers.getContractFactory("YourCollectible");
      const unauthorizedContract = await UnauthorizedFactory.deploy();
      
      await expect(
        xcmBridge.connect(user1).lockNFT(
          await unauthorizedContract.getAddress(),
          1,
          MOONBASE_ALPHA_CHAIN_ID
        )
      ).to.be.revertedWith("Contract not authorized");
      
      // Authorize contract
      await xcmBridge.setContractAuthorization(await unauthorizedContract.getAddress(), true);
      
      // Check authorization
      expect(await xcmBridge.authorizedContracts(await unauthorizedContract.getAddress())).to.be.true;
    });
  });

  describe("Cross-Chain Marketplace Functions", function () {
    beforeEach(async function () {
      // Mint NFT
      await yourCollectible.connect(user1).mintItem(user1.address, "QmTestHash123", ROYALTY_FEE);
      
      // Approve marketplace
      await yourCollectible.connect(user1).setApprovalForAll(await marketplace.getAddress(), true);
    });

    it("Should list NFT for cross-chain sale", async function () {
      const price = ethers.parseEther("1");
      
      const tx = await marketplace.connect(user1).listNFT(
        await yourCollectible.getAddress(),
        1,
        price,
        ethers.ZeroAddress, // Native token
        true // Cross-chain listing
      );
      
      await tx.wait();
      
      // Generate listing ID (same logic as contract)
      const listingId = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "uint256", "address", "uint256", "uint256"],
          [
            await yourCollectible.getAddress(),
            1,
            user1.address,
            (await ethers.provider.getBlock("latest"))?.timestamp || 0,
            await ethers.provider.getNetwork().then(n => n.chainId)
          ]
        )
      );
      
      const listing = await marketplace.listings(listingId);
      expect(listing.isActive).to.be.true;
      expect(listing.isCrossChain).to.be.true;
      expect(listing.price).to.equal(price);
    });

    it("Should purchase NFT on same chain", async function () {
      const price = ethers.parseEther("1");
      
      // List NFT (not cross-chain)
      const listTx = await marketplace.connect(user1).listNFT(
        await yourCollectible.getAddress(),
        1,
        price,
        ethers.ZeroAddress,
        false // Same chain listing
      );
      
      await listTx.wait();
      
      // Generate listing ID
      const listingId = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "uint256", "address", "uint256", "uint256"],
          [
            await yourCollectible.getAddress(),
            1,
            user1.address,
            (await ethers.provider.getBlock("latest"))?.timestamp || 0,
            await ethers.provider.getNetwork().then(n => n.chainId)
          ]
        )
      );
      
      // Purchase NFT
      await marketplace.connect(user2).purchaseNFT(listingId, { value: price });
      
      // Check ownership transfer
      expect(await yourCollectible.ownerOf(1)).to.equal(user2.address);
      
      // Check listing is inactive
      const listing = await marketplace.listings(listingId);
      expect(listing.isActive).to.be.false;
    });

    it("Should handle marketplace fees correctly", async function () {
      const price = ethers.parseEther("1");
      const expectedFee = price * BigInt(250) / BigInt(10000); // 2.5%
      const expectedSellerAmount = price - expectedFee;
      
      // Record initial balances
      const initialFeeRecipientBalance = await ethers.provider.getBalance(feeRecipient.address);
      const initialSellerBalance = await ethers.provider.getBalance(user1.address);
      
      // List and purchase NFT
      const listTx = await marketplace.connect(user1).listNFT(
        await yourCollectible.getAddress(),
        1,
        price,
        ethers.ZeroAddress,
        false
      );
      
      await listTx.wait();
      
      const listingId = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "uint256", "address", "uint256", "uint256"],
          [
            await yourCollectible.getAddress(),
            1,
            user1.address,
            (await ethers.provider.getBlock("latest"))?.timestamp || 0,
            await ethers.provider.getNetwork().then(n => n.chainId)
          ]
        )
      );
      
      await marketplace.connect(user2).purchaseNFT(listingId, { value: price });
      
      // Check fee recipient received fee
      const finalFeeRecipientBalance = await ethers.provider.getBalance(feeRecipient.address);
      expect(finalFeeRecipientBalance - initialFeeRecipientBalance).to.equal(expectedFee);
    });
  });

  describe("Integration Tests", function () {
    it("Should handle complete cross-chain NFT flow", async function () {
      // 1. Mint NFT
      await yourCollectible.connect(user1).mintItem(user1.address, "QmTestHash123", ROYALTY_FEE);
      
      // 2. Approve contracts
      await yourCollectible.connect(user1).setApprovalForAll(await marketplace.getAddress(), true);
      await yourCollectible.connect(user1).approve(await xcmBridge.getAddress(), 1);
      
      // 3. List NFT for cross-chain sale
      const price = ethers.parseEther("1");
      await marketplace.connect(user1).listNFT(
        await yourCollectible.getAddress(),
        1,
        price,
        ethers.ZeroAddress,
        true
      );
      
      // 4. Lock NFT for cross-chain transfer
      await xcmBridge.connect(user1).lockNFT(
        await yourCollectible.getAddress(),
        1,
        MOONBASE_ALPHA_CHAIN_ID
      );
      
      // Verify NFT is locked in bridge
      expect(await yourCollectible.ownerOf(1)).to.equal(await xcmBridge.getAddress());
      
      console.log("✅ Complete cross-chain flow test passed");
    });
  });
});