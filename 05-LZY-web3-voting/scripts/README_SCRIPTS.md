# 智能合约交互脚本

## 📝 脚本说明

### `test-mint-viem.js` - 推荐使用 ✨

使用 viem 库与 PolkaVM 本地链交互的完整测试脚本。

**功能：**

- 📊 查询合约状态（余额、总供应量等）
- 🧪 测试不同的铸造方法
- 🪙 执行铸造操作（需要私钥）
- 📜 查询历史事件

## 🚀 快速开始

### 1. 只读查询（不需要私钥）

```bash
node scripts/test-mint-viem.js
```

**输出示例：**

```
🚀 开始与 PolkaVM 本地链交互

=== 📊 查询合约状态 ===

合约状态: ✅ 运行中
vDOT 总供应量: 0 vDOT
合约 ETH 余额: 0 ETH
账户 ETH 余额: 997121515.752933984775 ETH
账户 vDOT 余额: 0 vDOT
```

### 2. 执行铸造操作（需要私钥）

```bash
# 设置私钥环境变量
export PRIVATE_KEY="0x你的私钥"

# 运行脚本
node scripts/test-mint-viem.js
```

## 📊 测试结果分析

### ✅ 成功的操作

1. **合约状态查询** - 完全正常
2. **余额查询** - 完全正常
3. **eth_call 测试** - 成功
4. **Gas 估算** - 返回结果（但值异常高）

### ⚠️ 发现的问题

#### 1. Gas 估算异常

```
估算的 gas: 1282130267301749  (约 1.3 万亿)
```

**正常值应该是：** 21000 - 100000

**原因：** PolkaVM 链的 gas 计算机制与标准 EVM 不同

**解决方案：** 手动设置 gas 限制

```javascript
{
  gas: 100000n,
  gasPrice: 1n,
}
```

#### 2. 事件查询失败

```
❌ 查询事件失败: Failed to filter logs
```

**原因：** PolkaVM 可能不完全支持 `eth_getLogs` API

**影响：** 无法通过标准方式查询历史事件

## 🔧 在你的代码中使用

### 导入和使用

```javascript
import {
  queryContractState,
  testMintMethods,
  mintWithPrivateKey,
  publicClient,
  vDOT_ABI,
} from "./scripts/test-mint-viem.js";

// 查询状态
const state = await queryContractState();
console.log("vDOT 余额:", state.vDOTBalance);

// 执行铸造（需要私钥）
if (process.env.PRIVATE_KEY) {
  await mintWithPrivateKey(process.env.PRIVATE_KEY, "0.1");
}
```

### 自定义配置

编辑 `test-mint-viem.js` 中的配置：

```javascript
const RPC_URL = "http://127.0.0.1:8545"; // 修改 RPC URL
const VDOT_ADDRESS = "0x..."; // 修改合约地址
const ACCOUNT_ADDRESS = "0x..."; // 修改账户地址
```

## 🐛 调试技巧

### 1. 检查链是否运行

```bash
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://127.0.0.1:8545
```

### 2. 快速检查余额

```bash
node -e "
import('viem').then(({ createPublicClient, http, formatEther }) => {
  const client = createPublicClient({ transport: http('http://127.0.0.1:8545') });
  client.getBalance({ address: '0xf24FF3a9CF04c71Dbc94D0b566f7A27B94566cac' })
    .then(b => console.log(formatEther(b) + ' ETH'));
});
"
```

### 3. 测试合约调用

```bash
node -e "
import('viem').then(({ createPublicClient, http }) => {
  const client = createPublicClient({ transport: http('http://127.0.0.1:8545') });
  client.readContract({
    address: '0x82745827D0B8972eC0583B3100eCb30b81Db0072',
    abi: [{ inputs: [], name: 'paused', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' }],
    functionName: 'paused',
  }).then(console.log);
});
"
```

## ⚠️ 重要提示

### 关于 PolkaVM 链

PolkaVM 是一个特殊的链，与标准 EVM 有以下不同：

1. **Gas 估算机制不同** - 返回异常高的值
2. **事件查询可能不支持** - `eth_getLogs` 可能失败
3. **交易执行可能有特殊限制** - 某些交易类型可能不被支持

### 安全提示

⚠️ **永远不要在代码中硬编码私钥！**

**推荐做法：**

```bash
# 使用环境变量
export PRIVATE_KEY="0x..."
node scripts/test-mint-viem.js
```

**或使用 .env 文件：**

```bash
# .env
PRIVATE_KEY=0x...
```

确保 `.env` 文件已添加到 `.gitignore`！

## 📚 相关文档

- [viem 文档](https://viem.sh/)
- [项目合约配置](../src/config/contracts.ts)
- [前端 Hook](../src/hooks/useMintingPage.ts)

## 💡 下一步

1. **如果测试成功** - 可以在前端使用相同的配置
2. **如果仍然失败** - 可能需要查看 PolkaVM 的官方文档
3. **考虑替代方案** - 使用标准 Hardhat 本地链进行开发和测试

## 🆘 需要帮助？

如果遇到问题：

1. 检查 PolkaVM 链是否正常运行
2. 确认合约地址是否正确
3. 查看链的日志输出
4. 尝试使用更小的金额（如 0.001 ETH）
