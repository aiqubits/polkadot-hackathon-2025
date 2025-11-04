// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title DuelPlatform
 * @dev 去中心化對賭平台智能合約 - MVP 版本
 * @notice 版本: v0.1.0-mvp
 */
contract DuelPlatform is Ownable, ReentrancyGuard, Pausable {
    // ============ 版本信息 ============
    string public constant VERSION = "v0.1.0-mvp";
    
    // ============ 枚舉定義 ============
    
    enum MatchMode {
        REFEREE,    // 裁判模式
        API         // API 自動模式
    }
    
    enum MatchStatus {
        WAITING,        // 等待對手
        IN_PROGRESS,    // 進行中
        COMPLETED,      // 已完成
        CANCELLED       // 已取消
    }
    
    // ============ 數據結構 ============
    
    struct Match {
        uint256 matchId;
        MatchMode mode;
        address referee;
        address[2] participants;
        uint256 stakeAmount;
        MatchStatus status;
        address winner;
        uint256 createdAt;
        uint256 startTime;
        uint256 endTime;
        string description;
        string externalMatchId;
        bool isSettled;
    }
    
    struct UserStats {
        uint256 totalMatches;
        uint256 wonMatches;
        uint256 totalStaked;
        uint256 totalWon;
    }
    
    // ============ 狀態變量 ============
    
    uint256 public matchCounter;
    mapping(uint256 => Match) public matches;
    mapping(string => uint256) public externalMatchIds;
    mapping(address => UserStats) public userStats;
    mapping(address => uint256[]) public userMatches;
    
    address public oracleAddress;
    mapping(address => bool) public authorizedOracles;
    
    address public platformWallet;
    
    // 手續費率 (使用基點: 1 = 0.01%)
    uint256 public constant REFEREE_FEE_RATE = 300;  // 3%
    uint256 public constant PLATFORM_FEE_RATE = 50;  // 0.5%
    uint256 public constant FEE_DENOMINATOR = 10000;
    
    // 時間限制
    uint256 public constant MIN_MATCH_DURATION = 1 hours;
    uint256 public constant MAX_MATCH_DURATION = 30 days;
    
    // ============ 事件定義 ============
    
    event MatchCreated(
        uint256 indexed matchId,
        MatchMode mode,
        address indexed creator,
        uint256 stakeAmount,
        string description
    );
    
    event ParticipantJoined(
        uint256 indexed matchId,
        address indexed participant,
        uint8 position
    );
    
    event MatchStarted(
        uint256 indexed matchId,
        address indexed participant1,
        address indexed participant2,
        uint256 startTime
    );
    
    event MatchSettled(
        uint256 indexed matchId,
        address indexed winner,
        uint256 winnerAmount,
        uint256 refereeFee,
        uint256 platformFee
    );
    
    event MatchCancelled(
        uint256 indexed matchId,
        string reason
    );
    
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event PlatformWalletUpdated(address indexed oldWallet, address indexed newWallet);
    
    // ============ 修飾符 ============
    
    modifier onlyOracle() {
        require(
            authorizedOracles[msg.sender] || msg.sender == oracleAddress,
            "Not authorized oracle"
        );
        _;
    }
    
    modifier matchExists(uint256 _matchId) {
        require(_matchId < matchCounter, "Match does not exist");
        _;
    }
    
    // ============ 構造函數 ============
    
    constructor(address _platformWallet, address _oracleAddress) Ownable(msg.sender) {
        require(_platformWallet != address(0), "Invalid platform wallet");
        require(_oracleAddress != address(0), "Invalid oracle address");
        
        platformWallet = _platformWallet;
        oracleAddress = _oracleAddress;
        authorizedOracles[_oracleAddress] = true;
        
        emit PlatformWalletUpdated(address(0), _platformWallet);
        emit OracleUpdated(address(0), _oracleAddress);
    }
    
    // ============ 核心功能 ============
    
    /**
     * @dev 創建新比賽
     */
    function createMatch(
        MatchMode _mode,
        uint256 _stakeAmount,
        uint256 _startTime,
        uint256 _endTime,
        string memory _description,
        string memory _externalMatchId
    ) external payable whenNotPaused nonReentrant returns (uint256) {
        require(_stakeAmount > 0, "Stake amount must be greater than zero");
        require(_startTime > block.timestamp, "Start time must be in the future");
        require(_endTime > _startTime, "End time must be after start time");
        require(_endTime - _startTime >= MIN_MATCH_DURATION, "Match duration too short");
        require(_endTime - _startTime <= MAX_MATCH_DURATION, "Match duration too long");
        
        // 模式2必須提供外部比賽ID
        if (_mode == MatchMode.API) {
            require(bytes(_externalMatchId).length > 0, "External match ID required for API mode");
            require(externalMatchIds[_externalMatchId] == 0, "External match ID already used");
        }
        
        // 如果創建者同時加入，需要支付押注金額
        if (msg.value > 0) {
            require(msg.value == _stakeAmount, "Incorrect stake amount");
        }
        
        uint256 matchId = matchCounter++;
        
        Match storage newMatch = matches[matchId];
        newMatch.matchId = matchId;
        newMatch.mode = _mode;
        newMatch.referee = (_mode == MatchMode.REFEREE) ? msg.sender : address(0);
        newMatch.stakeAmount = _stakeAmount;
        newMatch.status = MatchStatus.WAITING;
        newMatch.createdAt = block.timestamp;
        newMatch.startTime = _startTime;
        newMatch.endTime = _endTime;
        newMatch.description = _description;
        newMatch.externalMatchId = _externalMatchId;
        
        // 如果創建者同時加入
        if (msg.value > 0) {
            newMatch.participants[0] = msg.sender;
            userMatches[msg.sender].push(matchId);
            emit ParticipantJoined(matchId, msg.sender, 0);
        }
        
        if (bytes(_externalMatchId).length > 0) {
            externalMatchIds[_externalMatchId] = matchId;
        }
        
        emit MatchCreated(matchId, _mode, msg.sender, _stakeAmount, _description);
        
        return matchId;
    }
    
    /**
     * @dev 加入比賽
     */
    function joinMatch(uint256 _matchId) 
        external 
        payable 
        whenNotPaused 
        nonReentrant 
        matchExists(_matchId) 
    {
        Match storage matchData = matches[_matchId];
        
        require(matchData.status == MatchStatus.WAITING || matchData.status == MatchStatus.IN_PROGRESS, "Match is not accepting participants");
        require(msg.value == matchData.stakeAmount, "Incorrect stake amount");
        require(block.timestamp < matchData.startTime, "Match has already started");
        require(
            matchData.participants[0] != msg.sender && matchData.participants[1] != msg.sender,
            "Already joined"
        );
        
        // 找到空位
        uint8 position;
        if (matchData.participants[0] == address(0)) {
            matchData.participants[0] = msg.sender;
            position = 0;
        } else if (matchData.participants[1] == address(0)) {
            matchData.participants[1] = msg.sender;
            position = 1;
        } else {
            revert("Match is full");
        }
        
        userMatches[msg.sender].push(_matchId);
        emit ParticipantJoined(_matchId, msg.sender, position);
        
        // 如果兩個參與者都已加入，比賽開始
        if (matchData.participants[0] != address(0) && matchData.participants[1] != address(0)) {
            matchData.status = MatchStatus.IN_PROGRESS;
            emit MatchStarted(
                _matchId,
                matchData.participants[0],
                matchData.participants[1],
                matchData.startTime
            );
        }
    }
    
    /**
     * @dev 裁判提交結果（模式1）
     */
    function submitResultByReferee(uint256 _matchId, address _winner)
        external
        whenNotPaused
        nonReentrant
        matchExists(_matchId)
    {
        Match storage matchData = matches[_matchId];
        
        require(matchData.mode == MatchMode.REFEREE, "Not referee mode");
        require(msg.sender == matchData.referee, "Only referee can submit result");
        require(matchData.status == MatchStatus.IN_PROGRESS, "Match is not in progress");
        require(block.timestamp >= matchData.endTime, "Match has not ended yet");
        require(
            _winner == matchData.participants[0] || _winner == matchData.participants[1],
            "Winner must be a participant"
        );
        
        matchData.winner = _winner;
        _settleMatch(_matchId);
    }
    
    /**
     * @dev Oracle 提交結果（模式2）
     */
    function submitResultByOracle(uint256 _matchId, address _winner)
        external
        whenNotPaused
        nonReentrant
        onlyOracle
        matchExists(_matchId)
    {
        Match storage matchData = matches[_matchId];
        
        require(matchData.mode == MatchMode.API, "Not API mode");
        require(matchData.status == MatchStatus.IN_PROGRESS, "Match is not in progress");
        require(block.timestamp >= matchData.endTime, "Match has not ended yet");
        require(
            _winner == matchData.participants[0] || _winner == matchData.participants[1],
            "Winner must be a participant"
        );
        
        matchData.winner = _winner;
        _settleMatch(_matchId);
    }
    
    /**
     * @dev 內部結算函數
     */
    function _settleMatch(uint256 _matchId) internal {
        Match storage matchData = matches[_matchId];
        
        uint256 totalPool = matchData.stakeAmount * 2;
        uint256 refereeFee = 0;
        uint256 platformFee = 0;
        uint256 winnerAmount = 0;
        
        if (matchData.mode == MatchMode.REFEREE) {
            // 模式1：裁判3% + 平台0.5%
            refereeFee = (totalPool * REFEREE_FEE_RATE) / FEE_DENOMINATOR;
            platformFee = (totalPool * PLATFORM_FEE_RATE) / FEE_DENOMINATOR;
            winnerAmount = totalPool - refereeFee - platformFee;
            
            // 轉賬給裁判
            (bool refereeSuccess, ) = payable(matchData.referee).call{value: refereeFee}("");
            require(refereeSuccess, "Referee transfer failed");
        } else {
            // 模式2：平台0.5%
            platformFee = (totalPool * PLATFORM_FEE_RATE) / FEE_DENOMINATOR;
            winnerAmount = totalPool - platformFee;
        }
        
        // 轉賬給平台
        (bool platformSuccess, ) = payable(platformWallet).call{value: platformFee}("");
        require(platformSuccess, "Platform transfer failed");
        
        // 轉賬給贏家
        (bool winnerSuccess, ) = payable(matchData.winner).call{value: winnerAmount}("");
        require(winnerSuccess, "Winner transfer failed");
        
        // 更新狀態
        matchData.status = MatchStatus.COMPLETED;
        matchData.isSettled = true;
        
        // 更新用戶統計
        _updateUserStats(matchData);
        
        emit MatchSettled(_matchId, matchData.winner, winnerAmount, refereeFee, platformFee);
    }
    
    /**
     * @dev 取消比賽
     */
    function cancelMatch(uint256 _matchId)
        external
        whenNotPaused
        nonReentrant
        matchExists(_matchId)
    {
        Match storage matchData = matches[_matchId];
        
        require(matchData.status == MatchStatus.WAITING, "Can only cancel waiting matches");
        require(
            block.timestamp >= matchData.startTime ||
            msg.sender == matchData.referee ||
            (matchData.participants[0] == msg.sender && matchData.participants[1] == address(0)),
            "Not authorized to cancel"
        );
        
        // 退還已加入者的押注
        for (uint8 i = 0; i < 2; i++) {
            if (matchData.participants[i] != address(0)) {
                (bool success, ) = payable(matchData.participants[i]).call{
                    value: matchData.stakeAmount
                }("");
                require(success, "Refund failed");
            }
        }
        
        matchData.status = MatchStatus.CANCELLED;
        emit MatchCancelled(_matchId, "Match cancelled");
    }
    
    /**
     * @dev 更新用戶統計
     */
    function _updateUserStats(Match storage matchData) internal {
        address winner = matchData.winner;
        address loser = matchData.participants[0] == winner 
            ? matchData.participants[1] 
            : matchData.participants[0];
        
        // 更新贏家統計
        UserStats storage winnerStats = userStats[winner];
        winnerStats.totalMatches++;
        winnerStats.wonMatches++;
        winnerStats.totalStaked += matchData.stakeAmount;
        
        uint256 totalPool = matchData.stakeAmount * 2;
        uint256 winnerAmount;
        if (matchData.mode == MatchMode.REFEREE) {
            winnerAmount = totalPool - (totalPool * (REFEREE_FEE_RATE + PLATFORM_FEE_RATE)) / FEE_DENOMINATOR;
        } else {
            winnerAmount = totalPool - (totalPool * PLATFORM_FEE_RATE) / FEE_DENOMINATOR;
        }
        winnerStats.totalWon += winnerAmount;
        
        // 更新輸家統計
        UserStats storage loserStats = userStats[loser];
        loserStats.totalMatches++;
        loserStats.totalStaked += matchData.stakeAmount;
    }
    
    // ============ 查詢函數 ============
    
    function getMatch(uint256 _matchId) external view matchExists(_matchId) returns (Match memory) {
        return matches[_matchId];
    }
    
    function getUserStats(address _user) external view returns (UserStats memory) {
        return userStats[_user];
    }
    
    function getUserMatches(address _user) external view returns (uint256[] memory) {
        return userMatches[_user];
    }
    
    function getMatchByExternalId(string memory _externalMatchId) external view returns (Match memory) {
        uint256 matchId = externalMatchIds[_externalMatchId];
        require(matchId < matchCounter, "Match not found");
        return matches[matchId];
    }
    
    // ============ 管理函數 ============
    
    function setOracle(address _oracleAddress) external onlyOwner {
        require(_oracleAddress != address(0), "Invalid oracle address");
        emit OracleUpdated(oracleAddress, _oracleAddress);
        oracleAddress = _oracleAddress;
        authorizedOracles[_oracleAddress] = true;
    }
    
    function setOracleAuthorization(address _oracle, bool _authorized) external onlyOwner {
        authorizedOracles[_oracle] = _authorized;
    }
    
    function setPlatformWallet(address _platformWallet) external onlyOwner {
        require(_platformWallet != address(0), "Invalid platform wallet");
        emit PlatformWalletUpdated(platformWallet, _platformWallet);
        platformWallet = _platformWallet;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ============ 接收函數 ============
    
    receive() external payable {
        revert("Direct transfers not allowed");
    }
}

