// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ======================================================
// ===== OWNABLE_MINI (CTRL+F: OWNABLE_MINI) ============
// ======================================================
contract OwnableMini {
    address public owner;
    error NotOwner();
    event OwnershipTransferred(address indexed to);

    function _initOwner(address o) internal {
        owner = o;
        emit OwnershipTransferred(o);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function transferOwnership(address to) external onlyOwner {
        owner = to;
        emit OwnershipTransferred(to);
    }
}

// ======================================================
// ===== ERC721_MINI (CTRL+F: ERC721_MINI) ==============
// - 不可转让NFT
// ======================================================
interface IERC721Mini {
    event Transfer(address indexed from, address indexed to, uint256 indexed id);
    function balanceOf(address) external view returns (uint256);
    function ownerOf(uint256 id) external view returns (address);
}

contract ERC721Mini is IERC721Mini {
    mapping(uint256 => address) internal _ownerOf;
    mapping(address  => uint256) internal _balanceOf;

    error NoToken();
    error NotTokenOwner();
    
    function ownerOf(uint256 id) public view returns (address o) {
        o = _ownerOf[id];
        if (o == address(0)) revert NoToken();
    }

    function balanceOf(address a) external view returns (uint256) {
        return _balanceOf[a];
    }

   
    function _mintTo(address to, uint256 id) internal {
        if (to == address(0) || _ownerOf[id] != address(0)) revert NotTokenOwner();
        _ownerOf[id] = to;
        _balanceOf[to] += 1;
        emit Transfer(address(0), to, id);
    }
}

// ======================================================
// ===== MAIN CONTRACT (CTRL+F: TarotAllInOne) ==========
// - 多订单收费 + 批量退款 + NFT mint/转让
// ======================================================
contract TarotAllInOne is OwnableMini, ERC721Mini {
     error RefundFail();
     error WithdrawFail();
     error SendFail();

    // -----------------------------------------
    // ===== NONREENTRANT (CTRL+F: NO_REENT) ====
    // -----------------------------------------
    uint8 private _locked;
    modifier nonReentrant() {
        if (_locked == 1) revert();
        _locked = 1;
        _;
        _locked = 0;
    }

    // -----------------------------------------
    // ===== PRICES (CTRL+F: PRICE_FIELDS) =====
    // -----------------------------------------
    uint256 public mintPriceWei;      // mint 一张占卜结果NFT要付的价格 (可以是0)
    uint256 public unitPricePerCard;  // 每一张牌的解锁单价，比如0.1 PAS(wei)

    // -----------------------------------------
    // ===== NFT STORAGE (CTRL+F: NFT_STORE) ===
    // -----------------------------------------
    uint256 public nextTokenId;                 // 自增NFT id
    mapping(uint256 => string) public tokenURI;

    // -----------------------------------------
    // ===== ORDER STRUCT (CTRL+F: ORDER_STRUCT_MULTI_REFUND)
    //
    // 我们支持 "多订单"：
    // orders[user][orderId] = { amount, delivered, refunded }
    // nextOrderId[user] 是下一个订单号
    //
    // - payToUnlock(cards):
    //      新建 orders[user][oid]
    // - markDelivered(oid):
    //      这笔单记为 delivered=true，把钱记到merchantBalance
    // - refundFailedOrders():
    //      扫描所有 oid < nextOrderId[user]，
    //      把 !delivered && !refunded 的金额累加，一次性退给用户
    //      并把这些订单标记 refunded=true，amount清0
    //
    // 「订单2已退过就不再退」，「成功交付的不退」。
    // -----------------------------------------
    struct Order { uint128 amount; uint8 flags; } 
    // flags: bit0 = delivered, bit1 = refunded


    mapping(address => mapping(uint256 => Order)) public orders;
    mapping(address => uint256) public nextOrderId;

    uint256 public merchantBalance; // 已经交付成功、不可退款的钱

    // -----------------------------------------
    // ===== EVENTS (CTRL+F: EVENTS_ALLINONE)
    // -----------------------------------------
    
    // -----------------------------------------
    // ===== INIT (CTRL+F: INIT_ALLINONE)
    // 调用一次，代替constructor，方便优化后用普通部署或代理部署
    // -----------------------------------------
    error AlreadyInited();
    function initialize(
        address ownerAddr,
        uint256 nftPriceWei,
        uint256 cardPriceWei
    ) external {
        if (owner != address(0)) revert AlreadyInited();
        _initOwner(ownerAddr);

        mintPriceWei     = nftPriceWei;
        unitPricePerCard = cardPriceWei;
        nextTokenId      = 1; // NFT从1开始，比较好看
    }

    // 管理员后改价
    function setMintPrice(uint256 p) external onlyOwner { mintPriceWei = p; }
    function setUnitPrice(uint256 p) external onlyOwner { unitPricePerCard = p; }

    // -----------------------------------------
    // ===== VIEW HELPERS (CTRL+F: VIEW_HELPERS)
    // -----------------------------------------
   
    function getOrder(address user, uint256 oid)
    external
    view
    returns (uint256 amountWei, bool delivered, bool refunded)
{
    Order storage o = orders[user][oid];
    return (o.amount, (o.flags & 1) != 0, (o.flags & 2) != 0);
}


    // -----------------------------------------
    // ===== MINT NFT (CTRL+F: MINT_READING)
    //
    // 用户上传这次占卜的结果截图IPFS -> uri
    // 然后付 mintPriceWei (或免费=0) 来铸纪念NFT
    // NFT 初始归调用者自己，之后可 transferFrom 自己转走
    // -----------------------------------------
    error PriceNotMatch();
    function mintReading(string calldata uri)
        external
        payable
        nonReentrant
        returns (uint256 tid)
    {
        if (msg.value != mintPriceWei) revert PriceNotMatch();
        tid = nextTokenId++;
        _mintTo(msg.sender, tid);
        tokenURI[tid] = uri;
     }

    // -----------------------------------------
    // ===== PAY TO UNLOCK (CTRL+F: PAY_TO_UNLOCK_MULTI)
    //
    // 用户为本次牌阵付费：
    // cards * unitPricePerCard = 本单应付金额 needWei
    // 我们创建一个新订单号 oid = nextOrderId[user]，递增
    // 把金额记进 orders[user][oid].amount
    //
    // 注意：允许连续很多单，不阻止并发
    // -----------------------------------------
    error BadValue();
    function payToUnlock(uint256 cards) external payable nonReentrant {
    if (cards == 0) revert();

        uint256 need = unitPricePerCard * cards;
        if (msg.value != need) revert BadValue();

        uint256 oid = nextOrderId[msg.sender];
        nextOrderId[msg.sender] = oid + 1;

        orders[msg.sender][oid] = Order({ amount: uint128(need), flags: 0 });

        }

    // -----------------------------------------
    // ===== MARK DELIVERED (CTRL+F: MARK_DELIVERED_ONE)
    //
    // 用户确认“这单AI结果成功交付”，不可再退：
    // 1. 标记 delivered = true
    // 2. merchantBalance += 该单金额
    // 3. 该订单的 amount 清零，防止以后再退
    //
    // 这个是逐单确认的，因为每单结果不一样。
    // -----------------------------------------
    error NoSuchOrder();
    error AlreadyDelivered();
    error AlreadyRefunded();
    function markDelivered(uint256 oid) external nonReentrant {
        Order storage o = orders[msg.sender][oid];
        if (o.amount == 0 && o.flags == 0) revert NoSuchOrder();
        if ((o.flags & 1) != 0) revert AlreadyDelivered();
        if ((o.flags & 2) != 0) revert AlreadyRefunded();

        uint256 amt = o.amount;
        o.flags |= 1;          // delivered = true
        o.amount = 0;
        merchantBalance += amt;
    }

    // -----------------------------------------
    // ===== REFUND FAILED ORDERS (CTRL+F: REFUND_BATCH)
    //
    // 需求的重点：
    // - 扫描此用户从 0 到 nextOrderId[user]-1 的所有订单
    // - 找出 delivered==false && refunded==false 的
    // - 把它们的金额累加 total
    // - 全部标记 refunded=true、amount=0
    // - 最后一次性把 total 原路退回
    //
    // 这样：
    // 订单1成功(已delivered) → 不退
    // 订单2失败(没delivered) → 退
    // 订单3成功 → 不退
    // 订单4失败 → 退
    // 再点一次，只会退还未来新失败的订单，因为旧的已经标成 refunded=true。
    // -----------------------------------------
    function refundFailedOrders() external nonReentrant {
        uint256 maxOid = nextOrderId[msg.sender];
        uint256 total;

        for (uint256 oid = 0; oid < maxOid; oid++) {
            Order storage o = orders[msg.sender][oid];

           if (o.amount > 0 && (o.flags & 1) == 0 && (o.flags & 2) == 0) {
            total += o.amount;
            o.flags |= 2;      // refunded = true
            o.amount = 0;
            }
            }

        if (total > 0) {
            (bool ok, ) = payable(msg.sender).call{value: total}("");
            if (!ok) revert RefundFail();
            }
        // 如果 total == 0，就啥也不退，静默通过
    }

    // -----------------------------------------
    // ===== MERCHANT WITHDRAW (CTRL+F: WITHDRAW_OWNER)
    //
    // withdraw()       : 把已经交付成功的收入(merchantBalance)提到 owner
    // ownerRefund(to)  : 从 merchantBalance 拿钱给指定地址(比如补偿/空投奖励)
    //
    // 注意：merchantBalance 里只有“用户自己点了 markDelivered()”的金额。
    // 没交付/已退款的金额绝不会进来，保证安全。
    // -----------------------------------------
    error TooMuch();
    function withdraw(uint256 amountWei) external onlyOwner nonReentrant {
        if (amountWei > merchantBalance) revert TooMuch();
        merchantBalance -= amountWei;
        (bool ok, ) = payable(owner).call{value: amountWei}("");
        if (!ok) revert WithdrawFail();
    }

    function ownerRefund(address payable to, uint256 amountWei)
        external
        onlyOwner
        nonReentrant
    {
        if (amountWei > merchantBalance) revert TooMuch();
        merchantBalance -= amountWei;
        (bool ok, ) = to.call{value: amountWei}("");
        if (!ok) revert SendFail();
    }
}
