# PolkaVM 本地链兼容性问题总结

## 🔍 发现的问题

### 1. Chain ID 不匹配 ✅ 已修复

- **问题**: 代码使用 Chain ID `31337` (Hardhat 默认)
- **实际**: PolkaVM 链使用 Chain ID `420420420`
- **状态**: 已在脚本中修复

### 2. Gas 估算异常 ⚠️ 未解决

- **现象**: Gas 估算返回约 **1.3 万亿** (1,282,129,211,301,749)
- **正常值**: 应该是 21,000 - 100,000
- **影响**: 导致交易失败，报告"余额不足"
- **原因**: PolkaVM 的 gas 计算机制与标准 EVM 不同

### 3. 交易执行失败 ❌ 未解决

**错误信息:**

```
Details: Invalid Transaction
```

**已尝试的方法:**

1. ✅ 使用正确的 Chain ID (420420420)
2. ✅ 使用链建议的 gas price (1000 wei)
3. ✅ 手动设置 gas limit (100,000)
4. ✅ 正确的 nonce (自动获取)
5. ❌ 直接发送 ETH - 失败
6. ❌ 调用 deposit() 函数 - 失败

### 4. 事件查询不支持 ❌ 无法使用

**错误信息:**

```
Failed to filter logs
```

**影响**: 无法使用 `eth_getLogs` 查询历史事件

## 📊 测试数据

### 链配置

```
RPC URL: http://127.0.0.1:8545
Chain ID: 420420420
Gas Price: 1000 wei (0x3e8)
```

### 账户信息

```
地址: 0xf24FF3a9CF04c71Dbc94D0b566f7A27B94566cac
余额: 997,111,100 ETH
Nonce: 37 (0x25)
```

### 合约地址

```
vDOT: 0x82745827D0B8972eC0583B3100eCb30b81Db0072
StakingContract: 0xe78A45427B4797ae9b1852427476A956037B5bC2
VotingTicket: 0x38762083399e60af42e6fD694e7d430a170c9Caf
VotingContract: 0x7acc1aC65892CF3547b1b0590066FB93199b430D
VotingNFTReward: 0xab7785d56697E65c2683c8121Aac93D3A028Ba95
BTCOracle: 0x85b108660f47caDfAB9e0503104C08C1c96e0DA9
```

## 🔬 技术分析

### 问题根源

PolkaVM 链虽然提供 JSON-RPC 接口，但**不完全兼容标准 EVM**：

1. **Gas 计算异常**: 可能使用不同的计费模型
2. **交易验证严格**: 可能对交易格式有特殊要求
3. **API 支持有限**: 部分 JSON-RPC 方法不可用

### 签名的交易数据

```
方法 1 (直接发送):
Nonce: 37 (0x25)
Gas Price: 1000 wei (0x3e8)
Gas Limit: 100000 (0x186a0)
To: 0x82745827D0B8972eC0583B3100eCb30b81Db0072
Value: 0.001 ETH (0x38d7ea4c68000)
Data: 0x
Chain ID: 420420420
```

交易签名正确，但链拒绝接受。

## 💡 可能的解决方案

### 方案 1: 查看 PolkaVM 官方文档 (推荐)

- 寻找 PolkaVM 的官方文档或 GitHub 仓库
- 查找是否有特殊的交易参数要求
- 确认支持的 JSON-RPC 方法列表
- 查看是否有示例代码

### 方案 2: 使用 PolkaVM 提供的工具

- PolkaVM 可能有自己的 CLI 工具或 SDK
- 使用官方工具进行交易

### 方案 3: 切换到标准 Hardhat 本地链 (临时解决)

```bash
# 1. 创建 hardhat.config.js
cat > hardhat.config.js << 'EOF'
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      chainId: 31337
    }
  }
};
EOF

# 2. 启动 Hardhat 节点
npx hardhat node

# 3. 部署合约到 Hardhat
npx hardhat run scripts/deploy.js --network localhost
```

### 方案 4: 联系 PolkaVM 开发者

- 在 PolkaVM 的 GitHub 仓库提 issue
- 询问是否有已知的兼容性问题
- 请求提供示例代码

## 📝 更新项目配置

如果继续使用 PolkaVM，需要更新以下文件：

### 1. `src/config/chains.ts`

添加 PolkaVM 链配置：

```typescript
export const polkavm = defineChain({
  id: 420420420,
  name: "PolkaVM Local",
  network: "polkavm",
  nativeCurrency: {
    decimals: 18,
    name: "PVM",
    symbol: "PVM",
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
    },
    public: {
      http: ["http://127.0.0.1:8545"],
    },
  },
  testnet: true,
});
```

### 2. `src/hooks/useMintingPage.ts`

更新 gas 配置（如果找到正确的参数）：

```typescript
sendTransaction({
  to: vDOTAddress,
  value: parseEther(amount),
  gas: 100000n,
  gasPrice: 1000n, // 使用 PolkaVM 建议的值
});
```

## ⚠️ 当前建议

**在解决 PolkaVM 兼容性问题之前，建议：**

1. **暂时使用标准 Hardhat 本地链进行开发和测试**
2. **查找 PolkaVM 官方文档和示例**
3. **联系 PolkaVM 开发团队寻求支持**

## 📚 参考资源

- [viem 文档](https://viem.sh/)
- [Ethereum JSON-RPC Spec](https://ethereum.org/en/developers/docs/apis/json-rpc/)
- [Hardhat Network](https://hardhat.org/hardhat-network/)

## 🆘 需要的信息

为了解决这个问题，我们需要：

1. PolkaVM 的官方文档链接
2. PolkaVM 支持的 JSON-RPC 方法列表
3. PolkaVM 的交易格式要求
4. PolkaVM 的示例代码或教程
5. PolkaVM 开发者社区或支持渠道

---

**最后更新**: 2025-01-XX  
**状态**: 未解决 - 等待 PolkaVM 官方文档或支持
