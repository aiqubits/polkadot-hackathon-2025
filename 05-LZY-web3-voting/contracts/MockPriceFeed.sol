// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title MockPriceFeed
 * @dev 模拟 Chainlink 价格源，用于测试环境
 */
contract MockPriceFeed is AggregatorV3Interface {
    uint8 public constant decimals = 8;
    string public constant description = "BTC/USD Mock Price Feed";
    uint256 public constant version = 1;

    int256 private _price;
    uint256 private _timestamp;
    uint80 private _roundId;

    // 事件
    event PriceUpdated(int256 newPrice, uint256 timestamp);

    constructor(int256 initialPrice) {
        _price = initialPrice;
        _timestamp = block.timestamp;
        _roundId = 1;
    }

    /**
     * @dev 更新价格（仅管理员可调用）
     */
    function updatePrice(int256 newPrice) external {
        _price = newPrice;
        _timestamp = block.timestamp;
        _roundId += 1;
        emit PriceUpdated(newPrice, _timestamp);
    }

    /**
     * @dev 获取最新价格数据
     */
    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            _roundId,
            _price,
            _timestamp,
            _timestamp,
            _roundId
        );
    }

    /**
     * @dev 获取指定轮次的价格数据
     */
    function getRoundData(uint80 roundId)
        external
        view
        override
        returns (
            uint80,
            int256,
            uint256,
            uint256,
            uint80
        )
    {
        // 简化实现：所有轮次返回相同数据
        return (
            roundId,
            _price,
            _timestamp,
            _timestamp,
            roundId
        );
    }

    /**
     * @dev 获取当前价格
     */
    function getCurrentPrice() external view returns (int256) {
        return _price;
    }
}
