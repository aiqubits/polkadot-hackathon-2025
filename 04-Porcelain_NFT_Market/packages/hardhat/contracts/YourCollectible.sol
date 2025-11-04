// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2; //Do not change the solidity version as it negatively impacts submission grading

// import "hardhat/console.sol";
// import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

import "@openzeppelin/contracts/token/ERC721/ERC721.sol"; // 实现 ERC721
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol"; // 实现 ERC721Enumerable
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol"; // 存储 tokenURI
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol"; // 实现 EIP-2981 版税标准
import "@openzeppelin/contracts/access/Ownable.sol"; // 用于控制合约的权限
import "@openzeppelin/contracts/utils/Counters.sol"; // 用于生成递增的 tokenId
import "@openzeppelin/contracts/security/ReentrancyGuard.sol"; // 防止重入攻击
import "./IERC4907.sol"; // 导入 ERC4907 接口
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract YourCollectible is
	ERC721,
	ERC721Enumerable,
	ERC721URIStorage,
    ERC721Royalty,
	Ownable,
    ReentrancyGuard,
    IERC4907
{
	using Counters for Counters.Counter;

	Counters.Counter public tokenIdCounter;
	uint256 public listingFee = 0.025 ether; // 上架费用，0.025 eth = 25000000000000000 wei
    // uint256 public constant LOYALTY_PERIOD = 30 days;    // 忠诚度奖励周期（30天）seconds minutes hours days weeks
    uint256 public constant LOYALTY_PERIOD = 5 minutes;
    uint256 public constant LOYALTY_REWARD = 0.001 ether; // 每次奖励金额
    bytes32 public merkleRoot; // 默克尔树根

    // Cross-chain support
    address public xcmBridge; // XCM Bridge contract address
    mapping(uint256 => bool) public isLockedForCrossChain; // Track cross-chain locked NFTs
    mapping(bytes32 => uint256) public crossChainMessages; // XCM message hash to tokenId mapping
	
    // NFT结构体
	struct NFTItem {
        uint256 tokenId; // tokenId
        uint256 price; // 价格
        address payable owner; // 持有者
        bool isListed; // 是否上架
        string tokenUri; // 完整的 tokenURI
    }

    // 碎片结构体
    struct Fraction {
        uint256 amount; // 持有的碎片数量
        bool isForSale; // 是否出售
        uint256 price; // 每个碎片的单价
    }

    // 租赁用户结构体
    struct UserInfo {
        address user;   // 用户地址
        uint64 expires; // 过期时间戳
    }

    // 忠诚度结构体
    struct LoyaltyInfo {
        uint256 holdingStartTime;  // NFT 持有开始时间
        bool rewardClaimed;        // 是否已领取奖励
        uint256 lastRewardTime;    // 上次领取奖励的时间
    }

    // 盲盒结构体
    struct MysteryBox {
        uint256 price;          // 盲盒价格
        bool isActive;          // 盲盒是否激活
        uint96 royaltyFee;      // 版税比例
        uint256 uriCount;       // URI 总数
    }

    MysteryBox public mysteryBox;  // 盲盒信息
    uint256 private nonce = 0;     // 用于生成随机数

    // 映射
	mapping(uint256 => NFTItem) public nftItems; // 存储每个NFT的信息
	mapping(uint256 => address) public mintedBy; // 保存每个NFT的铸造者
    mapping(uint256 => bool) public isFractionalized; // 记录是否被碎片化
    mapping(uint256 => uint256) public totalFractions; // 每个NFT的碎片总量
    mapping(uint256 => mapping(address => Fraction)) public fractions; // 每个NFT的碎片持有信息
    mapping(uint256 => address[]) public fractionOwners; // 记录每个 tokenId 的碎片所有者地址
    mapping(uint256 => UserInfo) internal _users; // 记录每个NFT的租赁用户信息
    mapping(uint256 => LoyaltyInfo) public nftLoyalty;  // tokenId => 忠诚度信息
    mapping(address => bool) public hasClaimed; // 记录地址是否已领取空投
    
    // 添加新的映射来存储 URI
    mapping(uint256 => string) public mysteryBoxURIs;  // index => URI

    // Cross-chain events
    event NFTLockedForCrossChain(uint256 indexed tokenId, address indexed owner, bytes32 messageHash);
    event NFTUnlockedFromCrossChain(uint256 indexed tokenId, address indexed owner, bytes32 messageHash);

    // 事件
    event NftListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );
    event NftBought(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price, address royaltyReceiver, uint256 royaltyAmount);
    event NftDelisted(uint256 indexed tokenId, address indexed owner);
    event NFTFractionalized(uint256 indexed tokenId, uint256 totalFractions);
    event FractionForSale(uint256 indexed tokenId, address indexed owner, uint256 price);
    event FractionSaleCancelled(uint256 indexed tokenId, address indexed owner);
    event FractionBought(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 amount, uint256 pricePerFraction);
    // event FractionTransferred(
    //     uint256 indexed tokenId,
    //     address indexed from,
    //     address indexed to,
    //     uint256 amount
    // );
    event NFTRedeemed(uint256 indexed tokenId, address indexed redeemer);
    event LoyaltyRewardClaimed(uint256 indexed tokenId, address indexed holder, uint256 amount);
    event MysteryBoxCreated(uint256 price, uint256 totalOptions);
    event MysteryBoxPurchased(address indexed buyer, uint256 tokenId, string uri);
    event MysteryBoxStatusChanged(bool isActive);
    // 空投事件
    event AirdropClaimed(address indexed claimer, uint256 tokenId);
    event MerkleRootSet(bytes32 merkleRoot);

	constructor() payable ERC721("YourCollectible", "YCB") {
		
	}

	// Chainlink Automation 所需的检查函数
	// function checkUpkeep(bytes calldata  checkData ) 
	// 	external 
	// 	view 
	// 	override 
	// 	returns (bool upkeepNeeded, bytes memory performData ) 
	// {
	// 	upkeepNeeded = (block.timestamp - lastTimeStamp) > interval;
	// }

	// Chainlink Automation 所需的执行函数
	// function performUpkeep(bytes calldata performData ) external override {
	// 	if ((block.timestamp - lastTimeStamp) > interval) {
	// 		lastTimeStamp = block.timestamp;
	// 		// 这里可以添加需要定期执行的逻辑
	// 	}
	// }

	function _baseURI() internal pure override returns (string memory) {
		return "https://aqua-famous-koala-370.mypinata.cloud/ipfs/";
	}

	// 铸造NFT
	function mintItem(address to, string memory uri, uint96 royaltyFeeNumerator) public returns (uint256) {
		tokenIdCounter.increment();
		uint256 tokenId = tokenIdCounter.current();
		_safeMint(to, tokenId);
		_setTokenURI(tokenId, uri);

        // 设置版税信息, 版税比例royaltyFeeNumerator：250 for 2.5%, 500 for 5%, 1000 for 10%
        _setTokenRoyalty(tokenId, to, royaltyFeeNumerator);

        // 保存铸造者信息
		mintedBy[tokenId] = to;

		// 完整的 tokenURI
        string memory completeTokenURI = string(abi.encodePacked(_baseURI(), uri));

		// 初始化NFTItem信息
        nftItems[tokenId] = NFTItem({
            tokenId: tokenId,
            price: 0,
            owner: payable(to),
            isListed: false,
            tokenUri: completeTokenURI
        });
        
		return tokenId;
	}

    // 批量铸造NFT
    function batchMintItems(
        address to,
        string[] memory uris,
        uint96 royaltyFeeNumerator
    ) public returns (uint256[] memory) {
        require(uris.length > 0, "Must provide at least one URI");
        require(uris.length <= 50, "Maximum 50 NFTs can be minted at a time");

        uint256[] memory tokenIds = new uint256[](uris.length);

        for (uint256 i = 0; i < uris.length; i++) {
            tokenIds[i] = mintItem(to, uris[i], royaltyFeeNumerator);
        }

        return tokenIds;
    }

    // 获取NFT的铸造者
	function getMintedBy(uint256 tokenId) public view returns (address) {
		return mintedBy[tokenId];
	}

	// 上架NFT
    function listItem(uint256 tokenId, uint256 price) public payable nonReentrant {
        require(msg.value == listingFee, "Must pay listing fee");
        require(ownerOf(tokenId) == msg.sender, "You are not the owner");
        require(price > 0, "Price must be greater than zero");
        require(!isFractionalized[tokenId], "Cannot list fractionalized NFT");

		// 将上架费用转给合约拥有者
        (bool feeSuccess, ) = payable(owner()).call{value: listingFee}("");
        require(feeSuccess, "Fee transfer failed");

        // 转移NFT到合约，并授权合约可以转移NFT
        // _transfer(msg.sender, address(this), tokenId);
        approve(address(this), tokenId);
        // setApprovalForAll(address(this), true);
        this.transferFrom(msg.sender, address(this), tokenId);

        // 更新NFT信息
        nftItems[tokenId].isListed = true;
        nftItems[tokenId].price = price;
        nftItems[tokenId].owner = payable(msg.sender);
		nftItems[tokenId].tokenUri = tokenURI(tokenId);

        emit NftListed(tokenId, msg.sender, price);
    }

    // 下架NFT
    function delistItem(uint256 tokenId) public nonReentrant {
        NFTItem storage item = nftItems[tokenId];

        require(item.isListed, "NFT is not listed");
        require(item.owner == msg.sender, "You are not the owner");

        // 更新NFT信息
        item.isListed = false;
        item.price = 0;

        // 将NFT转回给持有者
        this.transferFrom(address(this), msg.sender, tokenId);
        
        emit NftDelisted(tokenId, msg.sender);
    }

    // 购买NFT
    function buyItem(uint256 tokenId) public payable nonReentrant {
        NFTItem storage item = nftItems[tokenId];
        require(item.isListed, "NFT is not listed");
        require(msg.value == item.price, "Incorrect price");

        item.isListed = false;

        uint256 royaltyAmount = 0;
        address royaltyReceiver;

        // 获取版税接受者地址
        (royaltyReceiver, ) = royaltyInfo(tokenId, msg.value);

        // 如果当前卖家是铸造者，则不收取版税
        if (item.owner != royaltyReceiver) {
            (royaltyReceiver, royaltyAmount) = royaltyInfo(tokenId, msg.value);
            if (royaltyAmount > 0) {
                (bool royaltySuccess, ) = payable(royaltyReceiver).call{value: royaltyAmount}("");
                require(royaltySuccess, "Transfer to royalty receiver failed");
            }
        }
		
        // 记录卖家的地址和价格用以事件记录
        address payable seller = item.owner;
        uint256 price = item.price;

		// 更新NFT信息
        item.owner = payable(msg.sender);
        item.price = 0;

        // 计算卖家应得金额并转账
        uint256 sellerAmount = msg.value - royaltyAmount;
		(bool success, ) = seller.call{value: sellerAmount}("");
        require(success, "Transfer to seller failed");

        // 将NFT转移给买家,调用 transferFrom 函数不为"from"账户
        // _transfer(address(this), msg.sender, tokenId);
        this.transferFrom(address(this), msg.sender, tokenId);

        emit NftBought(tokenId, seller, msg.sender, price, royaltyReceiver, royaltyAmount);
    }

	// 获取所有上架的NFT
    function getAllListedItems() public view returns (NFTItem[] memory) {
        uint256 totalItems = tokenIdCounter.current();
        uint256 listedItemCount = 0;
        uint256 currentIndex = 0;

        // 统计当前上架的NFT数量
        for (uint256 i = 1; i <= totalItems; i++) {
            if (nftItems[i].isListed) {
                listedItemCount += 1;
            }
        }

        // 创建一个新数组来存储上架的NFT
        NFTItem[] memory items = new NFTItem[](listedItemCount);

        // 填充架的NFT
        for (uint256 i = 1; i <= totalItems; i++) {
            if (nftItems[i].isListed) {
                items[currentIndex] = nftItems[i];
                currentIndex += 1;
            }
        }

        return items;
    }
	
	// 根据 tokenId 获取对应的NFT信息
    function getNFTItemByTokenId(uint256 tokenId) public view returns (NFTItem memory) {
        require(_exists(tokenId), "NFT does not exist");
        return nftItems[tokenId];
    }

    // 合约拥有者提取合约中的上架费用
    function withdrawFees() public payable onlyOwner nonReentrant {
        payable(owner()).transfer(address(this).balance);
    }
    
    // 检查NFT是否已经碎片化
    function isNFTFractionalized(uint256 tokenId) public view returns (bool) {
        return isFractionalized[tokenId];
    }

    // 碎片化NFT
    function fractionalizeNFT(uint256 tokenId, uint256 total) public {
        require(ownerOf(tokenId) == msg.sender, "Not the owner of this NFT");
        require(!isFractionalized[tokenId], "NFT already fractionalized");
        require(total > 0, "Total fractions must be greater than zero");
        require(!nftItems[tokenId].isListed, "NFT is currently listed, must delist before fractionalizing");

        isFractionalized[tokenId] = true;
        totalFractions[tokenId] = total;
        fractions[tokenId][msg.sender] = Fraction({
            amount: total,
            isForSale: false,
            price: 0
        }); // 初始持有者拥有全部碎片
        fractionOwners[tokenId].push(msg.sender);

        emit NFTFractionalized(tokenId, total);
    }

    // 获取账户的碎片数量
    function getFractionsByAddress(address account) public view returns (uint256[] memory, Fraction[] memory) {
        uint256 totalTokens = tokenIdCounter.current();
        uint256 count = 0;

        // 先统计 account 持有的碎片的数量
        for (uint256 tokenId = 1; tokenId <= totalTokens; tokenId++) {
            if (fractions[tokenId][account].amount > 0) {
                count++;
            }
        }

        // 创建数组以存储结果
        uint256[] memory tokenIds = new uint256[](count);
        Fraction[] memory fractionss = new Fraction[](count);

        // 填充结果
        uint256 index = 0;
        for (uint256 tokenId = 1; tokenId <= totalTokens; tokenId++) {
            if (fractions[tokenId][account].amount > 0) {
                tokenIds[index] = tokenId;
                fractionss[index] = fractions[tokenId][account];
                index++;
            }
        }

        return (tokenIds, fractionss);
    }

    // 设置碎片出售
    function setFractionForSale(uint256 tokenId, uint256 price) public {
        require(isFractionalized[tokenId], "NFT is not fractionalized");
        Fraction storage userFraction = fractions[tokenId][msg.sender];
        require(userFraction.amount > 0, "You do not own any fractions");
        require(price > 0, "Price must be greater than zero");
    
        userFraction.isForSale = true;
        userFraction.price = price;
    
        emit FractionForSale(tokenId, msg.sender, price);
    }

    // 取消碎片出售
    function cancelFractionSale(uint256 tokenId) public {
        require(isFractionalized[tokenId], "NFT is not fractionalized");
        Fraction storage userFraction = fractions[tokenId][msg.sender];
        require(userFraction.isForSale, "Fraction is not for sale");
        require(userFraction.amount > 0, "You do not own any fractions");
    
        userFraction.isForSale = false;
        userFraction.price = 0;
    
        emit FractionSaleCancelled(tokenId, msg.sender);
    }

    // 购买碎片
    function buyFraction(uint256 tokenId, address seller, uint256 amount) public payable nonReentrant {
        require(isFractionalized[tokenId], "NFT is not fractionalized");
        Fraction storage sellerFraction = fractions[tokenId][seller];
        require(sellerFraction.isForSale, "Fraction is not for sale");
        require(sellerFraction.amount >= amount, "Insufficient fractions for sale");
        require(msg.value == sellerFraction.price * amount, "Incorrect payment amount");

        // 保存当前价格用于事件发送
        uint256 pricePerFraction = sellerFraction.price;
    
        // 更新碎片持有量
        sellerFraction.amount -= amount;
        if (sellerFraction.amount == 0) {
            sellerFraction.isForSale = false;
            sellerFraction.price = 0;
        }
    
        fractions[tokenId][msg.sender].amount += amount;
    
        // 如果买家是首次购买该 tokenId 的碎片，添加到 fractionOwners
        if (fractions[tokenId][msg.sender].amount == amount) {
            fractionOwners[tokenId].push(msg.sender);
        }
    
        // 转移资金给卖家
        (bool success, ) = payable(seller).call{value: msg.value}("");
        require(success, "Transfer to seller failed");
    
        emit FractionBought(tokenId, msg.sender, seller, amount, pricePerFraction);
    }

    // 转赠NFT碎片
    function transferFraction(uint256 tokenId, address to, uint256 amount) public {
        require(isFractionalized[tokenId], "NFT is not fractionalized");
        Fraction storage senderFraction = fractions[tokenId][msg.sender];
        require(senderFraction.amount >= amount, "Insufficient fractions");
        require(!senderFraction.isForSale, "Cannot transfer fractions that are for sale");

        senderFraction.amount -= amount;
        // 如果出售状态被部分或全部转移
        if (senderFraction.amount == 0) {
            senderFraction.isForSale = false;
            senderFraction.price = 0;
        }

        fractions[tokenId][to].amount += amount;

        // 如果接收者是首次接收该 tokenId 的碎片，添加到 fractionOwners
        if (fractions[tokenId][to].amount == amount) {
            fractionOwners[tokenId].push(to);
        }

        // emit FractionTransferred(tokenId, msg.sender, to, amount);
    }

    // 集齐所有碎片召唤神龙
    function redeemNFT(uint256 tokenId) public {
        require(isFractionalized[tokenId], "NFT is not fractionalized");
        require(fractions[tokenId][msg.sender].amount == totalFractions[tokenId], "Must own all fractions");
    
        // 取消碎片化
        isFractionalized[tokenId] = false;
        totalFractions[tokenId] = 0;
        delete fractions[tokenId][msg.sender].isForSale;
        delete fractions[tokenId][msg.sender].price;
        fractions[tokenId][msg.sender].amount = 0;
    
        // 清空 fractionOwners 映射
        delete fractionOwners[tokenId];
    
        // 将NFT转移给持有全部碎片的用户
        address previousOwner = ownerOf(tokenId);
        _transfer(previousOwner, msg.sender, tokenId);
    
        // 更新NFTItem信息
        nftItems[tokenId].owner = payable(msg.sender);
        nftItems[tokenId].isListed = false; // 碎片化后通常不再上架
    
        emit NFTRedeemed(tokenId, msg.sender);
    }

    // 返回碎片总量
    function getTotalFractions(uint256 tokenId) public view returns (uint256) {
        return totalFractions[tokenId];
    }

    // 获取所有上架的碎片
    function getAllFractionsForSale() public view returns (uint256[] memory, address[] memory, Fraction[] memory) {
        uint256 totalTokens = tokenIdCounter.current();
        uint256 count = 0;

        // 统计所有上架的碎片数量
        for (uint256 tokenId = 1; tokenId <= totalTokens; tokenId++) {
            if (isFractionalized[tokenId]) {
                address[] memory ownerss = fractionOwners[tokenId];
                for (uint256 j = 0; j < ownerss.length; j++) {
                    address owner = ownerss[j];
                    if (fractions[tokenId][owner].isForSale) {
                        count++;
                    }
                }
            }
        }

        // 创建数组以存储结果
        uint256[] memory tokenIds = new uint256[](count);
        address[] memory owners = new address[](count);
        Fraction[] memory fractionsForSale = new Fraction[](count);

        // 填充结果
        uint256 index = 0;
        for (uint256 tokenId = 1; tokenId <= totalTokens; tokenId++) {
            if (isFractionalized[tokenId]) {
                address[] memory ownersList = fractionOwners[tokenId];
                for (uint256 j = 0; j < ownersList.length; j++) {
                    address owner = ownersList[j];
                    if (fractions[tokenId][owner].isForSale) {
                        tokenIds[index] = tokenId;
                        owners[index] = owner;
                        fractionsForSale[index] = fractions[tokenId][owner];
                        index++;
                    }
                }
            }
        }

        return (tokenIds, owners, fractionsForSale);
    }

    // 设置 NFT 的租赁用户和过期时间
    function setUser(uint256 tokenId, address user, uint64 expires) public override {
        require(_isApprovedOrOwner(msg.sender, tokenId), "ERC4907: caller is not owner nor approved");
        UserInfo storage info = _users[tokenId];
        info.user = user;
        info.expires = expires;
        emit UpdateUser(tokenId, user, expires);
    }

    // 获取 NFT 的当前租赁用户
    function userOf(uint256 tokenId) public view override returns(address) {
        if(uint256(_users[tokenId].expires) >= block.timestamp){
            return _users[tokenId].user;
        } else{
            return address(0);
        }
    }

    // 获取 NFT 的租赁用户过期时间
    function userExpires(uint256 tokenId) public view override returns(uint256) {
        return _users[tokenId].expires;
    }

    // 检查是否可以领取忠诚度奖励
    function checkClaimLoyaltyReward(uint256 tokenId) public view returns (bool) {
        require(_exists(tokenId), "NFT does not exist");
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        
        LoyaltyInfo memory loyalty = nftLoyalty[tokenId];
        
        // 使用 lastTimeStamp 替代 block.timestamp
        // 计算持有时间
        uint256 holdingTime = block.timestamp - loyalty.holdingStartTime;
        // uint256 holdingTime = lastTimeStamp - loyalty.holdingStartTime;
        
        // 计算自上次领取奖励后经过的时间
        uint256 timeSinceLastReward = block.timestamp - loyalty.lastRewardTime;
        // uint256 timeSinceLastReward = lastTimeStamp - loyalty.lastRewardTime;
        
        // // 添加日志事件来帮助调试
        // console.log("Current timestamp:", block.timestamp);
        // console.log("Current timestamp:", lastTimeStamp);
        // console.log("Holding start time:", loyalty.holdingStartTime);
        // console.log("Holding time:", holdingTime);
        // console.log("Last reward time:", loyalty.lastRewardTime);
        // console.log("Time since last reward:", timeSinceLastReward);
        // console.log("Loyalty period:", LOYALTY_PERIOD);
        
        // 需要持有超过忠诚度周期，且距离上次领取超过忠诚度周期
        return holdingTime >= LOYALTY_PERIOD && timeSinceLastReward >= LOYALTY_PERIOD;
    }

    // 领取忠诚度奖励
    function claimLoyaltyReward(uint256 tokenId) public nonReentrant {
        require(checkClaimLoyaltyReward(tokenId), "Cannot claim reward yet");
        require(address(this).balance >= LOYALTY_REWARD, "Insufficient contract balance");
        
        LoyaltyInfo storage loyalty = nftLoyalty[tokenId];
        loyalty.lastRewardTime = block.timestamp;
        
        // 转账奖励
        (bool success, ) = payable(msg.sender).call{value: LOYALTY_REWARD}("");
        require(success, "Reward transfer failed");
        
        emit LoyaltyRewardClaimed(tokenId, msg.sender, LOYALTY_REWARD);
    }

    // 获取NFT的忠诚度信息
    function getLoyaltyInfo(uint256 tokenId) public view returns (
        uint256 holdingStartTime,
        bool rewardClaimed,
        uint256 lastRewardTime,
        uint256 nextRewardTime
    ) {
        require(_exists(tokenId), "NFT does not exist");
        
        LoyaltyInfo memory loyalty = nftLoyalty[tokenId];
        
        holdingStartTime = loyalty.holdingStartTime;
        rewardClaimed = loyalty.rewardClaimed;
        lastRewardTime = loyalty.lastRewardTime;
        
        // 计算下次可领取奖励的时间
        if (lastRewardTime == 0) {
            nextRewardTime = holdingStartTime + LOYALTY_PERIOD;
        } else {
            nextRewardTime = lastRewardTime + LOYALTY_PERIOD;
        }
    }

    // 创建盲盒（只有合约拥有者可以调用）
    function createMysteryBox(
        uint256 _price, 
        string[] memory _possibleURIs,
        uint96 _royaltyFee
    ) public onlyOwner {
        require(_possibleURIs.length > 0, "Must provide URIs");
        require(_price > 0, "Price must be greater than 0");
        
        // 存储每个 URI
        for(uint256 i = 0; i < _possibleURIs.length; i++) {
            mysteryBoxURIs[i] = _possibleURIs[i];
        }
        
        mysteryBox = MysteryBox({
            price: _price,
            isActive: true,
            royaltyFee: _royaltyFee,
            uriCount: _possibleURIs.length
        });

        emit MysteryBoxCreated(_price, _possibleURIs.length);
    }

    // 设置盲盒状态
    function setMysteryBoxStatus(bool _isActive) public onlyOwner {
        mysteryBox.isActive = _isActive;
        emit MysteryBoxStatusChanged(_isActive);
    }

    // 更新盲盒价格
    function updateMysteryBoxPrice(uint256 _newPrice) public onlyOwner {
        require(_newPrice > 0, "Price must be greater than 0");
        mysteryBox.price = _newPrice;
    }

    // 添加新的 URI 到盲盒
    function addURIToMysteryBox(string memory _uri) public onlyOwner {
        mysteryBoxURIs[mysteryBox.uriCount] = _uri;
        mysteryBox.uriCount++;
    }

    // 获取指定索引的 URI
    function getMysteryBoxURI(uint256 index) public view returns (string memory) {
        require(index < mysteryBox.uriCount, "URI index out of bounds");
        return mysteryBoxURIs[index];
    }

    // 获取盲盒信息
    function getMysteryBoxInfo() public view returns (
        uint256 price,
        bool isActive,
        uint256 totalURIs
    ) {
        return (
            mysteryBox.price,
            mysteryBox.isActive,
            mysteryBox.uriCount
        );
    }

    // 生成伪随机数
    function _random() private returns (uint256) {
        nonce++;
        return uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.difficulty,
            msg.sender,
            nonce
        )));
    }

    // 购买盲盒
    function purchaseMysteryBox() public payable nonReentrant {
        require(mysteryBox.isActive, "Mystery box is not active");
        require(msg.value == mysteryBox.price, "Incorrect payment amount");
        require(mysteryBox.uriCount > 0, "No NFTs available in mystery box");

        // 生成随机索引
        uint256 randomIndex = _random() % mysteryBox.uriCount;
        string memory selectedURI = mysteryBoxURIs[randomIndex];

        // 铸造 NFT
        uint256 newTokenId = mintItem(msg.sender, selectedURI, mysteryBox.royaltyFee);

        // 从可能的 URI 列表中移除已使用的 URI（可选）
        // 如果想让每个 URI 只能使用一次，取消下面的注释
        /*
        mysteryBox.possibleURIs[randomIndex] = mysteryBox.possibleURIs[mysteryBox.possibleURIs.length - 1];
        mysteryBox.possibleURIs.pop();
        */

        emit MysteryBoxPurchased(msg.sender, newTokenId, selectedURI);
    }

    // 设置默克尔树根（仅管理员可调用）
    function setMerkleRoot(bytes32 _merkleRoot) public onlyOwner {
        merkleRoot = _merkleRoot;
        emit MerkleRootSet(_merkleRoot);
    }

    // 验证地址和tokenId是否在空投白名单中
    function isWhitelisted(address account, uint256 tokenId, bytes32[] calldata proof) public view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(account, tokenId));
        return MerkleProof.verify(proof, merkleRoot, leaf);
    }

    // 领取空投
    function claimAirdrop(
        uint256 tokenId,
        bytes32[] calldata proof
    ) public nonReentrant {
        require(merkleRoot != bytes32(0), "Merkle root not set");
        require(!hasClaimed[msg.sender], "Already claimed");
        require(
            isWhitelisted(msg.sender, tokenId, proof),
            "Not in whitelist or invalid proof"
        );

        // 标记为已领取
        hasClaimed[msg.sender] = true;

        // 转移 NFT
        address owner = ownerOf(tokenId);
        _transfer(owner, msg.sender, tokenId);

        // 更新 NFT 信息
        nftItems[tokenId].owner = payable(msg.sender);
        nftItems[tokenId].isListed = false;

        emit AirdropClaimed(msg.sender, tokenId);
    }

    // Cross-chain functionality
    
    /**
     * @dev Set XCM Bridge contract address (only owner)
     * @param _xcmBridge XCM Bridge contract address
     */
    function setXCMBridge(address _xcmBridge) external onlyOwner {
        require(_xcmBridge != address(0), "Invalid XCM Bridge address");
        xcmBridge = _xcmBridge;
    }

    /**
     * @dev Lock NFT for cross-chain transfer (only XCM Bridge)
     * @param tokenId Token ID to lock
     * @param messageHash XCM message hash
     */
    function lockForCrossChain(uint256 tokenId, bytes32 messageHash) external {
        require(msg.sender == xcmBridge, "Only XCM Bridge can lock NFTs");
        require(_exists(tokenId), "Token does not exist");
        require(!isLockedForCrossChain[tokenId], "NFT already locked");

        isLockedForCrossChain[tokenId] = true;
        crossChainMessages[messageHash] = tokenId;

        emit NFTLockedForCrossChain(tokenId, ownerOf(tokenId), messageHash);
    }

    /**
     * @dev Unlock NFT from cross-chain transfer (only XCM Bridge)
     * @param tokenId Token ID to unlock
     * @param messageHash XCM message hash
     */
    function unlockFromCrossChain(uint256 tokenId, bytes32 messageHash) external {
        require(msg.sender == xcmBridge, "Only XCM Bridge can unlock NFTs");
        require(_exists(tokenId), "Token does not exist");
        require(isLockedForCrossChain[tokenId], "NFT not locked");
        require(crossChainMessages[messageHash] == tokenId, "Invalid message hash");

        isLockedForCrossChain[tokenId] = false;
        delete crossChainMessages[messageHash];

        emit NFTUnlockedFromCrossChain(tokenId, ownerOf(tokenId), messageHash);
    }

    /**
     * @dev Check if NFT is locked for cross-chain transfer
     * @param tokenId Token ID to check
     * @return bool Whether the NFT is locked
     */
    function isNFTLockedForCrossChain(uint256 tokenId) external view returns (bool) {
        return isLockedForCrossChain[tokenId];
    }

    /**
     * @dev Get token ID by XCM message hash
     * @param messageHash XCM message hash
     * @return uint256 Token ID
     */
    function getTokenIdByMessageHash(bytes32 messageHash) external view returns (uint256) {
        return crossChainMessages[messageHash];
    }

    /**
     * @dev Override transfer functions to prevent transfer of locked NFTs
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 quantity
    ) internal override(ERC721, ERC721Enumerable) {
        // Prevent transfer of locked NFTs (except for XCM Bridge)
        if (from != address(0) && to != address(0) && msg.sender != xcmBridge) {
            require(!isLockedForCrossChain[tokenId], "NFT is locked for cross-chain transfer");
        }

        super._beforeTokenTransfer(from, to, tokenId, quantity); // 调用父类的函数

        // 如果是新的转账（不是铸造），则重置忠诚度信息
        // holdingStartTime: lastTimeStamp,
        if (from != address(0) && to != address(0)) {
            nftLoyalty[tokenId] = LoyaltyInfo({
                holdingStartTime: block.timestamp,
                rewardClaimed: false,
                lastRewardTime: 0
            });
        }
        // 如果是铸造，则初始化忠诚度信息
        // holdingStartTime: lastTimeStamp,
        else if (from == address(0)) {
            nftLoyalty[tokenId] = LoyaltyInfo({
                holdingStartTime: block.timestamp,
                rewardClaimed: false,
                lastRewardTime: 0
            });
        }

        // 如果转移的 NFT 有租赁用户，则删除租赁用户信息
        if (from != to && _users[tokenId].user != address(0)) {
            delete _users[tokenId];
        }
    }

	function _burn(
		uint256 tokenId
	) internal override(ERC721, ERC721URIStorage, ERC721Royalty) {
		super._burn(tokenId); // 调用父类的销毁函数
	}

	function tokenURI(
		uint256 tokenId
	) public view override(ERC721, ERC721URIStorage) returns (string memory) {
		return super.tokenURI(tokenId); // 获取 token 的 URI
	}

	function supportsInterface(
		bytes4 interfaceId
	)
		public
		view
		override(ERC721, ERC721Enumerable, ERC721URIStorage, ERC721Royalty)
		returns (bool)
	{
		return super.supportsInterface(interfaceId); // 检查接口支持
	}



}
