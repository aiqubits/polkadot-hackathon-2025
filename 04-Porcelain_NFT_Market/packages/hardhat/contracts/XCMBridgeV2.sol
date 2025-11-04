// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./WrappedNFT.sol";

/**
 * @title XCMBridgeV2
 * @dev 增强版跨链NFT桥接合约，支持完整的跨链NFT转移流程
 * 包括：锁定原始NFT、铸造包装NFT、销毁包装NFT、解锁原始NFT
 */
contract XCMBridgeV2 is IERC721Receiver, Ownable, ReentrancyGuard, Pausable {
    // XCM消息类型
    enum MessageType {
        LOCK_NFT,           // 锁定NFT（源链 -> 目标链）
        UNLOCK_NFT,         // 解锁NFT（目标链 -> 源链）
        MINT_WRAPPED_NFT,   // 铸造包装NFT（目标链处理）
        BURN_WRAPPED_NFT    // 销毁包装NFT（目标链处理）
    }

    // 跨链NFT信息
    struct CrossChainNFT {
        address originalContract;
        uint256 originalTokenId;
        address originalOwner;
        uint32 sourceChainId;
        uint32 destinationChainId;
        bool isLocked;
        uint256 timestamp;
        string tokenURI;  // 添加tokenURI字段
    }

    // XCM消息结构
    struct XCMMessage {
        MessageType messageType;
        address nftContract;
        uint256 tokenId;
        address recipient;
        uint32 sourceChainId;
        uint32 destinationChainId;
        bytes32 messageHash;
        bool processed;
        string tokenURI;  // 添加tokenURI字段
    }

    // 链ID常量
    uint32 public constant POLKADOT_HUB_CHAIN_ID = 420420422;
    uint32 public constant MOONBASE_ALPHA_CHAIN_ID = 1287;

    // 状态变量
    mapping(bytes32 => CrossChainNFT) public crossChainNFTs;
    mapping(bytes32 => XCMMessage) public xcmMessages;
    mapping(address => bool) public authorizedContracts;
    mapping(uint32 => bool) public supportedChains;
    mapping(uint32 => address) public wrappedNFTContracts; // 每个链的包装NFT合约

    // 事件
    event NFTLocked(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed owner,
        uint32 destinationChainId,
        bytes32 messageHash,
        string tokenURI
    );

    event NFTUnlocked(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed owner,
        bytes32 messageHash
    );

    event WrappedNFTMinted(
        address indexed wrappedContract,
        uint256 indexed wrappedTokenId,
        address indexed recipient,
        bytes32 lockMessageHash
    );

    event WrappedNFTBurned(
        address indexed wrappedContract,
        uint256 indexed wrappedTokenId,
        address indexed owner,
        bytes32 lockMessageHash
    );

    event XCMMessageSent(bytes32 indexed messageHash, MessageType messageType, uint32 destinationChainId);
    event XCMMessageReceived(bytes32 indexed messageHash, MessageType messageType, uint32 sourceChainId);
    event ContractAuthorized(address indexed nftContract, bool authorized);
    event ChainSupported(uint32 indexed chainId, bool supported);
    event WrappedNFTContractSet(uint32 indexed chainId, address wrappedContract);

    constructor() {
        // 初始化支持的链
        supportedChains[POLKADOT_HUB_CHAIN_ID] = true;
        supportedChains[MOONBASE_ALPHA_CHAIN_ID] = true;
    }

    /**
     * @dev 设置包装NFT合约地址
     */
    function setWrappedNFTContract(uint32 chainId, address wrappedContract) external onlyOwner {
        wrappedNFTContracts[chainId] = wrappedContract;
        emit WrappedNFTContractSet(chainId, wrappedContract);
    }

    /**
     * @dev 锁定NFT并发起跨链转移
     */
    function lockNFT(
        address nftContract,
        uint256 tokenId,
        uint32 destinationChainId
    ) external nonReentrant whenNotPaused {
        require(authorizedContracts[nftContract], "Contract not authorized");
        require(supportedChains[destinationChainId], "Destination chain not supported");
        require(destinationChainId != uint32(block.chainid), "Cannot transfer to same chain");

        // 检查NFT所有权
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not NFT owner");

        // 获取NFT的URI
        string memory tokenURI = "";
        try IERC721Metadata(nftContract).tokenURI(tokenId) returns (string memory uri) {
            tokenURI = uri;
        } catch {
            // 如果获取URI失败，使用空字符串
        }

        // 转移NFT到桥接合约
        nft.safeTransferFrom(msg.sender, address(this), tokenId);

        // 生成消息哈希
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                nftContract,
                tokenId,
                msg.sender,
                uint32(block.chainid),
                destinationChainId,
                block.timestamp
            )
        );

        // 存储跨链NFT信息
        crossChainNFTs[messageHash] = CrossChainNFT({
            originalContract: nftContract,
            originalTokenId: tokenId,
            originalOwner: msg.sender,
            sourceChainId: uint32(block.chainid),
            destinationChainId: destinationChainId,
            isLocked: true,
            timestamp: block.timestamp,
            tokenURI: tokenURI
        });

        // 创建XCM消息
        xcmMessages[messageHash] = XCMMessage({
            messageType: MessageType.LOCK_NFT,
            nftContract: nftContract,
            tokenId: tokenId,
            recipient: msg.sender,
            sourceChainId: uint32(block.chainid),
            destinationChainId: destinationChainId,
            messageHash: messageHash,
            processed: false,
            tokenURI: tokenURI
        });

        emit NFTLocked(nftContract, tokenId, msg.sender, destinationChainId, messageHash, tokenURI);
        emit XCMMessageSent(messageHash, MessageType.LOCK_NFT, destinationChainId);
    }

    /**
     * @dev 处理跨链消息
     */
    function processXCMMessage(
        bytes32 messageHash,
        MessageType messageType,
        address nftContract,
        uint256 tokenId,
        address recipient,
        uint32 sourceChainId,
        string memory tokenURI
    ) external nonReentrant whenNotPaused {
        require(!xcmMessages[messageHash].processed, "Message already processed");
        require(supportedChains[sourceChainId], "Source chain not supported");

        // 记录XCM消息
        xcmMessages[messageHash] = XCMMessage({
            messageType: messageType,
            nftContract: nftContract,
            tokenId: tokenId,
            recipient: recipient,
            sourceChainId: sourceChainId,
            destinationChainId: uint32(block.chainid),
            messageHash: messageHash,
            processed: true,
            tokenURI: tokenURI
        });

        if (messageType == MessageType.LOCK_NFT) {
            // 处理锁定消息：在目标链上铸造包装NFT
            _mintWrappedNFT(messageHash, nftContract, tokenId, recipient, sourceChainId, tokenURI);
        } else if (messageType == MessageType.UNLOCK_NFT) {
            // 处理解锁消息：在源链上解锁原始NFT
            _unlockOriginalNFT(messageHash, recipient);
        }

        emit XCMMessageReceived(messageHash, messageType, sourceChainId);
    }

    /**
     * @dev 销毁包装NFT并发起解锁消息
     */
    function burnWrappedNFTAndUnlock(uint256 wrappedTokenId) external nonReentrant whenNotPaused {
        uint32 currentChainId = uint32(block.chainid);
        address wrappedContract = wrappedNFTContracts[currentChainId];
        require(wrappedContract != address(0), "Wrapped NFT contract not set");

        WrappedNFT wrappedNFT = WrappedNFT(wrappedContract);
        require(wrappedNFT.ownerOf(wrappedTokenId) == msg.sender, "Not wrapped NFT owner");

        // 获取原始NFT信息
        (
            address originalContract,
            uint256 originalTokenId,
            uint32 sourceChainId,
            string memory originalTokenURI,
            bytes32 lockMessageHash
        ) = wrappedNFT.getOriginalNFTInfo(wrappedTokenId);

        // 销毁包装NFT
        bytes32 returnedHash = wrappedNFT.burnWrappedNFT(wrappedTokenId);
        require(returnedHash == lockMessageHash, "Message hash mismatch");

        // 生成解锁消息哈希
        bytes32 unlockMessageHash = keccak256(
            abi.encodePacked(
                lockMessageHash,
                msg.sender,
                currentChainId,
                sourceChainId,
                block.timestamp
            )
        );

        // 创建解锁XCM消息
        xcmMessages[unlockMessageHash] = XCMMessage({
            messageType: MessageType.UNLOCK_NFT,
            nftContract: originalContract,
            tokenId: originalTokenId,
            recipient: msg.sender,
            sourceChainId: currentChainId,
            destinationChainId: sourceChainId,
            messageHash: unlockMessageHash,
            processed: false,
            tokenURI: originalTokenURI
        });

        emit WrappedNFTBurned(wrappedContract, wrappedTokenId, msg.sender, lockMessageHash);
        emit XCMMessageSent(unlockMessageHash, MessageType.UNLOCK_NFT, sourceChainId);
    }

    /**
     * @dev 内部函数：铸造包装NFT
     */
    function _mintWrappedNFT(
        bytes32 messageHash,
        address originalContract,
        uint256 originalTokenId,
        address recipient,
        uint32 sourceChainId,
        string memory tokenURI
    ) internal {
        uint32 currentChainId = uint32(block.chainid);
        address wrappedContract = wrappedNFTContracts[currentChainId];
        require(wrappedContract != address(0), "Wrapped NFT contract not set");

        WrappedNFT wrappedNFT = WrappedNFT(wrappedContract);
        
        // 铸造包装NFT
        uint256 wrappedTokenId = wrappedNFT.mintWrappedNFT(
            recipient,
            originalContract,
            originalTokenId,
            sourceChainId,
            tokenURI,
            messageHash
        );

        emit WrappedNFTMinted(wrappedContract, wrappedTokenId, recipient, messageHash);
    }

    /**
     * @dev 内部函数：解锁原始NFT
     */
    function _unlockOriginalNFT(bytes32 unlockMessageHash, address recipient) internal {
        // 这里需要根据unlockMessageHash找到对应的锁定记录
        // 为了简化，我们假设可以通过某种方式关联到原始的lockMessageHash
        // 在实际实现中，可能需要在消息中包含更多信息来建立这种关联
        
        // 注意：这个函数需要根据具体的消息格式和关联逻辑来实现
        // 目前作为占位符实现
    }

    /**
     * @dev 直接解锁NFT（用于源链上的解锁操作）
     */
    function unlockNFT(bytes32 messageHash) external nonReentrant whenNotPaused {
        CrossChainNFT storage nftInfo = crossChainNFTs[messageHash];
        require(nftInfo.isLocked, "NFT not locked");
        require(nftInfo.originalOwner == msg.sender, "Not original owner");

        // 标记为已解锁
        nftInfo.isLocked = false;

        // 将NFT转回原始所有者
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
     * @dev 授权NFT合约进行跨链转移
     */
    function setContractAuthorization(address nftContract, bool authorized) external onlyOwner {
        authorizedContracts[nftContract] = authorized;
        emit ContractAuthorized(nftContract, authorized);
    }

    /**
     * @dev 设置链支持状态
     */
    function setChainSupport(uint32 chainId, bool supported) external onlyOwner {
        supportedChains[chainId] = supported;
        emit ChainSupported(chainId, supported);
    }

    /**
     * @dev 暂停合约
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev 恢复合约
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev 处理接收到的NFT
     */
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    /**
     * @dev 获取包装NFT合约地址
     */
    function getWrappedNFTContract(uint32 chainId) external view returns (address) {
        return wrappedNFTContracts[chainId];
    }

    /**
     * @dev 检查合约是否已授权
     */
    function isContractAuthorized(address nftContract) external view returns (bool) {
        return authorizedContracts[nftContract];
    }

    /**
     * @dev 检查链是否支持
     */
    function isChainSupported(uint32 chainId) external view returns (bool) {
        return supportedChains[chainId];
    }

    /**
     * @dev 获取XCM消息详情
     */
    function getXCMMessage(bytes32 messageHash) external view returns (XCMMessage memory) {
        return xcmMessages[messageHash];
    }
}