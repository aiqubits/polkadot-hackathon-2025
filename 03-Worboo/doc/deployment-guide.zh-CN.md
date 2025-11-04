# Worboo 部署指南（Moonbase Alpha 中文版）

本文档面向黑客松评委、维护者及演示人员，介绍如何在 **Moonbase Alpha** 上完整部署 Worboo 合约、前端、以及自动奖励 Relayer，并提供可选的 Docker/PM2 运维方案。请严格按照顺序执行，确保演示顺利。

---

## 1. 环境准备

| 项目 | 说明 |
| --- | --- |
| Node.js | 建议 18.x LTS，Windows 用户可使用 [nvm-windows](https://github.com/coreybutler/nvm-windows)。 |
| npm | 8.x 以上；仓库兼容 uv 安装的 Node 环境。 |
| Git | 克隆仓库使用。 |
| 钱包 | MetaMask 或其他 Moonbeam 兼容钱包，需有 DEV 代币。 |
| RPC | `https://rpc.api.moonbase.moonbeam.network` |
| Gas | 使用 DEV 代币，前往 [Moonbeam faucet](https://faucet.moonbeam.network/)。 |
| 私钥管理 | 将私钥存入 `.env` 或 JSON 配置文件，确保未提交到 Git。 |

> 强烈建议在 PowerShell 下设置 `HUSKY=0` 或使用 `npm install --ignore-scripts` 免除 Husky 钩子。

---

## 2. 克隆与依赖安装

```powershell
git clone https://github.com/<your-fork>/worboo.git
cd worboo/03-Worboo

npm install --ignore-scripts         # 根目录安装共享工具（ESLint/Prettier 等）
npm install --prefix packages/contracts
npm install --prefix packages/relayer
npm install --ignore-scripts --prefix react-wordle   # CRA 旧版钩子需禁用
```

---

## 3. 合约配置与部署

1. 拷贝环境配置：
   ```powershell
   cp packages/contracts/.env.example packages/contracts/.env
   ```
2. 编辑 `.env`：
   ```ini
   PRIVATE_KEY=0x部署钱包私钥
   MOONBASE_RPC=https://rpc.api.moonbase.moonbeam.network
   MOONBEAM_RPC=（可选，正式网备用）
   ```
3. 编译与测试：
   ```powershell
   cd packages/contracts
   npm run compile
   npm run test
   ```
4. Moonbase 部署：
   ```powershell
   npm run deploy:moonbase
   npm run export:addresses   # 输出前端可直接粘贴的地址
   ```

---

## 4. 前端环境

1. 将上述导出的地址写入 `react-wordle/.env`（或 `.env.local`）：
   ```ini
   REACT_APP_WORBOO_REGISTRY=0x...
   REACT_APP_WORBOO_TOKEN=0x...
   REACT_APP_WORBOO_SHOP=0x...
   REACT_APP_RELAYER_HEALTH_URL=http://localhost:8787/healthz   # 本地 relayer 健康检查，可留空
   ```
2. 启动前端：
   ```powershell
   cd react-wordle
   npm start
   ```

---

## 5. Relayer 配置与启动

1. 建议使用 JSON 配置（更易管理）：
   ```powershell
   cp packages/relayer/config/relayer.config.json.example packages/relayer/config/relayer.config.json
   ```
   示例字段说明：
   ```json
   {
     "rpcUrl": "https://rpc.api.moonbase.moonbeam.network",
     "privateKey": "0xRELAYER私钥",
     "registryAddress": "0x合约地址",
     "tokenAddress": "0x合约地址",
     "rewardPerWin": "10",                   // 单次奖励 10 WBOO
     "cachePath": ".cache/processed-events.jsonl",
     "cacheMaxEntries": 1000,                // 去重缓存上限（超出自动裁剪最旧记录）
     "healthPath": ".cache/health.json",
     "healthHost": "0.0.0.0",
     "healthPort": 8787,
     "logFilePath": ".logs/worboo-relayer.log",
     "logHttpEndpoint": "https://logs.example/ship"   // 可选，发送 JSON 日志到外部聚合服务
   }
   ```
   > 若使用 `.env`，同名变量优先生效，可通过 `RELAYER_CACHE_MAX_ENTRIES`、`RELAYER_LOG_HTTP_ENDPOINT` 等覆盖。

2. Relay 钱包需要 `GAME_MASTER_ROLE`，执行：
   ```powershell
   cd packages/contracts
   npx hardhat run --network moonbase scripts/grantGameMaster.ts <tokenAddress> <relayerAddress>
   ```

3. 启动服务：
   ```powershell
   cd packages/relayer
   npm run start
   ```
   健康检查：
   ```powershell
   npm run status             # CLI 输出
   curl http://localhost:8787/healthz
   ```
   前端默认读取 `/healthz`，会展示“等待中奖奖励/已铸造”提示。

---

## 6. Docker / PM2 运维（可选）

```powershell
# 构建镜像
docker build -f packages/relayer/Dockerfile -t worboo-relayer .

# 运行容器（示例挂载配置目录）
docker run --rm -p 8787:8787 ^
  -v ${PWD}/packages/relayer/config:/app/packages/relayer/config ^
  -v ${PWD}/packages/relayer/.cache:/app/packages/relayer/.cache ^
  -e RELAYER_CONFIG_PATH=/app/packages/relayer/config/relayer.config.json ^
  worboo-relayer
```

或使用 PM2：
```powershell
npm install --global pm2
pm2 start packages/relayer/ecosystem.config.cjs
pm2 status
```

---

## 7. Demo 前自检

1. `npm run lint`（根目录）
2. `npm run test`（packages/contracts）
3. `npm test`（packages/relayer）
4. `npm run status` 确认 `queueDepth: 0`
5. 浏览器连接前端，完成注册、答题、奖励发放与商店购买流程
6. 若计划录制演示，请参考 `doc/demo-playbook.md` 的录像清单

---

## 8. 附加资源

- `README.md`：工程总览、关键命令。
- `doc/README - polkadot.md`：面向评委的项目说明。
- `doc/observability.md`：健康检查、日志收集、Grafana 配置。
- `doc/demo-playbook.md`：演示脚本与录制提示。
- `packages/indexer/README.md`：后续 Subsquid/SubQuery 索引器占位说明。

部署完成后，即可进入黑客松全流程演示：钱包连接 → 注册 → 答题 → 自动发放 WBOO → 商店消费 → 健康监控展示。祝演示顺利！
