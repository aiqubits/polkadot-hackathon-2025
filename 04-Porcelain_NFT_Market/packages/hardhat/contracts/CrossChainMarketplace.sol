// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./XCMBridge.sol";

/**
 * @title CrossChainMarketplace
 * @dev Cross-chain NFT marketplace with XCM integration
 * Enables NFT trading across Polkadot Hub and Moonbase Alpha
 */
contract CrossChainMarketplace is Ownable, ReentrancyGuard, Pausable {
    // Marketplace listing structure
    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        address paymentToken; // address(0) for native token
        uint32 sourceChainId;
        bool isActive;
        bool isCrossChain;
        uint256 timestamp;
    }

    // Cross-chain purchase structure
    struct CrossChainPurchase {
        bytes32 listingId;
        address buyer;
        uint256 price;
        address paymentToken;
        uint32 sourceChainId;
        uint32 destinationChainId;
        bool completed;
        uint256 timestamp;
    }

    // XCM Bridge reference
    XCMBridge public xcmBridge;

    // State variables
    mapping(bytes32 => Listing) public listings;
    mapping(bytes32 => CrossChainPurchase) public crossChainPurchases;
    mapping(address => bool) public supportedPaymentTokens;
    mapping(uint32 => bool) public supportedChains;

    // Fee configuration
    uint256 public marketplaceFee = 250; // 2.5% in basis points
    uint256 public constant MAX_FEE = 1000; // 10% maximum fee
    address public feeRecipient;

    // Events
    event NFTListed(
        bytes32 indexed listingId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price,
        address paymentToken,
        bool isCrossChain
    );

    event NFTSold(
        bytes32 indexed listingId,
        address indexed buyer,
        address indexed seller,
        uint256 price,
        address paymentToken
    );

    event CrossChainPurchaseInitiated(
        bytes32 indexed purchaseId,
        bytes32 indexed listingId,
        address indexed buyer,
        uint32 sourceChainId,
        uint32 destinationChainId
    );

    event CrossChainPurchaseCompleted(
        bytes32 indexed purchaseId,
        address indexed buyer,
        address indexed seller
    );

    event ListingCancelled(bytes32 indexed listingId, address indexed seller);

    constructor(address _xcmBridge, address _feeRecipient) {
        xcmBridge = XCMBridge(_xcmBridge);
        feeRecipient = _feeRecipient;
        
        // Initialize supported chains
        supportedChains[420420422] = true; // Polkadot Hub
        supportedChains[1287] = true; // Moonbase Alpha
        
        // Support native token payments
        supportedPaymentTokens[address(0)] = true;
    }

    /**
     * @dev List NFT for sale
     * @param nftContract NFT contract address
     * @param tokenId Token ID
     * @param price Listing price
     * @param paymentToken Payment token address (address(0) for native)
     * @param isCrossChain Whether this is a cross-chain listing
     */
    function listNFT(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        address paymentToken,
        bool isCrossChain
    ) external nonReentrant whenNotPaused {
        require(price > 0, "Price must be greater than 0");
        require(supportedPaymentTokens[paymentToken], "Payment token not supported");
        require(
            IERC721(nftContract).ownerOf(tokenId) == msg.sender,
            "Not token owner"
        );
        require(
            IERC721(nftContract).isApprovedForAll(msg.sender, address(this)) ||
            IERC721(nftContract).getApproved(tokenId) == address(this),
            "Marketplace not approved"
        );

        bytes32 listingId = keccak256(
            abi.encodePacked(
                nftContract,
                tokenId,
                msg.sender,
                block.timestamp,
                block.chainid
            )
        );

        listings[listingId] = Listing({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            paymentToken: paymentToken,
            sourceChainId: uint32(block.chainid),
            isActive: true,
            isCrossChain: isCrossChain,
            timestamp: block.timestamp
        });

        emit NFTListed(
            listingId,
            msg.sender,
            nftContract,
            tokenId,
            price,
            paymentToken,
            isCrossChain
        );
    }

    /**
     * @dev Purchase NFT (same chain)
     * @param listingId Listing ID
     */
    function purchaseNFT(bytes32 listingId) external payable nonReentrant whenNotPaused {
        Listing storage listing = listings[listingId];
        require(listing.isActive, "Listing not active");
        require(!listing.isCrossChain, "Use cross-chain purchase for cross-chain listings");
        require(listing.sourceChainId == uint32(block.chainid), "Wrong chain");

        uint256 totalPrice = listing.price;
        uint256 fee = (totalPrice * marketplaceFee) / 10000;
        uint256 sellerAmount = totalPrice - fee;

        // Handle payment
        if (listing.paymentToken == address(0)) {
            require(msg.value >= totalPrice, "Insufficient payment");
            
            // Transfer fee to fee recipient
            if (fee > 0) {
                (bool feeSuccess, ) = payable(feeRecipient).call{value: fee}("");
                require(feeSuccess, "Fee transfer failed");
            }
            
            // Transfer payment to seller
            (bool sellerSuccess, ) = payable(listing.seller).call{value: sellerAmount}("");
            require(sellerSuccess, "Seller payment failed");
            
            // Refund excess payment
            if (msg.value > totalPrice) {
                (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - totalPrice}("");
                require(refundSuccess, "Refund failed");
            }
        } else {
            IERC20 paymentToken = IERC20(listing.paymentToken);
            require(
                paymentToken.transferFrom(msg.sender, address(this), totalPrice),
                "Payment transfer failed"
            );
            
            // Transfer fee to fee recipient
            if (fee > 0) {
                require(
                    paymentToken.transfer(feeRecipient, fee),
                    "Fee transfer failed"
                );
            }
            
            // Transfer payment to seller
            require(
                paymentToken.transfer(listing.seller, sellerAmount),
                "Seller payment failed"
            );
        }

        // Transfer NFT to buyer
        IERC721(listing.nftContract).safeTransferFrom(
            listing.seller,
            msg.sender,
            listing.tokenId
        );

        // Mark listing as inactive
        listing.isActive = false;

        emit NFTSold(
            listingId,
            msg.sender,
            listing.seller,
            totalPrice,
            listing.paymentToken
        );
    }

    /**
     * @dev Initiate cross-chain NFT purchase
     * @param listingId Listing ID
     * @param destinationChainId Target chain for NFT delivery
     */
    function initiateCrossChainPurchase(
        bytes32 listingId,
        uint32 destinationChainId
    ) external payable nonReentrant whenNotPaused {
        Listing storage listing = listings[listingId];
        require(listing.isActive, "Listing not active");
        require(listing.isCrossChain, "Not a cross-chain listing");
        require(supportedChains[destinationChainId], "Destination chain not supported");

        uint256 totalPrice = listing.price;
        uint256 fee = (totalPrice * marketplaceFee) / 10000;
        uint256 sellerAmount = totalPrice - fee;

        // Handle payment (similar to regular purchase)
        if (listing.paymentToken == address(0)) {
            require(msg.value >= totalPrice, "Insufficient payment");
            
            if (fee > 0) {
                payable(feeRecipient).transfer(fee);
            }
            
            payable(listing.seller).transfer(sellerAmount);
            
            if (msg.value > totalPrice) {
                payable(msg.sender).transfer(msg.value - totalPrice);
            }
        } else {
            IERC20 paymentToken = IERC20(listing.paymentToken);
            require(
                paymentToken.transferFrom(msg.sender, address(this), totalPrice),
                "Payment transfer failed"
            );
            
            if (fee > 0) {
                require(
                    paymentToken.transfer(feeRecipient, fee),
                    "Fee transfer failed"
                );
            }
            
            require(
                paymentToken.transfer(listing.seller, sellerAmount),
                "Seller payment failed"
            );
        }

        bytes32 purchaseId = keccak256(
            abi.encodePacked(
                listingId,
                msg.sender,
                destinationChainId,
                block.timestamp
            )
        );

        crossChainPurchases[purchaseId] = CrossChainPurchase({
            listingId: listingId,
            buyer: msg.sender,
            price: totalPrice,
            paymentToken: listing.paymentToken,
            sourceChainId: listing.sourceChainId,
            destinationChainId: destinationChainId,
            completed: false,
            timestamp: block.timestamp
        });

        // Lock NFT in XCM bridge for cross-chain transfer
        IERC721(listing.nftContract).approve(address(xcmBridge), listing.tokenId);
        xcmBridge.lockNFT(listing.nftContract, listing.tokenId, destinationChainId);

        // Mark listing as inactive
        listing.isActive = false;

        emit CrossChainPurchaseInitiated(
            purchaseId,
            listingId,
            msg.sender,
            listing.sourceChainId,
            destinationChainId
        );
    }

    /**
     * @dev Complete cross-chain purchase (called by XCM bridge)
     * @param purchaseId Purchase ID
     */
    function completeCrossChainPurchase(bytes32 purchaseId) external {
        require(msg.sender == address(xcmBridge), "Only XCM bridge can complete");
        
        CrossChainPurchase storage purchase = crossChainPurchases[purchaseId];
        require(!purchase.completed, "Purchase already completed");
        
        purchase.completed = true;
        
        emit CrossChainPurchaseCompleted(
            purchaseId,
            purchase.buyer,
            listings[purchase.listingId].seller
        );
    }

    /**
     * @dev Cancel listing
     * @param listingId Listing ID
     */
    function cancelListing(bytes32 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "Not listing owner");
        require(listing.isActive, "Listing not active");

        listing.isActive = false;

        emit ListingCancelled(listingId, msg.sender);
    }

    /**
     * @dev Set marketplace fee
     * @param _fee Fee in basis points
     */
    function setMarketplaceFee(uint256 _fee) external onlyOwner {
        require(_fee <= MAX_FEE, "Fee too high");
        marketplaceFee = _fee;
    }

    /**
     * @dev Set fee recipient
     * @param _feeRecipient New fee recipient address
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev Set payment token support
     * @param token Token address
     * @param supported Support status
     */
    function setPaymentTokenSupport(address token, bool supported) external onlyOwner {
        supportedPaymentTokens[token] = supported;
    }

    /**
     * @dev Set chain support
     * @param chainId Chain ID
     * @param supported Support status
     */
    function setChainSupport(uint32 chainId, bool supported) external onlyOwner {
        supportedChains[chainId] = supported;
    }

    /**
     * @dev Get listing information
     * @param listingId Listing ID
     * @return Listing information
     */
    function getListing(bytes32 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    /**
     * @dev Get cross-chain purchase information
     * @param purchaseId Purchase ID
     * @return CrossChainPurchase information
     */
    function getCrossChainPurchase(bytes32 purchaseId) 
        external 
        view 
        returns (CrossChainPurchase memory) 
    {
        return crossChainPurchases[purchaseId];
    }

    /**
     * @dev Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}