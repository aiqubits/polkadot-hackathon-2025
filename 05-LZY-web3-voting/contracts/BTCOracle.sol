// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "./interfaces/IVotingContract.sol";

/**
 * @title BTCOracle
 * @dev 比特币市值预言机合约
 * 集成 Chainlink 数据源，定期获取比特币市值数据并判定投票结果
 */
contract BTCOracle is Ownable, Pausable {
    // Chainlink 数据源接口
    AggregatorV3Interface internal btcPriceFeed;

    // 竞争链配置
    struct CompetitorChain {
        string name;                           // 链名称（如 "Ethereum", "Solana"）
        address priceFeed;                     // Chainlink 价格源地址
        uint256 circulatingSupply;             // 流通供应量
        bool isActive;                         // 是否激活
        uint256 lastUpdatedTime;               // 最后更新时间
    }

    // 市值阈值配置
    struct MarketCapThreshold {
        uint256 btcMarketCap;      // 比特币市值阈值（美元）
        uint256 competitorCap;     // 竞争链市值阈值（美元）
        bool isActive;             // 是否激活
    }

    // 投票结果判定
    enum VoteResult {
        BTC_DOMINANT,    // 比特币仍占主导
        COMPETITOR_WIN,  // 竞争链获胜
        PENDING          // 待定
    }

    // 年份范围判定结果
    struct YearRangeResult {
        uint256 predictedYear;  // 预测年份（0表示永不会）
        bool isCorrect;         // 是否预测正确
        uint256 actualYear;     // 实际超越年份（0表示未超越）
    }

    // 投票期数据快照（支持多竞争链）
    struct MarketSnapshot {
        uint256 timestamp;
        uint256 btcMarketCap;
        mapping(uint256 => uint256) competitorMarketCaps; // 各竞争链市值
        uint256 highestCompetitorCap;                    // 最高竞争链市值
        uint256 winningCompetitorId;                     // 获胜竞争链ID（如果有）
        VoteResult result;
    }

    // 常量
    uint256 public constant SNAPSHOT_INTERVAL = 24 hours; // 快照间隔
    uint256 public constant VOTING_DURATION = 365 days;   // 投票持续时间

    // 状态变量
    mapping(uint256 => MarketSnapshot[]) public votingPeriodSnapshots;
    mapping(uint256 => MarketCapThreshold) public thresholds;
    mapping(uint256 => uint256) public lastSnapshotTime;

    // 多竞争链配置
    mapping(uint256 => CompetitorChain) public competitors;
    uint256 public competitorCount;
    uint256 public btcCirculatingSupply = 19500000e8; // BTC 流通供应量（8位精度）

    address public votingContract; // 投票合约地址
    uint256 public currentVotingPeriod;

    // 事件
    event MarketSnapshotTaken(uint256 indexed votingPeriodId, uint256 btcCap, uint256 highestCompetitorCap, uint256 winningCompetitorId);
    event ThresholdUpdated(uint256 indexed votingPeriodId, uint256 btcThreshold, uint256 competitorThreshold);
    event VotingContractUpdated(address oldContract, address newContract);
    event CompetitorAdded(uint256 indexed competitorId, string name, address priceFeed);
    event CompetitorUpdated(uint256 indexed competitorId, uint256 newSupply);
    event CompetitorStatusChanged(uint256 indexed competitorId, bool active);
    event VotingPeriodFinalized(uint256 indexed votingPeriodId, uint256 correctYear);
    event BTCSupplyUpdated(uint256 newSupply);

    constructor(
        address _btcPriceFeed,
        address _votingContract
    ) Ownable(msg.sender) {
        btcPriceFeed = AggregatorV3Interface(_btcPriceFeed);
        votingContract = _votingContract;

        // 初始化第一个投票期阈值
        currentVotingPeriod = 1;
        thresholds[1] = MarketCapThreshold({
            btcMarketCap: 1000000000000, // 1万亿美元
            competitorCap: 500000000000,  // 5000亿美元
            isActive: true
        });
    }

    /**
     * @dev 获取最新价格数据
     * @param priceFeed 价格源合约地址
     * @return 价格（精度：8位小数）
     */
    function getLatestPrice(AggregatorV3Interface priceFeed) internal view returns (int256) {
        (
            /*uint80 roundID*/,
            int256 price,
            /*uint startedAt*/,
            /*uint timeStamp*/,
            /*uint80 answeredInRound*/
        ) = priceFeed.latestRoundData();
        return price;
    }

    /**
     * @dev 获取代币市值（简化计算：价格 * 流通供应量）
     * 注意：实际项目中应该使用更准确的市值数据源
     * @param price 价格
     * @param supply 流通供应量
     * @return 市值（美元）
     */
    function calculateMarketCap(int256 price, uint256 supply) internal pure returns (uint256) {
        require(price > 0, "Invalid price");
        return uint256(price) * supply / 1e8; // Chainlink 返回8位精度
    }

    // ============ 竞争链管理功能 ============

    /**
     * @dev 添加竞争链
     * @param name 链名称
     * @param priceFeed Chainlink 价格源地址
     * @param circulatingSupply 流通供应量
     */
    function addCompetitor(
        string memory name,
        address priceFeed,
        uint256 circulatingSupply
    ) external onlyOwner {
        require(priceFeed != address(0), "Invalid price feed address");
        require(circulatingSupply > 0, "Invalid circulating supply");

        uint256 competitorId = competitorCount;
        competitors[competitorId] = CompetitorChain({
            name: name,
            priceFeed: priceFeed,
            circulatingSupply: circulatingSupply,
            isActive: true,
            lastUpdatedTime: block.timestamp
        });
        
        competitorCount++;
        emit CompetitorAdded(competitorId, name, priceFeed);
    }

    /**
     * @dev 更新竞争链供应量
     * @param competitorId 竞争链ID
     * @param newSupply 新的流通供应量
     */
    function updateCompetitorSupply(
        uint256 competitorId,
        uint256 newSupply
    ) external onlyOwner {
        require(competitorId < competitorCount, "Competitor does not exist");
        require(newSupply > 0, "Invalid circulating supply");

        competitors[competitorId].circulatingSupply = newSupply;
        competitors[competitorId].lastUpdatedTime = block.timestamp;
        emit CompetitorUpdated(competitorId, newSupply);
    }

    /**
     * @dev 启用/禁用竞争链
     * @param competitorId 竞争链ID
     * @param active 是否激活
     */
    function setCompetitorActive(
        uint256 competitorId,
        bool active
    ) external onlyOwner {
        require(competitorId < competitorCount, "Competitor does not exist");

        competitors[competitorId].isActive = active;
        competitors[competitorId].lastUpdatedTime = block.timestamp;
        emit CompetitorStatusChanged(competitorId, active);
    }

    /**
     * @dev 更新 BTC 供应量
     * @param newSupply 新的流通供应量
     */
    function updateBTCSupply(uint256 newSupply) external onlyOwner {
        require(newSupply > 0, "Invalid BTC supply");
        btcCirculatingSupply = newSupply;
        emit BTCSupplyUpdated(newSupply);
    }

    /**
     * @dev 拍摄市场快照并判定结果
     * @param votingPeriodId 投票期ID
     */
    function takeMarketSnapshot(uint256 votingPeriodId) external whenNotPaused {
        require(thresholds[votingPeriodId].isActive, "Threshold not set");
        
        // 移除时间间隔限制，允许随时拍摄快照
        // require(
        //     block.timestamp >= lastSnapshotTime[votingPeriodId] + SNAPSHOT_INTERVAL,
        //     "Snapshot interval not reached"
        // );

        // 获取市值数据
        (uint256 btcCap, uint256[] memory competitorCaps) = _getMarketCaps();
        
        // 找出最高市值的竞争链
        (uint256 highestCap, uint256 winnerId) = _findHighestCompetitor(competitorCaps);
        
        // 判定结果
        VoteResult result = VoteResult.PENDING;
        if (highestCap > btcCap) {
            result = VoteResult.COMPETITOR_WIN;
        } else {
            result = VoteResult.BTC_DOMINANT;
        }
        
        // 保存快照
        _saveSnapshot(votingPeriodId, btcCap, competitorCaps, highestCap, winnerId, result);
        
        // 如果投票期结束且有竞争链获胜，立即开奖
        if (block.timestamp >= getVotingEndTime(votingPeriodId)) {
            if (result == VoteResult.COMPETITOR_WIN) {
                // 计算正确年份并开奖
                uint256 correctYear = _calculateCorrectYear(block.timestamp);
                _notifyVotingContract(votingPeriodId, correctYear);
            }
            // 如果 BTC 依然主导，等待投票期完全结束后设置为"永不会"
        }
    }

    /**
     * @dev 获取市值数据（支持多竞争链）
     */
    function _getMarketCaps() internal view returns (
        uint256 btcCap,
        uint256[] memory competitorCaps
    ) {
        // 获取 BTC 市值
        int256 btcPrice = getLatestPrice(btcPriceFeed);
        require(btcPrice > 0, "Invalid BTC price");
        btcCap = calculateMarketCap(btcPrice, btcCirculatingSupply);
        
        // 获取所有激活的竞争链市值
        competitorCaps = new uint256[](competitorCount);
        for (uint256 i = 0; i < competitorCount; i++) {
            if (competitors[i].isActive) {
                int256 price = getLatestPrice(
                    AggregatorV3Interface(competitors[i].priceFeed)
                );
                if (price > 0) {
                    competitorCaps[i] = calculateMarketCap(
                        price,
                        competitors[i].circulatingSupply
                    );
                }
            }
        }
    }

    /**
     * @dev 找出最高市值的竞争链
     */
    function _findHighestCompetitor(uint256[] memory caps) 
        internal 
        view 
        returns (uint256 highestCap, uint256 winnerId) 
    {
        for (uint256 i = 0; i < caps.length; i++) {
            if (caps[i] > highestCap) {
                highestCap = caps[i];
                winnerId = i;
            }
        }
    }

    /**
     * @dev 保存快照
     */
    function _saveSnapshot(
        uint256 votingPeriodId,
        uint256 btcCap,
        uint256[] memory competitorCaps,
        uint256 highestCap,
        uint256 winnerId,
        VoteResult result
    ) internal {
        MarketSnapshot storage snapshot = votingPeriodSnapshots[votingPeriodId].push();
        snapshot.timestamp = block.timestamp;
        snapshot.btcMarketCap = btcCap;
        snapshot.highestCompetitorCap = highestCap;
        snapshot.winningCompetitorId = winnerId;
        snapshot.result = result;

        // 保存各竞争链市值
        for (uint256 i = 0; i < competitorCaps.length; i++) {
            snapshot.competitorMarketCaps[i] = competitorCaps[i];
        }

        lastSnapshotTime[votingPeriodId] = block.timestamp;

        emit MarketSnapshotTaken(votingPeriodId, btcCap, highestCap, winnerId);
    }

    /**
     * @dev 计算正确答案年份（基于超越时间）
     * @param timestamp 超越发生的时间戳
     * @return 正确答案年份（0表示永不会）
     */
    function _calculateCorrectYear(uint256 timestamp) 
        internal 
        pure 
        returns (uint256) 
    {
        uint256 year = (timestamp / 365 days) + 1970; // 简化计算
        // 返回最接近的奇数年
        if (year % 2 == 0) {
            year += 1;
        }
        return year;
    }

    /**
     * @dev 手动触发投票期结算（投票期结束后可调用）
     * @param votingPeriodId 投票期ID
     */
    function finalizeVotingPeriod(uint256 votingPeriodId) external onlyOwner {
        require(block.timestamp >= getVotingEndTime(votingPeriodId), "Period not ended");
        require(!isVotingPeriodResolved(votingPeriodId), "Already resolved");
        
        // 获取最新快照判断结果
        MarketSnapshot storage snapshot = _getLatestSnapshot(votingPeriodId);
        
        uint256 correctYear;
        if (snapshot.result == VoteResult.COMPETITOR_WIN) {
            correctYear = _calculateCorrectYear(snapshot.timestamp);
        } else {
            correctYear = 0; // 永不会
        }
        
        _notifyVotingContract(votingPeriodId, correctYear);
        emit VotingPeriodFinalized(votingPeriodId, correctYear);
    }

    /**
     * @dev 获取投票期开始时间
     * @param votingPeriodId 投票期ID
     */
    function _getVotingPeriodStartTime(uint256 votingPeriodId) internal view returns (uint256) {
        IVotingContract voting = IVotingContract(votingContract);
        (uint256 startTime,,,,) = voting.votingPeriods(votingPeriodId);
        return startTime;
    }

    /**
     * @dev 通知投票合约开奖结果
     * @param votingPeriodId 投票期ID
     * @param correctYear 正确答案年份
     */
    function _notifyVotingContract(uint256 votingPeriodId, uint256 correctYear) internal {
        IVotingContract(votingContract).resolveVotingPeriod(votingPeriodId, correctYear);
    }

    /**
     * @dev 获取投票期结束时间
     * @param votingPeriodId 投票期ID
     */
    function getVotingEndTime(uint256 votingPeriodId) public view returns (uint256) {
        IVotingContract voting = IVotingContract(votingContract);
        (,uint256 endTime,,,) = voting.votingPeriods(votingPeriodId);
        return endTime;
    }

    /**
     * @dev 获取投票期的最新快照（内部使用）
     * @param votingPeriodId 投票期ID
     */
    function _getLatestSnapshot(uint256 votingPeriodId) internal view returns (MarketSnapshot storage) {
        MarketSnapshot[] storage snapshots = votingPeriodSnapshots[votingPeriodId];
        require(snapshots.length > 0, "No snapshots available");
        return snapshots[snapshots.length - 1];
    }

    /**
     * @dev 获取投票期的最新快照（外部查询）
     * @param votingPeriodId 投票期ID
     */
    function getLatestSnapshotInfo(uint256 votingPeriodId) external view returns (
        uint256 timestamp,
        uint256 btcMarketCap,
        uint256 highestCompetitorCap,
        uint256 winningCompetitorId,
        VoteResult result
    ) {
        MarketSnapshot storage snapshot = _getLatestSnapshot(votingPeriodId);
        return (
            snapshot.timestamp,
            snapshot.btcMarketCap,
            snapshot.highestCompetitorCap,
            snapshot.winningCompetitorId,
            snapshot.result
        );
    }

    /**
     * @dev 获取投票期的快照数量
     * @param votingPeriodId 投票期ID
     */
    function getSnapshotCount(uint256 votingPeriodId) external view returns (uint256) {
        return votingPeriodSnapshots[votingPeriodId].length;
    }

    /**
     * @dev 设置投票期阈值（仅管理员）
     * @param votingPeriodId 投票期ID
     * @param btcThreshold 比特币市值阈值
     * @param competitorThreshold 竞争链市值阈值
     */
    function setThreshold(
        uint256 votingPeriodId,
        uint256 btcThreshold,
        uint256 competitorThreshold
    ) external onlyOwner {
        thresholds[votingPeriodId] = MarketCapThreshold({
            btcMarketCap: btcThreshold,
            competitorCap: competitorThreshold,
            isActive: true
        });

        emit ThresholdUpdated(votingPeriodId, btcThreshold, competitorThreshold);
    }

    /**
     * @dev 更新投票合约地址（仅管理员）
     * @param newVotingContract 新投票合约地址
     */
    function updateVotingContract(address newVotingContract) external onlyOwner {
        require(newVotingContract != address(0), "Invalid contract address");
        address oldContract = votingContract;
        votingContract = newVotingContract;

        emit VotingContractUpdated(oldContract, newVotingContract);
    }

    /**
     * @dev 更新 BTC 价格源地址（仅管理员）
     * @param newPriceFeed 新价格源地址
     */
    function updateBTCPriceFeed(address newPriceFeed) external onlyOwner {
        require(newPriceFeed != address(0), "Invalid price feed address");
        btcPriceFeed = AggregatorV3Interface(newPriceFeed);
        
        // 测试新价格源是否工作
        try this.getBTCPrice() returns (int256) {
            // 价格源工作正常
        } catch {
            revert("New price feed is not working");
        }
    }

    /**
     * @dev 获取BTC价格
     */
    function getBTCPrice() external view returns (int256) {
        return getLatestPrice(btcPriceFeed);
    }

    // ============ 查询接口 ============

    /**
     * @dev 获取竞争链信息
     * @param competitorId 竞争链ID
     */
    function getCompetitorInfo(uint256 competitorId) 
        external 
        view 
        returns (CompetitorChain memory) 
    {
        require(competitorId < competitorCount, "Competitor does not exist");
        return competitors[competitorId];
    }

    /**
     * @dev 获取所有竞争链信息
     */
    function getAllCompetitors() 
        external 
        view 
        returns (CompetitorChain[] memory) 
    {
        CompetitorChain[] memory allCompetitors = new CompetitorChain[](competitorCount);
        for (uint256 i = 0; i < competitorCount; i++) {
            allCompetitors[i] = competitors[i];
        }
        return allCompetitors;
    }

    /**
     * @dev 获取指定快照信息
     * @param votingPeriodId 投票期ID
     * @param snapshotIndex 快照索引
     */
    function getSnapshot(uint256 votingPeriodId, uint256 snapshotIndex) 
        external 
        view 
        returns (
            uint256 timestamp,
            uint256 btcCap,
            uint256 highestCompetitorCap,
            uint256 winningCompetitorId,
            VoteResult result
        ) 
    {
        require(snapshotIndex < votingPeriodSnapshots[votingPeriodId].length, "Snapshot does not exist");
        MarketSnapshot storage snapshot = votingPeriodSnapshots[votingPeriodId][snapshotIndex];
        
        return (
            snapshot.timestamp,
            snapshot.btcMarketCap,
            snapshot.highestCompetitorCap,
            snapshot.winningCompetitorId,
            snapshot.result
        );
    }

    /**
     * @dev 获取竞争链在指定快照中的市值
     * @param votingPeriodId 投票期ID
     * @param snapshotIndex 快照索引
     * @param competitorId 竞争链ID
     */
    function getCompetitorMarketCap(
        uint256 votingPeriodId, 
        uint256 snapshotIndex, 
        uint256 competitorId
    ) external view returns (uint256) {
        require(snapshotIndex < votingPeriodSnapshots[votingPeriodId].length, "Snapshot does not exist");
        MarketSnapshot storage snapshot = votingPeriodSnapshots[votingPeriodId][snapshotIndex];
        return snapshot.competitorMarketCaps[competitorId];
    }

    /**
     * @dev 检查投票期是否已开奖
     * @param votingPeriodId 投票期ID
     */
    function isVotingPeriodResolved(uint256 votingPeriodId) 
        public 
        view 
        returns (bool) 
    {
        IVotingContract voting = IVotingContract(votingContract);
        (,,,bool resolved,) = voting.votingPeriods(votingPeriodId);
        return resolved;
    }

    /**
     * @dev 暂停合约（紧急情况）
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
     * @dev 检查快照是否可用（时间限制已移除，始终返回 true）
     * @param votingPeriodId 投票期ID
     */
    function canTakeSnapshot(uint256 votingPeriodId) external view returns (bool) {
        return thresholds[votingPeriodId].isActive;
    }
}
