// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title WrappedNFT
 * @dev 包装NFT合约，用于在目标链上表示跨链转移的NFT
 * 只有XCMBridge合约可以铸造和销毁这些NFT
 */
contract WrappedNFT is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    // XCMBridge合约地址
    address public xcmBridge;
    
    // 包装NFT信息
    struct WrappedNFTInfo {
        address originalContract;    // 原始NFT合约地址
        uint256 originalTokenId;     // 原始NFT的TokenId
        uint32 sourceChainId;        // 源链ID
        string originalTokenURI;     // 原始NFT的URI
        bytes32 lockMessageHash;     // 锁定消息的哈希
    }
    
    // TokenId => 包装NFT信息
    mapping(uint256 => WrappedNFTInfo) public wrappedNFTInfo;
    
    // 下一个可用的TokenId
    uint256 private _nextTokenId = 1;
    
    // 原始NFT => 包装NFT的映射 (sourceChainId + originalContract + originalTokenId => wrappedTokenId)
    mapping(bytes32 => uint256) public originalToWrapped;
    
    // 包装NFT => 原始NFT的映射
    mapping(uint256 => bytes32) public wrappedToOriginal;

    // 事件
    event WrappedNFTMinted(
        uint256 indexed wrappedTokenId,
        address indexed recipient,
        address originalContract,
        uint256 originalTokenId,
        uint32 sourceChainId,
        bytes32 lockMessageHash
    );
    
    event WrappedNFTBurned(
        uint256 indexed wrappedTokenId,
        address indexed owner,
        bytes32 lockMessageHash
    );

    modifier onlyXCMBridge() {
        require(msg.sender == xcmBridge, "Only XCMBridge can call this function");
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        address _xcmBridge
    ) ERC721(name, symbol) {
        xcmBridge = _xcmBridge;
    }

    /**
     * @dev 设置XCMBridge地址（仅所有者）
     */
    function setXCMBridge(address _xcmBridge) external onlyOwner {
        xcmBridge = _xcmBridge;
    }

    /**
     * @dev 铸造包装NFT（仅XCMBridge可调用）
     * @param to 接收者地址
     * @param originalContract 原始NFT合约地址
     * @param originalTokenId 原始NFT的TokenId
     * @param sourceChainId 源链ID
     * @param tokenURI NFT的URI
     * @param lockMessageHash 锁定消息的哈希
     * @return wrappedTokenId 新铸造的包装NFT的TokenId
     */
    function mintWrappedNFT(
        address to,
        address originalContract,
        uint256 originalTokenId,
        uint32 sourceChainId,
        string memory tokenURI,
        bytes32 lockMessageHash
    ) external onlyXCMBridge nonReentrant returns (uint256) {
        // 生成唯一键
        bytes32 originalKey = keccak256(abi.encodePacked(sourceChainId, originalContract, originalTokenId));
        
        // 检查是否已经存在包装NFT
        require(originalToWrapped[originalKey] == 0, "Wrapped NFT already exists");
        
        uint256 wrappedTokenId = _nextTokenId++;
        
        // 铸造NFT
        _safeMint(to, wrappedTokenId);
        _setTokenURI(wrappedTokenId, tokenURI);
        
        // 存储包装NFT信息
        wrappedNFTInfo[wrappedTokenId] = WrappedNFTInfo({
            originalContract: originalContract,
            originalTokenId: originalTokenId,
            sourceChainId: sourceChainId,
            originalTokenURI: tokenURI,
            lockMessageHash: lockMessageHash
        });
        
        // 建立映射关系
        originalToWrapped[originalKey] = wrappedTokenId;
        wrappedToOriginal[wrappedTokenId] = originalKey;
        
        emit WrappedNFTMinted(
            wrappedTokenId,
            to,
            originalContract,
            originalTokenId,
            sourceChainId,
            lockMessageHash
        );
        
        return wrappedTokenId;
    }

    /**
     * @dev 销毁包装NFT（仅XCMBridge可调用）
     * @param wrappedTokenId 要销毁的包装NFT的TokenId
     * @return lockMessageHash 原始锁定消息的哈希
     */
    function burnWrappedNFT(uint256 wrappedTokenId) external onlyXCMBridge nonReentrant returns (bytes32) {
        require(_exists(wrappedTokenId), "Wrapped NFT does not exist");
        
        address owner = ownerOf(wrappedTokenId);
        bytes32 lockMessageHash = wrappedNFTInfo[wrappedTokenId].lockMessageHash;
        bytes32 originalKey = wrappedToOriginal[wrappedTokenId];
        
        // 清理映射关系
        delete originalToWrapped[originalKey];
        delete wrappedToOriginal[wrappedTokenId];
        delete wrappedNFTInfo[wrappedTokenId];
        
        // 销毁NFT
        _burn(wrappedTokenId);
        
        emit WrappedNFTBurned(wrappedTokenId, owner, lockMessageHash);
        
        return lockMessageHash;
    }

    /**
     * @dev 检查原始NFT是否已有包装NFT
     */
    function getWrappedTokenId(
        address originalContract,
        uint256 originalTokenId,
        uint32 sourceChainId
    ) external view returns (uint256) {
        bytes32 originalKey = keccak256(abi.encodePacked(sourceChainId, originalContract, originalTokenId));
        return originalToWrapped[originalKey];
    }

    /**
     * @dev 获取包装NFT的原始信息
     */
    function getOriginalNFTInfo(uint256 wrappedTokenId) external view returns (
        address originalContract,
        uint256 originalTokenId,
        uint32 sourceChainId,
        string memory originalTokenURI,
        bytes32 lockMessageHash
    ) {
        require(_exists(wrappedTokenId), "Wrapped NFT does not exist");
        WrappedNFTInfo memory info = wrappedNFTInfo[wrappedTokenId];
        return (
            info.originalContract,
            info.originalTokenId,
            info.sourceChainId,
            info.originalTokenURI,
            info.lockMessageHash
        );
    }

    // 重写必要的函数
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}