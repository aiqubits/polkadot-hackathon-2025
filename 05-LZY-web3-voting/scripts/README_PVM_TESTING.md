# PolkaVM 本地链交互脚本

这些脚本用于测试和调试与 PolkaVM 本地链上智能合约的交互。

## 📁 脚本列表

### 1. `test-pvm-interaction.js` - 完整交互脚本

功能齐全的交互脚本，包含：

- 📊 查询合约状态
- 🪙 铸造 vDOT 代币
- 💰 赎回 ETH
- 👂 监听事件
- 📜 查询历史事件

### 2. `test-mint-simple.js` - 简单铸造测试

专注于测试铸造功能的简化脚本，尝试多种方法。

## 🚀 使用方法

### 前置条件

1. 确保 PolkaVM 本地链正在运行：

```bash
# 检查链是否运行
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://127.0.0.1:8545
```

2. 安装依赖（如果还没有安装）：

```bash
pnpm install ethers
```

### 运行脚本

#### 1. 查询合约状态（只读操作）

```bash
# 运行完整交互脚本（只查询，不执行交易）
node scripts/test-pvm-interaction.js
```

输出示例：

```
🚀 开始与 PolkaVM 本地链交互

=== 📊 查询合约状态 ===

合约状态: ✅ 运行中
vDOT 总供应量: 0.0 vDOT
合约 ETH 余额: 0.0 ETH
账户 ETH 余额: 997.121515752934 ETH
账户 vDOT 余额: 0.0 vDOT
```

#### 2. 执行交易操作（需要私钥）

```bash
# 设置私钥环境变量
export PRIVATE_KEY="your_private_key_here"

# 运行脚本
node scripts/test-pvm-interaction.js
```

#### 3. 运行简单铸造测试

```bash
node scripts/test-mint-simple.js
```

## 📝 脚本详解

### test-pvm-interaction.js

#### 主要函数

##### `queryContractState()`

查询合约的当前状态，包括：

- 合约是否暂停
- vDOT 总供应量
- 合约 ETH 余额
- 账户 ETH 余额
- 账户 vDOT 余额

```javascript
const state = await queryContractState();
console.log(state);
```

##### `mintVDOT(amount)`

使用 `eth_sendTransaction` 铸造 vDOT（不需要私钥，但需要账户已解锁）

```javascript
await mintVDOT("0.1"); // 铸造 0.1 ETH 的 vDOT
```

##### `mintVDOTWithFunction(amount, privateKey)`

使用 `deposit()` 函数铸造 vDOT（需要私钥）

```javascript
await mintVDOTWithFunction("0.1", "0x...your_private_key");
```

##### `redeemETH(amount, privateKey)`

赎回 ETH（需要私钥）

```javascript
await redeemETH("0.1", "0x...your_private_key");
```

##### `listenToEvents()`

实时监听合约事件

```javascript
await listenToEvents();
// 保持脚本运行，监听新事件
```

##### `queryHistoricalEvents(fromBlock)`

查询历史事件

```javascript
await queryHistoricalEvents(0); // 从创世区块开始查询
```

### test-mint-simple.js

这个脚本尝试三种不同的方法来铸造 vDOT：

1. **方法 1**: 直接发送 ETH 到合约地址（触发 `receive()` 函数）
2. **方法 2**: 显式调用 `deposit()` 函数
3. **方法 3**: 使用 `eth_call` 测试合约调用

## 🔧 自定义使用

### 在你自己的脚本中使用

```javascript
const {
  queryContractState,
  mintVDOTWithFunction,
  redeemETH,
  vDOTContract,
  provider,
} = require("./scripts/test-pvm-interaction");

async function myCustomScript() {
  // 查询状态
  const state = await queryContractState();

  // 执行交易
  if (state.ethBalance > 0) {
    await mintVDOTWithFunction("0.1", process.env.PRIVATE_KEY);
  }
}

myCustomScript();
```

### 修改配置

编辑 `test-pvm-interaction.js` 中的 `CONFIG` 对象：

```javascript
const CONFIG = {
  rpcUrl: "http://127.0.0.1:8545", // 修改 RPC URL
  chainId: 31337, // 修改链 ID
  accountAddress: "0x...", // 修改账户地址
  contracts: {
    vDOT: "0x...", // 修改合约地址
    // ... 其他合约
  },
};
```

## 🐛 调试技巧

### 1. 检查链连接

```bash
node -e "
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
provider.getBlockNumber().then(console.log).catch(console.error);
"
```

### 2. 检查账户余额

```bash
node -e "
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
provider.getBalance('0xf24FF3a9CF04c71Dbc94D0b566f7A27B94566cac')
  .then(b => console.log(ethers.formatEther(b)))
  .catch(console.error);
"
```

### 3. 检查合约代码

```bash
node -e "
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
provider.getCode('0x82745827D0B8972eC0583B3100eCb30b81Db0072')
  .then(code => console.log('合约已部署:', code !== '0x'))
  .catch(console.error);
"
```

## ⚠️ 常见问题

### Q: "Internal JSON-RPC error"

**原因**: PolkaVM 链的 gas 估算机制与标准 EVM 不同。

**解决方案**:

- 手动设置 `gas` 和 `gasPrice` 参数
- 使用脚本中提供的配置（gas: 100000, gasPrice: 1）

### Q: "Inability to pay some fees"

**原因**: 链的 gas 费用计算有特殊限制。

**解决方案**:

- 确保账户有足够余额
- 尝试更低的 gas 价格
- 检查链的配置和文档

### Q: "Transaction call is not expected"

**原因**: PolkaVM 可能对某些交易类型有限制。

**解决方案**:

- 尝试使用 `deposit()` 函数而不是直接发送 ETH
- 查看 PolkaVM 的官方文档

## 📚 相关资源

- [Ethers.js 文档](https://docs.ethers.org/)
- [JSON-RPC API](https://ethereum.org/en/developers/docs/apis/json-rpc/)
- 项目合约地址配置: `src/config/contracts.ts`

## 💡 提示

1. **测试前先查询**: 始终先运行 `queryContractState()` 了解当前状态
2. **小金额测试**: 先用小金额（如 0.001 ETH）测试
3. **监听事件**: 使用 `listenToEvents()` 实时监控合约活动
4. **保存日志**: 将输出重定向到文件以便分析
   ```bash
   node scripts/test-pvm-interaction.js > test-output.log 2>&1
   ```

## 🔐 安全提示

⚠️ **永远不要在代码中硬编码私钥！**

使用环境变量：

```bash
export PRIVATE_KEY="0x..."
node scripts/test-pvm-interaction.js
```

或使用 `.env` 文件（确保添加到 `.gitignore`）。
