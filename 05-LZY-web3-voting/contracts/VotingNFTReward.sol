// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title VotingNFTReward
 * @dev Simplified NFT reward contract for correct predictions
 */
contract VotingNFTReward is ERC721, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    uint256 private _tokenIdCounter;
    string private _baseTokenURI;

    // NFT Metadata
    struct NFTMetadata {
        uint256 votingPeriodId;
        uint256 predictionYears;
        uint256 ticketsUsed;
        uint256 mintTime;
        string rarity;
    }

    mapping(uint256 => NFTMetadata) public nftMetadata;
    mapping(uint256 => uint256) public votingPeriodNFTCount;

    event NFTMinted(address indexed to, uint256 indexed tokenId, uint256 votingPeriodId);

    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _baseTokenURI = "https://api.votingnft.com/metadata/";
    }

    /**
     * @dev Mint NFT for correct prediction
     */
    function mintCorrectPredictionNFT(
        address to,
        uint256 votingPeriodId,
        uint256 predictionYears,
        uint256 ticketsUsed
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        
        _safeMint(to, tokenId);

        string memory rarity = _determineRarity(ticketsUsed);
        
        nftMetadata[tokenId] = NFTMetadata({
            votingPeriodId: votingPeriodId,
            predictionYears: predictionYears,
            ticketsUsed: ticketsUsed,
            mintTime: block.timestamp,
            rarity: rarity
        });

        votingPeriodNFTCount[votingPeriodId]++;
        
        emit NFTMinted(to, tokenId, votingPeriodId);
        return tokenId;
    }

    /**
     * @dev Simplified rarity determination
     */
    function _determineRarity(uint256 ticketsUsed) internal pure returns (string memory) {
        if (ticketsUsed >= 1000 * 10**18) return "Legendary";
        if (ticketsUsed >= 500 * 10**18) return "Epic";
        if (ticketsUsed >= 100 * 10**18) return "Rare";
        return "Common";
    }

    /**
     * @dev Set base URI
     */
    function setBaseURI(string memory baseURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = baseURI;
    }

    /**
     * @dev Override base URI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Get NFT metadata
     */
    function getMetadata(uint256 tokenId) external view returns (NFTMetadata memory) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        return nftMetadata[tokenId];
    }

    /**
     * @dev Required override for AccessControl
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
