// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title XCMBridge
 * @dev Cross-chain NFT bridge contract for Polkadot XCM integration
 * Handles NFT locking/unlocking and cross-chain message processing
 */
contract XCMBridge is IERC721Receiver, Ownable, ReentrancyGuard, Pausable {
    // XCM message types
    enum MessageType {
        LOCK_NFT,
        UNLOCK_NFT,
        MINT_WRAPPED_NFT,
        BURN_WRAPPED_NFT
    }

    // Cross-chain NFT information
    struct CrossChainNFT {
        address originalContract;
        uint256 originalTokenId;
        address originalOwner;
        uint32 sourceChainId;
        uint32 destinationChainId;
        bool isLocked;
        uint256 timestamp;
    }

    // XCM message structure
    struct XCMMessage {
        MessageType messageType;
        address nftContract;
        uint256 tokenId;
        address recipient;
        uint32 sourceChainId;
        uint32 destinationChainId;
        bytes32 messageHash;
        bool processed;
    }

    // Chain ID mappings
    uint32 public constant POLKADOT_HUB_CHAIN_ID = 420420422;
    uint32 public constant MOONBASE_ALPHA_CHAIN_ID = 1287;

    // State variables
    mapping(bytes32 => CrossChainNFT) public crossChainNFTs;
    mapping(bytes32 => XCMMessage) public xcmMessages;
    mapping(address => bool) public authorizedContracts;
    mapping(uint32 => bool) public supportedChains;
    mapping(address => mapping(uint256 => bytes32)) public nftToMessageHash;

    // Events
    event NFTLocked(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed owner,
        uint32 destinationChainId,
        bytes32 messageHash
    );

    event NFTUnlocked(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed owner,
        bytes32 messageHash
    );

    event XCMMessageSent(
        bytes32 indexed messageHash,
        MessageType messageType,
        uint32 destinationChainId
    );

    event XCMMessageReceived(
        bytes32 indexed messageHash,
        MessageType messageType,
        uint32 sourceChainId
    );

    event ChainSupported(uint32 chainId, bool supported);
    event ContractAuthorized(address indexed nftContract, bool authorized);

    constructor() {
        // Initialize supported chains
        supportedChains[POLKADOT_HUB_CHAIN_ID] = true;
        supportedChains[MOONBASE_ALPHA_CHAIN_ID] = true;
    }

    /**
     * @dev Lock NFT for cross-chain transfer
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID to lock
     * @param destinationChainId Target chain ID
     */
    function lockNFT(
        address nftContract,
        uint256 tokenId,
        uint32 destinationChainId
    ) external nonReentrant whenNotPaused {
        require(authorizedContracts[nftContract], "Contract not authorized");
        require(supportedChains[destinationChainId], "Chain not supported");
        require(
            IERC721(nftContract).ownerOf(tokenId) == msg.sender,
            "Not token owner"
        );

        // Generate unique message hash
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                nftContract,
                tokenId,
                msg.sender,
                block.chainid,
                destinationChainId,
                block.timestamp
            )
        );

        // Transfer NFT to bridge contract
        IERC721(nftContract).safeTransferFrom(
            msg.sender,
            address(this),
            tokenId
        );

        // Store cross-chain NFT information
        crossChainNFTs[messageHash] = CrossChainNFT({
            originalContract: nftContract,
            originalTokenId: tokenId,
            originalOwner: msg.sender,
            sourceChainId: uint32(block.chainid),
            destinationChainId: destinationChainId,
            isLocked: true,
            timestamp: block.timestamp
        });

        // Create XCM message
        xcmMessages[messageHash] = XCMMessage({
            messageType: MessageType.LOCK_NFT,
            nftContract: nftContract,
            tokenId: tokenId,
            recipient: msg.sender,
            sourceChainId: uint32(block.chainid),
            destinationChainId: destinationChainId,
            messageHash: messageHash,
            processed: false
        });

        emit NFTLocked(nftContract, tokenId, msg.sender, destinationChainId, messageHash);
        emit XCMMessageSent(messageHash, MessageType.LOCK_NFT, destinationChainId);
    }

    /**
     * @dev Unlock NFT after cross-chain transfer completion
     * @param messageHash Hash of the original lock message
     */
    function unlockNFT(bytes32 messageHash) external nonReentrant whenNotPaused {
        CrossChainNFT storage nftInfo = crossChainNFTs[messageHash];
        require(nftInfo.isLocked, "NFT not locked");
        require(nftInfo.originalOwner == msg.sender, "Not original owner");

        // Mark as unlocked
        nftInfo.isLocked = false;

        // Transfer NFT back to original owner
        IERC721(nftInfo.originalContract).safeTransferFrom(
            address(this),
            nftInfo.originalOwner,
            nftInfo.originalTokenId
        );

        emit NFTUnlocked(
            nftInfo.originalContract,
            nftInfo.originalTokenId,
            nftInfo.originalOwner,
            messageHash
        );
    }

    /**
     * @dev Process incoming XCM message
     * @param messageHash Hash of the XCM message
     * @param messageType Type of XCM message
     * @param nftContract NFT contract address
     * @param tokenId Token ID
     * @param recipient Recipient address
     * @param sourceChainId Source chain ID
     */
    function processXCMMessage(
        bytes32 messageHash,
        MessageType messageType,
        address nftContract,
        uint256 tokenId,
        address recipient,
        uint32 sourceChainId
    ) external nonReentrant whenNotPaused {
        require(!xcmMessages[messageHash].processed, "Message already processed");
        require(supportedChains[sourceChainId], "Source chain not supported");
        require(authorizedContracts[nftContract], "Contract not authorized");

        xcmMessages[messageHash] = XCMMessage({
            messageType: messageType,
            nftContract: nftContract,
            tokenId: tokenId,
            recipient: recipient,
            sourceChainId: sourceChainId,
            destinationChainId: uint32(block.chainid),
            messageHash: messageHash,
            processed: true
        });

        // For LOCK_NFT messages, create a CrossChainNFT record on the destination chain
        // This allows the recipient to unlock the NFT later
        if (messageType == MessageType.LOCK_NFT) {
            crossChainNFTs[messageHash] = CrossChainNFT({
                originalContract: nftContract,
                originalTokenId: tokenId,
                originalOwner: recipient,
                sourceChainId: sourceChainId,
                destinationChainId: uint32(block.chainid),
                isLocked: true,
                timestamp: block.timestamp
            });
        }

        emit XCMMessageReceived(messageHash, messageType, sourceChainId);
    }

    /**
     * @dev Authorize NFT contract for cross-chain transfers
     * @param nftContract Address of the NFT contract
     * @param authorized Authorization status
     */
    function setContractAuthorization(
        address nftContract,
        bool authorized
    ) external onlyOwner {
        authorizedContracts[nftContract] = authorized;
        emit ContractAuthorized(nftContract, authorized);
    }

    /**
     * @dev Set chain support status
     * @param chainId Chain ID
     * @param supported Support status
     */
    function setChainSupport(uint32 chainId, bool supported) external onlyOwner {
        supportedChains[chainId] = supported;
        emit ChainSupported(chainId, supported);
    }

    /**
     * @dev Get cross-chain NFT information
     * @param messageHash Message hash
     * @return CrossChainNFT information
     */
    function getCrossChainNFT(bytes32 messageHash)
        external
        view
        returns (CrossChainNFT memory)
    {
        return crossChainNFTs[messageHash];
    }

    /**
     * @dev Get XCM message information
     * @param messageHash Message hash
     * @return XCMMessage information
     */
    function getXCMMessage(bytes32 messageHash)
        external
        view
        returns (XCMMessage memory)
    {
        return xcmMessages[messageHash];
    }

    /**
     * @dev Emergency pause function
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause function
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Handle NFT reception
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    /**
     * @dev Emergency withdrawal function (only owner)
     * @param nftContract NFT contract address
     * @param tokenId Token ID
     * @param to Recipient address
     */
    function emergencyWithdraw(
        address nftContract,
        uint256 tokenId,
        address to
    ) external onlyOwner {
        IERC721(nftContract).safeTransferFrom(address(this), to, tokenId);
    }
}