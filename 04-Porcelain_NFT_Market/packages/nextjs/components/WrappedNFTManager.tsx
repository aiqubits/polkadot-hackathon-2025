"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import { useScaffoldContract, useScaffoldWriteContract, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { keccak256, encodePacked, encodeAbiParameters } from "viem";

interface WrappedNFT {
  tokenId: string;
  originalContract: string;
  originalTokenId: string;
  sourceChainId: number;
  tokenURI: string;
  metadata?: {
    name?: string;
    description?: string;
    image?: string;
  };
}

export const WrappedNFTManager = () => {
  const { address: connectedAddress } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  
  const [wrappedNFTs, setWrappedNFTs] = useState<WrappedNFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState("");
  
  // XCM消息处理相关状态
  const [showXCMProcessor, setShowXCMProcessor] = useState(false);
  const [xcmFormData, setXcmFormData] = useState({
    sourceChainId: "1287",
    sourceContract: "",
    tokenId: "",
    recipient: "",
    tokenURI: ""
  });

  const { writeContractAsync: writeWrappedNFTAsync } = useScaffoldWriteContract("WrappedNFT");
  const { writeContractAsync: writeXCMBridgeAsync } = useScaffoldWriteContract("XCMBridge");

  // 获取当前网络的合约地址
  const getContractAddresses = () => {
    if (chainId === 1287) {
      return {
        WrappedNFT: "0x88A4dcB01B775c2509E32e03452Ced4022be4eeC",
        XCMBridge: "0x1519c05ABD62bdcc2adf7c9028Dc0260755B021a",
      };
    } else if (chainId === 420420422) {
      return {
        WrappedNFT: "0xfB5919787800552eBc98980fB84531c89dDaaA14",
        XCMBridge: "0x73C506D96F474653f7bEbDDDf2b92AC95983e1E0",
      };
    }
    return null;
  };

  // 获取用户拥有的包装NFT
  const fetchWrappedNFTs = async () => {
    if (!connectedAddress || !publicClient) return;
    
    const contracts = getContractAddresses();
    if (!contracts) return;

    setIsLoading(true);
    try {
      // 获取当前区块号
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock - 10000n; // 查询最近10000个区块

      // 使用事件签名哈希来查询事件，避免复杂的参数格式问题
      const wrappedNFTMintedTopic = "0x5e1ea4e103578bf6208ce2251130c7dfd4bab3fc07c3afebcc330e2907e8cdce"; // WrappedNFTMinted事件签名
      const wrappedNFTBurnedTopic = "0x8b8c8b1b8b8c8b1b8b8c8b1b8b8c8b1b8b8c8b1b8b8c8b1b8b8c8b1b8b8c8b1b"; // WrappedNFTBurned事件签名

      // 获取所有WrappedNFTMinted事件
      const allMintLogs = await publicClient.getLogs({
        address: contracts.WrappedNFT as `0x${string}`,
        topics: [wrappedNFTMintedTopic],
        fromBlock: fromBlock,
        toBlock: currentBlock
      });

      // 解析并过滤mint事件
      const mintEvents = allMintLogs
        .map(log => {
          try {
            // 检查topics是否存在且有效
            if (!log.topics || log.topics.length < 3) {
              console.warn("Invalid log topics:", log.topics);
              return null;
            }

            // 手动解析事件数据，添加安全检查
            const topic1 = log.topics[1];
            const topic2 = log.topics[2];
            
            if (!topic1 || topic1 === "0x" || !topic2 || topic2 === "0x") {
              console.warn("Empty topics found:", { topic1, topic2 });
              return null;
            }

            const wrappedTokenId = BigInt(topic1);
            const recipient = `0x${topic2.slice(-40)}`;
            
            // 解析data字段中的非indexed参数
            const data = log.data?.slice(2) || ""; // 移除0x前缀
            if (data.length < 192) {
              console.warn("Insufficient data length:", data.length);
              return null;
            }

            const originalContract = `0x${data.slice(24, 64)}`;
            const originalTokenIdHex = `0x${data.slice(64, 128)}`;
            const sourceChainIdHex = `0x${data.slice(128, 192)}`;

            // 安全地转换为BigInt和number
            const originalTokenId = originalTokenIdHex && originalTokenIdHex !== "0x" ? 
              BigInt(originalTokenIdHex) : BigInt(0);
            const sourceChainId = sourceChainIdHex && sourceChainIdHex !== "0x" ? 
              parseInt(sourceChainIdHex, 16) : 0;
            
            return {
              args: {
                wrappedTokenId,
                recipient,
                originalContract,
                originalTokenId,
                sourceChainId
              }
            };
          } catch (error) {
            console.error("Error parsing mint event:", error, "Log:", log);
            return null;
          }
        })
        .filter(event => event !== null && 
          event.args.recipient.toLowerCase() === connectedAddress.toLowerCase());

      // 获取所有WrappedNFTBurned事件（如果需要的话）
      const burnEvents: any[] = []; // 暂时简化，不查询burn事件

      // 计算当前拥有的NFT（铸造的减去销毁的）
      const burnedTokenIds = new Set(burnEvents.map(event => event.args.wrappedTokenId?.toString()));
      const activeNFTs = mintEvents.filter(event => 
        !burnedTokenIds.has(event.args.wrappedTokenId?.toString())
      );

      const nftList: WrappedNFT[] = [];
      
      // 获取每个NFT的详细信息
      for (const mintEvent of activeNFTs) {
        try {
          const tokenId = mintEvent.args.wrappedTokenId;
          if (!tokenId) continue;

          // 验证当前拥有者
          const currentOwner = await publicClient.readContract({
            address: contracts.WrappedNFT as `0x${string}`,
            abi: [
              {
                inputs: [{ name: "tokenId", type: "uint256" }],
                name: "ownerOf",
                outputs: [{ name: "", type: "address" }],
                stateMutability: "view",
                type: "function",
              },
            ],
            functionName: "ownerOf",
            args: [tokenId],
          });

          // 如果当前用户不是拥有者，跳过
          if (currentOwner.toLowerCase() !== connectedAddress.toLowerCase()) {
            continue;
          }

          // 从事件中获取原始NFT信息
          const originalContract = mintEvent.args.originalContract;
          const originalTokenId = mintEvent.args.originalTokenId;
          const sourceChainId = mintEvent.args.sourceChainId;

          // 获取tokenURI
          const tokenURI = await publicClient.readContract({
            address: contracts.WrappedNFT as `0x${string}`,
            abi: [
              {
                inputs: [{ name: "tokenId", type: "uint256" }],
                name: "tokenURI",
                outputs: [{ name: "", type: "string" }],
                stateMutability: "view",
                type: "function",
              },
            ],
            functionName: "tokenURI",
            args: [tokenId],
          });

          // 尝试获取元数据
          let metadata = {};
          if (tokenURI && typeof tokenURI === 'string') {
            try {
              if (tokenURI.startsWith('http')) {
                // 检查URL是否有效，避免请求无效的URL
                if (tokenURI.includes('example.com')) {
                  console.warn('Skipping example.com URL:', tokenURI);
                  metadata = { 
                    name: `Wrapped NFT #${tokenId}`,
                    description: `Wrapped NFT from chain ${sourceChainId}`,
                    error: 'Invalid tokenURI (example.com)'
                  };
                } else {
                  const response = await fetch(tokenURI, {
                    method: 'GET',
                    headers: {
                      'Accept': 'application/json',
                    },
                  });
                  if (response.ok) {
                    metadata = await response.json();
                  } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                  }
                }
              } else if (tokenURI.startsWith('data:application/json')) {
                const jsonString = tokenURI.split(',')[1];
                metadata = JSON.parse(atob(jsonString));
              } else {
                // 对于其他格式的URI，提供默认metadata
                metadata = { 
                  name: `Wrapped NFT #${tokenId}`,
                  description: `Wrapped NFT from chain ${sourceChainId}`,
                  tokenURI: tokenURI
                };
              }
            } catch (error) {
              console.warn("Failed to fetch metadata for token", tokenId, error);
              // 提供默认的metadata
              metadata = { 
                name: `Wrapped NFT #${tokenId}`,
                description: `Wrapped NFT from chain ${sourceChainId}`,
                error: error.message || 'Failed to fetch metadata'
              };
            }
          } else {
            // 如果没有tokenURI，提供默认metadata
            metadata = { 
              name: `Wrapped NFT #${tokenId}`,
              description: `Wrapped NFT from chain ${sourceChainId}`,
              error: 'No tokenURI available'
            };
          }

          nftList.push({
            tokenId: tokenId.toString(),
            originalContract: originalContract as string,
            originalTokenId: originalTokenId?.toString() || "0",
            sourceChainId: Number(sourceChainId),
            tokenURI: tokenURI as string,
            metadata,
          });
        } catch (error) {
          console.error(`Error fetching NFT ${tokenId}:`, error);
        }
      }

      setWrappedNFTs(nftList);
    } catch (error) {
      console.error("Error fetching wrapped NFTs:", error);
      notification.error("获取包装NFT列表失败");
    } finally {
      setIsLoading(false);
    }
  };

  // 手动处理XCM消息
  const handleProcessXCMMessage = async () => {
    if (!connectedAddress) {
      notification.error("请先连接钱包");
      return;
    }

    const contracts = getContractAddresses();
    if (!contracts) {
      notification.error("不支持的网络");
      return;
    }

    // 验证表单数据
    if (!xcmFormData.sourceContract || !xcmFormData.tokenId || !xcmFormData.recipient) {
      notification.error("请填写完整的XCM消息信息");
      return;
    }

    try {
      setIsLoading(true);
      notification.info("正在处理XCM消息...");

      // 生成锁定消息哈希
      const lockMessageHash = keccak256(
        encodeAbiParameters(
          [
            { name: 'sourceChainId', type: 'uint32' },
            { name: 'sourceContract', type: 'address' },
            { name: 'tokenId', type: 'uint256' },
            { name: 'recipient', type: 'address' },
            { name: 'tokenURI', type: 'string' }
          ],
          [
            parseInt(xcmFormData.sourceChainId),
            xcmFormData.sourceContract as `0x${string}`,
            BigInt(xcmFormData.tokenId),
            xcmFormData.recipient as `0x${string}`,
            xcmFormData.tokenURI || `https://example.com/token/${xcmFormData.tokenId}`
          ]
        )
      );

      console.log("🔐 锁定消息哈希:", lockMessageHash);
      console.log("📋 XCM消息信息:", xcmFormData);

      // 调用processXCMMessage函数
      const tx = await writeXCMBridgeAsync({
        functionName: "processXCMMessage",
        args: [
          lockMessageHash,                                    // messageHash
          0,                                                 // MessageType.LOCK_NFT (触发铸造包装NFT)
          xcmFormData.sourceContract as `0x${string}`,       // nftContract
          BigInt(xcmFormData.tokenId),                       // tokenId
          xcmFormData.recipient as `0x${string}`,            // recipient
          parseInt(xcmFormData.sourceChainId),               // sourceChainId
          xcmFormData.tokenURI || `https://example.com/token/${xcmFormData.tokenId}` // tokenURI
        ],
      });

      notification.success(`XCM消息处理成功！交易哈希: ${tx}`);
      
      // 重置表单
      setXcmFormData({
        sourceChainId: "1287",
        sourceContract: "",
        tokenId: "",
        recipient: "",
        tokenURI: ""
      });
      setShowXCMProcessor(false);
      
      // 刷新NFT列表
      setTimeout(() => {
        fetchWrappedNFTs();
      }, 3000);

    } catch (error: any) {
      console.error("处理XCM消息失败:", error);
      let errorMessage = "处理XCM消息失败";
      
      if (error.message?.includes("Message already processed")) {
        errorMessage = "该XCM消息已经被处理过了";
      } else if (error.message?.includes("user rejected")) {
        errorMessage = "用户取消了交易";
      }
      
      notification.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 销毁包装NFT并解锁原始NFT
  const handleBurnWrappedNFT = async (tokenId: string) => {
    if (!connectedAddress) {
      notification.error("请先连接钱包");
      return;
    }

    const contracts = getContractAddresses();
    if (!contracts) {
      notification.error("不支持的网络");
      return;
    }

    try {
      setIsLoading(true);
      
      // 检查授权
      const approvedAddress = await publicClient?.readContract({
        address: contracts.WrappedNFT as `0x${string}`,
        abi: [
          {
            inputs: [{ name: "tokenId", type: "uint256" }],
            name: "getApproved",
            outputs: [{ name: "", type: "address" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        functionName: "getApproved",
        args: [BigInt(tokenId)],
      });

      // 如果未授权，先进行授权
      if (approvedAddress?.toLowerCase() !== contracts.XCMBridge.toLowerCase()) {
        notification.info("正在授权包装NFT给XCM Bridge...");
        
        await writeWrappedNFTAsync({
          functionName: "approve",
          args: [contracts.XCMBridge, BigInt(tokenId)],
        });
        
        // 等待授权确认
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // 销毁包装NFT并解锁
      const tx = await writeXCMBridgeAsync({
        functionName: "burnWrappedNFTAndUnlock",
        args: [BigInt(tokenId)],
      });

      notification.success(`包装NFT销毁成功！交易哈希: ${tx}`);
      
      // 刷新NFT列表
      setTimeout(() => {
        fetchWrappedNFTs();
      }, 3000);

    } catch (error: any) {
      console.error("销毁包装NFT失败:", error);
      let errorMessage = "销毁包装NFT失败";
      
      if (error.message?.includes("Not wrapped NFT owner")) {
        errorMessage = "只有包装NFT的所有者才能销毁";
      } else if (error.message?.includes("user rejected")) {
        errorMessage = "用户取消了交易";
      }
      
      notification.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取链名称
  const getChainName = (chainId: number) => {
    switch (chainId) {
      case 1287:
        return "Moonbase Alpha";
      case 420420422:
        return "Polkadot Hub TestNet";
      default:
        return `Chain ${chainId}`;
    }
  };

  // 组件挂载时获取NFT列表
  useEffect(() => {
    if (connectedAddress && chainId) {
      fetchWrappedNFTs();
    }
  }, [connectedAddress, chainId]);

  if (!connectedAddress) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">🔗 包装NFT管理器</h2>
          <p className="text-gray-600 mb-4">请连接钱包以查看您的包装NFT</p>
        </div>
      </div>
    );
  }

  const contracts = getContractAddresses();
  if (!contracts) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="alert alert-warning">
          <div>
            <h3 className="font-bold">⚠️ 不支持的网络</h3>
            <p>请切换到 Moonbase Alpha 或 Polkadot Hub TestNet</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 标题和操作按钮 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">🎁 我的包装NFT</h2>
          <p className="text-gray-600">
            当前网络: {getChainName(chainId)} | 合约: {contracts.WrappedNFT}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowXCMProcessor(!showXCMProcessor)}
            disabled={isLoading}
          >
            {showXCMProcessor ? "❌ 关闭" : "⚡ 处理XCM"}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={fetchWrappedNFTs}
            disabled={isLoading}
          >
            {isLoading ? "刷新中..." : "🔄 刷新"}
          </button>
        </div>
      </div>

      {/* XCM消息处理器 */}
      {showXCMProcessor && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">⚡ 手动处理XCM消息</h3>
            <p className="text-sm text-gray-600 mb-4">
              当XCM消息未能自动处理时，您可以手动输入消息信息来铸造包装NFT
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">源链ID</span>
                </label>
                <select 
                  className="select select-bordered"
                  value={xcmFormData.sourceChainId}
                  onChange={(e) => setXcmFormData({...xcmFormData, sourceChainId: e.target.value})}
                >
                  <option value="1287">1287 (Moonbase Alpha)</option>
                  <option value="420420422">420420422 (Polkadot Hub TestNet)</option>
                </select>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">源合约地址</span>
                </label>
                <input
                  type="text"
                  placeholder="0x..."
                  className="input input-bordered"
                  value={xcmFormData.sourceContract}
                  onChange={(e) => setXcmFormData({...xcmFormData, sourceContract: e.target.value})}
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Token ID</span>
                </label>
                <input
                  type="number"
                  placeholder="24"
                  className="input input-bordered"
                  value={xcmFormData.tokenId}
                  onChange={(e) => setXcmFormData({...xcmFormData, tokenId: e.target.value})}
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">接收者地址</span>
                </label>
                <input
                  type="text"
                  placeholder="0x..."
                  className="input input-bordered"
                  value={xcmFormData.recipient}
                  onChange={(e) => setXcmFormData({...xcmFormData, recipient: e.target.value})}
                />
              </div>
              
              <div className="form-control md:col-span-2">
                <label className="label">
                  <span className="label-text">Token URI (可选)</span>
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/token/24"
                  className="input input-bordered"
                  value={xcmFormData.tokenURI}
                  onChange={(e) => setXcmFormData({...xcmFormData, tokenURI: e.target.value})}
                />
              </div>
            </div>
            
            <div className="card-actions justify-end mt-4">
              <button
                className="btn btn-success"
                onClick={handleProcessXCMMessage}
                disabled={isLoading || !xcmFormData.sourceContract || !xcmFormData.tokenId || !xcmFormData.recipient}
              >
                {isLoading ? "处理中..." : "🚀 处理XCM消息"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 包装NFT列表 */}
      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <span className="loading loading-spinner loading-lg"></span>
          <span className="ml-2">加载包装NFT中...</span>
        </div>
      ) : wrappedNFTs.length === 0 ? (
        <div className="text-center p-8">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold mb-2">暂无包装NFT</h3>
          <p className="text-gray-600 mb-4">
            您在当前网络上还没有包装NFT。
          </p>
          <p className="text-sm text-gray-500">
            包装NFT是通过跨链转移原始NFT到当前网络时自动创建的。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wrappedNFTs.map((nft) => (
            <div key={nft.tokenId} className="card bg-base-100 shadow-xl">
              <figure className="px-4 pt-4">
                {nft.metadata?.image ? (
                  <img
                    src={nft.metadata.image}
                    alt={nft.metadata?.name || `Wrapped NFT #${nft.tokenId}`}
                    className="rounded-xl w-full h-48 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder-nft.png";
                    }}
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center">
                    <span className="text-white text-4xl">🎁</span>
                  </div>
                )}
              </figure>
              
              <div className="card-body">
                <h2 className="card-title text-lg">
                  {nft.metadata?.name || `包装NFT #${nft.tokenId}`}
                  <div className="badge badge-secondary">包装</div>
                </h2>
                
                <p className="text-sm text-gray-600 mb-2">
                  {nft.metadata?.description || "跨链包装NFT"}
                </p>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="font-semibold">包装Token ID:</span>
                    <span className="font-mono">#{nft.tokenId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">原始Token ID:</span>
                    <span className="font-mono">#{nft.originalTokenId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">源链:</span>
                    <span className="badge badge-outline badge-xs">
                      {getChainName(nft.sourceChainId)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">原始合约:</span>
                    <span className="font-mono text-xs truncate max-w-24" title={nft.originalContract}>
                      {nft.originalContract.slice(0, 6)}...{nft.originalContract.slice(-4)}
                    </span>
                  </div>
                </div>
                
                <div className="card-actions justify-end mt-4">
                  <button
                    className="btn btn-error btn-sm"
                    onClick={() => handleBurnWrappedNFT(nft.tokenId)}
                    disabled={isLoading}
                  >
                    🔥 销毁并解锁
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 说明信息 */}
      <div className="alert alert-info">
        <div>
          <h3 className="font-bold">💡 关于包装NFT</h3>
          <ul className="text-sm mt-2 space-y-1">
            <li>• 包装NFT是原始NFT在目标链上的表示</li>
            <li>• 销毁包装NFT将解锁源链上的原始NFT</li>
            <li>• 销毁操作是不可逆的，请谨慎操作</li>
            <li>• 解锁过程可能需要几分钟时间</li>
          </ul>
        </div>
      </div>
    </div>
  );
};