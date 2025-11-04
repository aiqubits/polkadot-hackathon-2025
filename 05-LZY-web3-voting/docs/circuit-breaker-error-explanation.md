# Circuit Breaker 错误说明

## 🔍 什么是 Circuit Breaker 错误？

当你在与 Moonbase Alpha 网络交互时，如果看到 "Network connection issue" 错误消息，这通常是因为触发了 Viem 的 **Circuit Breaker** 机制。

## 🤔 为什么会发生这个错误？

### 主要原因：

1. **RPC 节点暂时不可用**
   - Moonbase Alpha 的 RPC 节点可能因为维护、高负载或其他原因暂时无法响应请求
   - Circuit breaker 会检测到连续失败，并"打开电路"，暂时阻止进一步的请求

2. **请求频率限制（Rate Limiting）**
   - RPC 节点通常对请求频率有限制
   - 如果应用发送太多请求（例如频繁的余额查询、合约读取等），可能会触发限流

3. **钱包 Provider 的 RPC 问题**
   - 当使用 MetaMask 等钱包时，`useSendTransaction` 实际上是通过钱包的 provider 发送交易
   - 钱包可能使用不同的 RPC 端点，如果这个端点有问题，也会触发 circuit breaker

4. **网络连接问题**
   - 用户的网络连接不稳定
   - 防火墙或代理设置阻止了 RPC 请求

## 📊 技术细节

### Circuit Breaker 的工作原理：

```
正常状态 → 失败 → 失败 → 失败 → Circuit Open（阻止请求）
                                        ↓
                                 等待一段时间
                                        ↓
                             Circuit Half-Open（允许少量请求）
                                        ↓
                              成功 → Circuit Closed（恢复正常）
```

### 为什么我们的重试配置可能不起作用：

1. **钱包 Provider 绕过配置**：当使用 MetaMask 时，交易是通过钱包的 provider 发送的，而不是直接通过我们配置的 wagmi transport
2. **Gas 估算请求**：钱包在发送交易前需要估算 gas，这些请求也可能触发 circuit breaker
3. **并发请求**：多个 hooks 同时查询数据（balance refetch、contract reads 等）可能导致请求过多

## ✅ 解决方案

### 1. 等待并重试

- Circuit breaker 会在一定时间后自动关闭（通常是几秒到几分钟）
- 等待 10-30 秒后再次尝试

### 2. 刷新页面

- 刷新页面可以重置 circuit breaker 状态
- 重新初始化连接

### 3. 切换网络

- 在 MetaMask 中切换到其他网络，然后再切换回 Moonbase Alpha
- 这可以重置钱包的 RPC 连接

### 4. 重新连接钱包

- 断开钱包连接
- 重新连接钱包
- 这可以重置钱包 provider 的状态

### 5. 使用备用 RPC 端点

可以在 `.env.local` 文件中配置备用 RPC URL：

```env
NEXT_PUBLIC_MOONBASE_ALPHA_RPC_URL=https://moonbase-alpha.public.blastapi.io
```

或者使用其他公共 RPC 端点：

- `https://moonbase-alpha.public.blastapi.io`
- `https://rpc.api.moonbase.moonbeam.network` (默认)

### 6. 检查网络连接

- 确保网络连接稳定
- 检查防火墙或代理设置

## 🔧 我们已经实施的改进

1. **Transport 配置优化** (`src/config/wagmi.ts`)
   - 添加了重试机制（retryCount: 3）
   - 设置了超时时间（timeout: 30000ms）
   - 配置了重试延迟（retryDelay: 1000ms）
   - 禁用了缓存以避免问题

2. **错误处理改进** (`src/app/mint/page.tsx`)
   - 更友好的错误消息
   - 提供具体的解决方案建议
   - 详细的错误诊断信息

3. **调试日志** (`src/hooks/useMintingPage.ts`)
   - 添加了详细的错误日志
   - 帮助诊断问题原因

## 📝 开发建议

### 减少 RPC 请求频率：

1. **增加 refetch 间隔**

   ```typescript
   useBalance({
     query: {
       refetchInterval: 10000, // 从 5 秒增加到 10 秒
     },
   });
   ```

2. **使用缓存**

   ```typescript
   useReadContract({
     query: {
       staleTime: 60000, // 缓存 60 秒
     },
   });
   ```

3. **减少不必要的查询**
   - 只在需要时查询数据
   - 避免在多个组件中重复查询相同的数据

## 🚨 何时需要关注

如果 circuit breaker 错误频繁出现，可能需要：

1. 检查 RPC 节点的状态
2. 考虑使用付费的 RPC 服务（如 Alchemy、Infura）
3. 实现自己的 RPC 节点
4. 优化应用的请求频率

## 📚 参考链接

- [Viem Circuit Breaker Documentation](https://viem.sh/docs/clients/http#circuit-breaker)
- [Moonbeam Network RPC Endpoints](https://docs.moonbeam.network/builders/get-started/endpoints/)
- [Wagmi Documentation](https://wagmi.sh/)
