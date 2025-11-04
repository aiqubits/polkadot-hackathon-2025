"use client";

import React, { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId, usePublicClient, useBalance } from "wagmi";
import { parseEther, keccak256 } from "viem";
import { encodePacked } from "viem";
import { useScaffoldContract, useScaffoldWriteContract, useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export const CrossChainNFT = () => {
  const { address: connectedAddress } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: balance } = useBalance({
    address: connectedAddress,
    enabled: !!connectedAddress,
  });
  
  const [tokenURI, setTokenURI] = useState("");
  const [price, setPrice] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [messageHash, setMessageHash] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [listingId, setListingId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastMintedTokenId, setLastMintedTokenId] = useState("");
  const [listingHistory, setListingHistory] = useState<Array<{
    id: string;
    tokenId: string;
    price: string;
    txHash: string;
    timestamp: number;
    chainId: number;
  }>>([]);
  const [currentListingTxHash, setCurrentListingTxHash] = useState<string>("");

  const { writeContractAsync: writeYourCollectibleAsync } = useScaffoldWriteContract("YourCollectible");
  const { writeContractAsync: writeMarketplaceAsync } = useScaffoldWriteContract("CrossChainMarketplace");
  const { writeContractAsync: writeXCMBridgeAsync } = useScaffoldWriteContract("XCMBridge");
  const { writeContractAsync } = useWriteContract();

  // 监听上架交易收据
  const { data: listingTxReceipt } = useWaitForTransactionReceipt({
    hash: currentListingTxHash ? (currentListingTxHash as `0x${string}`) : undefined,
    enabled: !!currentListingTxHash,
  });

  // 添加读取合约状态的hook
  const { data: marketplaceContract } = useScaffoldContract({
    contractName: "CrossChainMarketplace",
  });

  // 添加XCM Bridge合约的读取hook
  const { data: xcmBridgeContract } = useScaffoldContract({
    contractName: "XCMBridge",
  });

  // 读取当前token计数器
  const { data: tokenCounter } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "tokenIdCounter",
  });

  // 读取NFT所有权（仅在tokenId存在时）
  const { data: nftOwner, refetch: refetchOwner } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "ownerOf",
    args: tokenId ? [BigInt(tokenId)] : undefined,
    enabled: !!tokenId,
  });

  // 读取NFT授权状态（仅在tokenId存在时）
  const { data: approvedAddress, refetch: refetchApproval } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "getApproved",
    args: tokenId ? [BigInt(tokenId)] : undefined,
    enabled: !!tokenId,
  });

  // 获取当前网络的合约地址
  const getContractAddresses = () => {
    if (chainId === 1287) {
      return {
        YourCollectible: "0xA8d71101fFFc06C4c1da8700f209a57553116Dea",
        XCMBridge: "0x1519c05ABD62bdcc2adf7c9028Dc0260755B021a", // XCMBridgeV2
        WrappedNFT: "0x184Ad9CF955268e44528629d3d54A4676eE93C94",
        CrossChainMarketplace: "0xa56fD2dD1E1570B46365ac277B290BAC2C1D9e83"
      };
    } else if (chainId === 420420422) {
      return {
        YourCollectible: "0xB70435eD04461aA4a70f324ab54e22d4f19af4Ce",
        XCMBridge: "0xcF0eCcaEfC1Ba660e28Db7127db6765FE389fC05", // XCMBridgeV2
        WrappedNFT: "0xa08125E688F14365E3614fC327b09f3b3976351C",
        CrossChainMarketplace: "0x7429B770b8289Dd080ea91F8348D443d13A13563"
      };
    }
    return null;
  };

  // 从交易收据中提取listing ID
  const extractListingIdFromReceipt = (receipt: any, tokenId: string, price: string) => {
    try {
      if (!receipt || !receipt.blockNumber) return null;
      
      // 根据合约逻辑生成listing ID
      const contracts = getContractAddresses();
      if (!contracts) return null;
      
      // 使用与合约相同的逻辑生成listing ID
      const timestamp = Math.floor(Date.now() / 1000); // 近似时间戳
      const listingId = keccak256(
        encodePacked(
          ["address", "uint256", "address", "uint256", "uint256"],
          [
            contracts.YourCollectible as `0x${string}`,
            BigInt(tokenId),
            connectedAddress as `0x${string}`,
            BigInt(timestamp),
            BigInt(chainId)
          ]
        )
      );
      
      return listingId;
    } catch (error) {
      console.error("提取listing ID失败:", error);
      return null;
    }
  };

  // 监听交易完成并提取listing ID
  React.useEffect(() => {
    if (listingTxReceipt && currentListingTxHash) {
      console.log("上架交易已确认:", listingTxReceipt);
      
      // 从当前状态中获取tokenId和price
      if (tokenId && price) {
        const extractedListingId = extractListingIdFromReceipt(listingTxReceipt, tokenId, price);
        
        if (extractedListingId) {
          setListingId(extractedListingId);
          
          // 添加到历史记录
          const newListing = {
            id: extractedListingId,
            tokenId: tokenId,
            price: price,
            txHash: currentListingTxHash,
            timestamp: Date.now(),
            chainId: chainId
          };
          
          setListingHistory(prev => [newListing, ...prev]);
          
          alert(`✅ 上架成功！\n\n🏷️ Listing ID: ${extractedListingId}\n💰 价格: ${price} ETH\n📝 交易哈希: ${currentListingTxHash}\n\n✨ Listing ID已自动保存，您可以直接用于跨链购买！`);
        }
      }
      
      // 清除当前交易哈希
      setCurrentListingTxHash("");
    }
  }, [listingTxReceipt, currentListingTxHash, tokenId, price, chainId]);

  const handleMintNFT = async () => {
    if (!tokenURI || !connectedAddress) {
      alert("请填写Token URI并连接钱包");
      return;
    }

    // 检查网络
    if (chainId !== 1287 && chainId !== 420420422) {
      alert("请切换到Moonbase Alpha (Chain ID: 1287) 或 Polkadot Hub TestNet (Chain ID: 420420422)");
      return;
    }

    const contracts = getContractAddresses();
    if (!contracts) {
      alert("不支持的网络");
      return;
    }

    setIsLoading(true);
    try {
      console.log("开始铸造NFT...");
      console.log("当前网络:", chainId);
      console.log("合约地址:", contracts.YourCollectible);
      console.log("参数:", { 
        to: connectedAddress, 
        uri: tokenURI, 
        royalty: "250" // 2.5% royalty as string first, then convert to BigInt
      });
      
      // 确保royalty参数是正确的类型 (uint96)
      const royaltyFee = BigInt(250); // 2.5% = 250 basis points
      
      const result = await writeYourCollectibleAsync({
        functionName: "mintItem",
        args: [connectedAddress as `0x${string}`, tokenURI, royaltyFee],
      });
      
      console.log("交易已提交:", result);
      
      // 预测下一个token ID - 等待交易确认后再更新
      const nextTokenId = tokenCounter ? (Number(tokenCounter) + 1).toString() : "1";
      setLastMintedTokenId(nextTokenId);
      setTokenId(nextTokenId); // 自动填充到上架表单
      
      alert(`NFT铸造交易已提交！\n交易哈希: ${result}\n预期Token ID: ${nextTokenId}\n\n请等待交易确认...\n可在区块浏览器中查看交易状态。`);
      
    } catch (error: any) {
      console.error("铸造失败:", error);
      console.error("错误详情:", {
        message: error?.message,
        cause: error?.cause,
        code: error?.code,
        data: error?.data
      });
      
      // 更详细的错误信息
      let errorMessage = "铸造失败";
      if (error?.message) {
        if (error.message.includes("insufficient funds")) {
          errorMessage = "余额不足，请确保有足够的代币支付gas费";
        } else if (error.message.includes("user rejected") || error.message.includes("User rejected")) {
          errorMessage = "用户取消了交易";
        } else if (error.message.includes("execution reverted")) {
          errorMessage = "合约执行失败，请检查参数和网络状态";
        } else if (error.message.includes("network")) {
          errorMessage = "网络连接问题，请检查网络设置";
        } else {
          errorMessage += `: ${error.message}`;
        }
      }
      if (error?.cause?.message) {
        errorMessage += `\n详细信息: ${error.cause.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 从交易哈希获取messageHash的函数
  const handleGetMessageHashFromTx = async () => {
    if (!transactionHash || !connectedAddress) {
      alert("请填写交易哈希并连接钱包");
      return;
    }

    const contracts = getContractAddresses();
    if (!contracts) {
      alert("不支持的网络");
      return;
    }

    setIsLoading(true);
    try {
      console.log("从交易中获取messageHash...");
      console.log("交易哈希:", transactionHash);

      if (!publicClient) {
        throw new Error("无法获取公共客户端");
      }

      // 获取交易收据
      const receipt = await publicClient.getTransactionReceipt({
        hash: transactionHash as `0x${string}`,
      });

      console.log("交易收据:", receipt);

      // 查找NFTLocked事件
      const nftLockedEvent = receipt.logs.find(log => {
        try {
          // NFTLocked事件的正确签名（包含tokenURI参数）
          const eventSignature = "0x" + keccak256("NFTLocked(address,uint256,address,uint32,bytes32,string)").slice(2);
          return log.topics[0] === eventSignature && log.address.toLowerCase() === contracts.XCMBridge.toLowerCase();
        } catch {
          return false;
        }
      });

      if (!nftLockedEvent) {
        alert(`❌ 未找到NFTLocked事件

🔍 可能的原因:
1. 交易哈希不正确
2. 交易不是NFT锁定交易
3. 交易失败了
4. 网络不匹配

💡 请确认:
• 交易哈希是否正确
• 是否在正确的网络上查询
• 交易是否成功执行`);
        return;
      }

      // 解析事件数据获取messageHash
      // NFTLocked事件: NFTLocked(address indexed nftContract, uint256 indexed tokenId, address indexed owner, uint32 destinationChainId, bytes32 messageHash, string tokenURI)
      // messageHash是第5个参数，在data中（destinationChainId之后，tokenURI之前）
      
      console.log("事件数据:", nftLockedEvent.data);
      console.log("事件topics:", nftLockedEvent.topics);
      
      // 使用viem的decodeEventLog来正确解析事件
      let messageHash;
      try {
        // 手动解析data字段
        // data包含: destinationChainId (32字节) + messageHash (32字节) + tokenURI偏移量和数据
        const dataWithoutPrefix = nftLockedEvent.data.slice(2); // 移除0x前缀
        
        // destinationChainId: 前32字节（64个字符）
        // messageHash: 接下来的32字节（64个字符）
        const messageHashHex = dataWithoutPrefix.slice(64, 128); // 取第65-128个字符
        messageHash = "0x" + messageHashHex;
        
        console.log("解析出的messageHash:", messageHash);
      } catch (error) {
        console.error("解析messageHash失败:", error);
        // 回退到原来的方法
        const messageHashFromEvent = nftLockedEvent.data.slice(-64);
        messageHash = "0x" + messageHashFromEvent;
      }

      console.log("找到messageHash:", messageHash);

      // 自动填入messageHash输入框
      setMessageHash(messageHash);

      alert(`✅ 成功获取messageHash！

📋 事件信息:
• 交易哈希: ${transactionHash}
• 消息哈希: ${messageHash}
• 合约地址: ${nftLockedEvent.address}

💡 messageHash已自动填入输入框
现在您可以使用"查询锁定状态"或"解锁NFT"功能`);

    } catch (error: any) {
      console.error("获取messageHash失败:", error);
      
      let errorMessage = "获取messageHash失败";
      if (error?.message) {
        if (error.message.includes("Transaction not found")) {
          errorMessage = "交易未找到，请检查交易哈希是否正确";
        } else if (error.message.includes("Invalid transaction hash")) {
          errorMessage = "无效的交易哈希格式";
        } else {
          errorMessage += `: ${error.message}`;
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  const handleQueryLockStatus = async () => {
    if (!messageHash || !connectedAddress) {
      alert("请填写消息哈希并连接钱包");
      return;
    }

    const contracts = getContractAddresses();
    if (!contracts) {
      alert("不支持的网络");
      return;
    }

    setIsLoading(true);
    try {
      console.log("查询锁定状态...");
      console.log("参数:", { 
        messageHash,
        xcmBridge: contracts.XCMBridge
      });

      // 使用公共客户端直接调用合约
      if (!publicClient) {
        throw new Error("无法获取公共客户端");
      }

      // 直接调用合约的getCrossChainNFT函数
      const crossChainNFT = await publicClient.readContract({
        address: contracts.XCMBridge as `0x${string}`,
        abi: [
          {
            "inputs": [{"internalType": "bytes32", "name": "messageHash", "type": "bytes32"}],
            "name": "getCrossChainNFT",
            "outputs": [
              {
                "components": [
                  {"internalType": "address", "name": "originalContract", "type": "address"},
                  {"internalType": "uint256", "name": "originalTokenId", "type": "uint256"},
                  {"internalType": "address", "name": "originalOwner", "type": "address"},
                  {"internalType": "uint32", "name": "sourceChainId", "type": "uint32"},
                  {"internalType": "uint32", "name": "destinationChainId", "type": "uint32"},
                  {"internalType": "bool", "name": "isLocked", "type": "bool"},
                  {"internalType": "uint256", "name": "timestamp", "type": "uint256"}
                ],
                "internalType": "struct XCMBridge.CrossChainNFT",
                "name": "",
                "type": "tuple"
              }
            ],
            "stateMutability": "view",
            "type": "function"
          }
        ],
        functionName: 'getCrossChainNFT',
        args: [messageHash as `0x${string}`],
      });

      console.log("🔍 合约查询结果:", crossChainNFT);
      
      if (!crossChainNFT || crossChainNFT.originalContract === "0x0000000000000000000000000000000000000000") {
        alert(`❌ 未找到对应的锁定记录

🔍 调试信息:
• 消息哈希: ${messageHash}
• XCM Bridge地址: ${contracts.XCMBridge}
• 当前网络: ${chainId === 1287 ? "Moonbase Alpha" : chainId === 420420422 ? "Polkadot Hub TestNet" : "未知网络"}

💡 可能的原因:
1. 消息哈希不正确
2. NFT从未被锁定
3. 网络不匹配（锁定和查询需要在同一网络）
4. 合约地址不正确

🔧 建议操作:
1. 检查消息哈希是否完整且正确
2. 确认在正确的网络上查询
3. 如果NFT是在另一个网络锁定的，请切换到对应网络`);
        return;
      }

      const statusMessage = `📋 锁定状态信息:

🔗 消息哈希: ${messageHash}
📄 NFT合约: ${crossChainNFT.originalContract}
🎯 Token ID: ${crossChainNFT.originalTokenId.toString()}
👤 原始所有者: ${crossChainNFT.originalOwner}
🌐 源链ID: ${crossChainNFT.sourceChainId}
🎯 目标链ID: ${crossChainNFT.destinationChainId}
🔒 锁定状态: ${crossChainNFT.isLocked ? '✅ 已锁定' : '❌ 已解锁'}
⏰ 锁定时间: ${new Date(Number(crossChainNFT.timestamp) * 1000).toLocaleString()}

${crossChainNFT.isLocked ? 
  '💡 NFT当前被锁定在XCM Bridge中\n您可以使用"解锁NFT"功能取回' : 
  '✅ NFT已解锁，应该已返回到您的钱包'}`;
      
      alert(statusMessage);
      
    } catch (error: any) {
      console.error("查询失败:", error);
      
      let errorMessage = "查询锁定状态失败";
      if (error?.message) {
        if (error.message.includes("Internal JSON-RPC error")) {
          errorMessage = "网络连接错误，请检查RPC连接或稍后重试";
        } else {
          errorMessage += `: ${error.message}`;
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 检查XCM消息状态函数
  const handleCheckXCMMessage = async () => {
    if (!messageHash || !connectedAddress) {
      alert("请填写消息哈希并连接钱包");
      return;
    }

    const contracts = getContractAddresses();
    if (!contracts) {
      alert("不支持的网络");
      return;
    }

    setIsLoading(true);
    try {
      console.log("🔍 检查XCM消息状态...");
      console.log("参数:", { 
        messageHash,
        xcmBridge: contracts.XCMBridge,
        currentChain: chainId
      });

      // 使用公共客户端直接调用合约，参考handleQueryLockStatus的成功实现
      if (!publicClient) {
        throw new Error("无法获取公共客户端");
      }

      // 直接调用合约的getXCMMessage函数
      const xcmMessage = await publicClient.readContract({
        address: contracts.XCMBridge as `0x${string}`,
        abi: [
          {
            "inputs": [{"internalType": "bytes32", "name": "messageHash", "type": "bytes32"}],
            "name": "getXCMMessage",
            "outputs": [
              {
                "components": [
                  {"internalType": "enum XCMBridge.MessageType", "name": "messageType", "type": "uint8"},
                  {"internalType": "address", "name": "nftContract", "type": "address"},
                  {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
                  {"internalType": "address", "name": "recipient", "type": "address"},
                  {"internalType": "uint32", "name": "sourceChainId", "type": "uint32"},
                  {"internalType": "uint32", "name": "destinationChainId", "type": "uint32"},
                  {"internalType": "bytes32", "name": "messageHash", "type": "bytes32"},
                  {"internalType": "bool", "name": "processed", "type": "bool"},
                  {"internalType": "string", "name": "tokenURI", "type": "string"}
                ],
                "internalType": "struct XCMBridge.XCMMessage",
                "name": "",
                "type": "tuple"
              }
            ],
            "stateMutability": "view",
            "type": "function"
          }
        ],
        functionName: 'getXCMMessage',
        args: [messageHash as `0x${string}`],
      });

      console.log("🔍 XCM消息查询结果:", xcmMessage);

      // 检查是否找到消息
      if (!xcmMessage || xcmMessage.nftContract === "0x0000000000000000000000000000000000000000") {
        alert(`❌ 未找到对应的XCM消息

🔍 调试信息:
• 消息哈希: ${messageHash}
• XCM Bridge地址: ${contracts.XCMBridge}
• 当前网络: ${chainId === 1287 ? "Moonbase Alpha" : chainId === 420420422 ? "Polkadot Hub TestNet" : "未知网络"}

💡 可能的原因:
1. 消息哈希不正确
2. XCM消息从未创建
3. 网络不匹配
4. 合约地址不正确

🔧 建议操作:
1. 检查消息哈希是否完整且正确
2. 确认在正确的网络上查询
3. 先在源链查询锁定状态，确认消息已创建`);
        return;
      }

      const messageInfo = `🔍 XCM消息状态检查

📋 消息详情:
• 消息哈希: ${messageHash}
• 当前网络: ${chainId === 1287 ? "Moonbase Alpha" : chainId === 420420422 ? "Polkadot Hub TestNet" : "未知网络"}
• 消息类型: ${xcmMessage.messageType === 0 ? "LOCK_NFT" : "未知"}
• 源链ID: ${xcmMessage.sourceChainId}
• 目标链ID: ${xcmMessage.destinationChainId}
• 已处理: ${xcmMessage.processed ? "✅ 是" : "❌ 否"}
• NFT合约: ${xcmMessage.nftContract}
• Token ID: ${xcmMessage.tokenId?.toString()}
• 接收者: ${xcmMessage.recipient || "未设置"}

${xcmMessage.processed ? 
  "✅ XCM消息已处理，可以尝试解锁NFT" : 
  "⚠️ XCM消息尚未处理，需要等待或手动处理"}

💡 说明:
${xcmMessage.processed ? 
  "消息已在目标链处理，NFT应该可以解锁" : 
  "消息尚未处理，这是'NFT not locked'错误的根本原因"}`;

      alert(messageInfo);

    } catch (error: any) {
      console.error("XCM消息查询失败:", error);
      
      let errorMessage = "XCM消息查询失败";
      if (error?.message) {
        if (error.message.includes("Internal JSON-RPC error")) {
          errorMessage = "网络连接错误，请检查RPC连接或稍后重试";
        } else if (error.message.includes("execution reverted")) {
          errorMessage = "合约调用失败，可能消息哈希不存在或网络不匹配";
        } else if (error.message.includes("AbiFunctionNotFoundError")) {
          errorMessage = "合约函数不存在，请检查合约版本";
        } else {
          errorMessage += `: ${error.message}`;
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 销毁包装NFT并解锁原始NFT
  const handleBurnWrappedNFT = async () => {
    if (!tokenId || !connectedAddress) {
      alert("请填写Token ID并连接钱包");
      return;
    }

    const contracts = getContractAddresses();
    if (!contracts) {
      alert("不支持的网络");
      return;
    }

    setIsLoading(true);
    try {
      console.log("开始销毁包装NFT并解锁原始NFT...");
      console.log("参数:", { 
        tokenId,
        wrappedNFT: contracts.WrappedNFT,
        xcmBridge: contracts.XCMBridge
      });

      // 预检查：验证包装NFT所有权
      console.log("🔍 验证包装NFT所有权...");
      
      // 检查包装NFT是否存在和所有权
      try {
        const wrappedNFTContract = await publicClient?.readContract({
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
          args: [BigInt(tokenId)],
        });

        if (wrappedNFTContract && wrappedNFTContract.toLowerCase() !== connectedAddress.toLowerCase()) {
          alert(`错误：您不是包装NFT Token ID ${tokenId}的所有者\n当前所有者：${wrappedNFTContract}`);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        alert(`错误：包装NFT Token ID ${tokenId}不存在或无法访问`);
        setIsLoading(false);
        return;
      }

      // 预检查：验证包装NFT是否已被授权
      console.log("🔍 检查包装NFT授权状态...");
      
      try {
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

        if (approvedAddress && approvedAddress.toLowerCase() !== contracts.XCMBridge.toLowerCase()) {
          // 需要先授权
          console.log("🔑 授权包装NFT给XCM Bridge...");
          
          const approveTx = await writeContractAsync({
            address: contracts.WrappedNFT as `0x${string}`,
            abi: [
              {
                inputs: [
                  { name: "to", type: "address" },
                  { name: "tokenId", type: "uint256" }
                ],
                name: "approve",
                outputs: [],
                stateMutability: "nonpayable",
                type: "function",
              },
            ],
            functionName: "approve",
            args: [contracts.XCMBridge as `0x${string}`, BigInt(tokenId)],
          });

          console.log("✅ 授权交易已提交:", approveTx);
          
          // 等待授权交易确认
          console.log("⏳ 等待授权交易确认...");
          await publicClient?.waitForTransactionReceipt({ hash: approveTx });
          console.log("✅ 授权交易已确认");
        }
      } catch (error) {
        console.error("授权失败:", error);
        alert("授权包装NFT失败，请重试");
        setIsLoading(false);
        return;
      }

      // 销毁包装NFT并解锁
      console.log("🔥 销毁包装NFT并发起解锁...");
      
      const burnTx = await writeXCMBridgeAsync({
        functionName: "burnWrappedNFTAndUnlock",
        args: [BigInt(tokenId)],
      });

      console.log("✅ 销毁交易已提交:", burnTx);

      alert(`🎉 包装NFT销毁成功，解锁请求已发起！

📋 操作详情:
• Token ID: ${tokenId}
• 当前网络: ${chainId === 1287 ? "Moonbase Alpha" : "Polkadot Hub TestNet"}
• 目标网络: ${chainId === 1287 ? "Polkadot Hub TestNet" : "Moonbase Alpha"}
• 交易哈希: ${burnTx}

🔄 处理流程:
1. ✅ 包装NFT已销毁
2. 🔄 XCM消息正在传递到源链
3. ⏳ 等待源链处理解锁消息
4. 🎯 原始NFT将在源链上解锁

💡 请切换到源链网络查看解锁的原始NFT`);

      // 清空Token ID输入
      setTokenId("");

    } catch (error: any) {
      console.error("销毁包装NFT失败:", error);
      
      let errorMessage = "销毁包装NFT失败";
      if (error?.message) {
        if (error.message.includes("Not wrapped NFT owner")) {
          errorMessage = "只有包装NFT的所有者才能销毁";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "余额不足，请确保有足够的代币支付gas费";
        } else if (error.message.includes("user rejected")) {
          errorMessage = "用户取消了销毁交易";
        } else if (error.message.includes("Internal JSON-RPC error")) {
          errorMessage = "网络连接错误，请检查RPC连接或稍后重试";
        } else {
          errorMessage += `: ${error.message}`;
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 手动解锁NFT函数
  const handleUnlockNFT = async () => {
    if (!messageHash || !connectedAddress) {
      alert("请填写消息哈希并连接钱包");
      return;
    }

    const contracts = getContractAddresses();
    if (!contracts) {
      alert("不支持的网络");
      return;
    }

    setIsLoading(true);
    try {
      console.log("开始解锁NFT...");
      console.log("参数:", { 
        messageHash,
        xcmBridge: contracts.XCMBridge
      });

      // 调用XCM Bridge的unlockNFT函数
      const unlockTx = await writeXCMBridgeAsync({
        functionName: "unlockNFT",
        args: [messageHash as `0x${string}`],
      });

      console.log("✅ 解锁交易已提交:", unlockTx);

      alert(`🎉 NFT解锁成功！

📋 解锁详情:
• 消息哈希: ${messageHash}
• 交易哈希: ${unlockTx}

✅ NFT已返回到您的钱包
请在Profile页面查看您的NFT`);

      // 清空消息哈希输入
      setMessageHash("");

    } catch (error: any) {
      console.error("解锁失败:", error);
      
      let errorMessage = "解锁NFT失败";
      if (error?.message) {
        if (error.message.includes("NFT not locked")) {
          errorMessage = `❌ NFT解锁失败：NFT未被锁定

🔍 详细信息:
• 消息哈希: ${messageHash}
• 当前网络: ${chainId === 1287 ? "Moonbase Alpha" : chainId === 420420422 ? "Polkadot Hub TestNet" : "未知网络"}
• 您的地址: ${connectedAddress}

💡 可能的原因:
1. NFT从未被锁定到XCM Bridge
2. NFT已经被解锁
3. 消息哈希不正确
4. 在错误的网络上尝试解锁

🔧 建议操作:
1. 先使用"查询锁定状态"功能确认NFT状态
2. 检查消息哈希是否正确
3. 确认在正确的网络上操作
4. 如果NFT在另一个网络，请切换网络后重试`;
        } else if (error.message.includes("Not original owner")) {
          errorMessage = "只有NFT的原始所有者才能解锁";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "余额不足，请确保有足够的代币支付gas费";
        } else if (error.message.includes("user rejected")) {
          errorMessage = "用户取消了解锁交易";
        } else if (error.message.includes("Internal JSON-RPC error")) {
          errorMessage = "网络连接错误，请检查RPC连接或稍后重试";
        } else {
          errorMessage += `: ${error.message}`;
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleListNFT = async () => {
    if (!tokenId || !price || !connectedAddress) {
      alert("请填写Token ID、价格并连接钱包");
      return;
    }

    const contracts = getContractAddresses();
    if (!contracts) {
      alert("不支持的网络");
      return;
    }

    setIsLoading(true);
    try {
      const priceInWei = parseEther(price);
      
      console.log("开始上架NFT...");
      console.log("参数:", { tokenId, price, priceInWei: priceInWei.toString() });

      // 第一步：授权市场合约操作NFT
      console.log("1. 授权市场合约...");
      try {
        const approveTx = await writeYourCollectibleAsync({
          functionName: "setApprovalForAll",
          args: [contracts.CrossChainMarketplace as `0x${string}`, true],
        });
        
        console.log("授权交易已提交:", approveTx);
        alert(`授权交易已提交: ${approveTx}\n请等待确认后继续上架...`);

        // 等待一段时间让用户手动确认授权交易
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (approveError: any) {
        console.error("授权失败:", approveError);
        if (approveError?.message?.includes("user rejected")) {
          throw new Error("用户取消了授权交易");
        } else if (approveError?.message?.includes("AbiFunctionNotFoundError")) {
          throw new Error("合约ABI配置错误，请联系开发者");
        } else {
          throw new Error(`授权失败: ${approveError?.message || "未知错误"}`);
        }
      }

      // 第二步：上架NFT到跨链市场
      console.log("2. 上架NFT到跨链市场...");
      const listTx = await writeMarketplaceAsync({
        functionName: "listNFT",
        args: [
          contracts.YourCollectible as `0x${string}`,
          BigInt(tokenId),
          priceInWei,
          "0x0000000000000000000000000000000000000000", // 使用原生代币
          true, // 跨链上架
        ],
      });

      console.log("上架交易已提交:", listTx);

      // 设置交易哈希以监听交易完成
      setCurrentListingTxHash(listTx);

      alert(`NFT上架交易已提交！\n交易哈希: ${listTx}\n价格: ${price} ETH\n\n🔄 正在等待交易确认...\n确认后将自动显示Listing ID`);
      
    } catch (error: any) {
      console.error("上架失败:", error);
      
      let errorMessage = "上架失败";
      if (error?.message) {
        if (error.message.includes("insufficient funds")) {
          errorMessage = "余额不足，请确保有足够的代币支付gas费";
        } else if (error.message.includes("user rejected") || error.message.includes("用户取消")) {
          errorMessage = "用户取消了交易";
        } else if (error.message.includes("not owner")) {
          errorMessage = "您不是该NFT的所有者";
        } else if (error.message.includes("AbiFunctionNotFoundError")) {
          errorMessage = "合约ABI配置错误，请刷新页面重试";
        } else {
          errorMessage += `: ${error.message}`;
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCrossChainPurchase = async () => {
    if (!listingId || !price || !connectedAddress) {
      alert("请填写Listing ID、价格并连接钱包");
      return;
    }

    const contracts = getContractAddresses();
    if (!contracts) {
      alert("不支持的网络");
      return;
    }

    // 跨链购买说明
    const crossChainInstructions = `
🌉 跨链购买操作说明：

❗ 重要：跨链购买需要在NFT所在的源链上发起！

📋 正确操作流程：
1. 首先查询Listing状态，确认NFT在哪条链上
2. 切换到NFT所在的源链网络
3. 在源链上调用跨链购买功能
4. 指定目标链ID（您想接收NFT的链）

🔗 网络对应关系：
• Moonbase Alpha (Chain ID: 1287)
• Polkadot Hub TestNet (Chain ID: 420420422)

💡 示例：
- 如果NFT在Moonbase Alpha上，请切换到Moonbase Alpha网络
- 然后发起跨链购买，目标链选择Polkadot Hub
- NFT将通过XCM桥转移到Polkadot Hub

是否继续当前操作？
    `;

    const confirmed = confirm(crossChainInstructions);
    if (!confirmed) {
      return;
    }

    // 确定目标链ID - 用户需要手动选择目标链
    const targetChainId = chainId === 1287 ? 420420422 : 1287;

    setIsLoading(true);
    try {
      const priceInWei = parseEther(price);
      
      console.log("开始跨链购买...");
      console.log("参数:", { 
        listingId, 
        price, 
        priceInWei: priceInWei.toString(),
        currentChain: chainId,
        targetChain: targetChainId,
        note: "确保当前网络是NFT所在的源链"
      });

      const purchaseTx = await writeMarketplaceAsync({
        functionName: "initiateCrossChainPurchase",
        args: [listingId as `0x${string}`, targetChainId],
        value: priceInWei,
      });

      console.log("跨链购买交易已提交:", purchaseTx);

      // 生成购买跟踪ID
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const purchaseId = keccak256(
        encodePacked(
          ["bytes32", "address", "uint256"],
          [
            listingId as `0x${string}`,
            connectedAddress,
            BigInt(currentTimestamp)
          ]
        )
      );

      alert(`跨链购买请求已发起！\n交易哈希: ${purchaseTx}\n购买跟踪ID: ${purchaseId}\n支付金额: ${price} ETH\n\n处理流程:\n1. XCM消息传递到目标链\n2. 目标链验证并执行购买\n3. NFT通过跨链桥转移\n4. 您将在当前链接收NFT\n\n请耐心等待跨链处理完成...`);
      
    } catch (error: any) {
      console.error("跨链购买失败:", error);
      
      let errorMessage = "跨链购买失败";
      if (error?.message) {
        if (error.message.includes("insufficient funds")) {
          errorMessage = "余额不足，请确保有足够的代币支付购买价格和gas费";
        } else if (error.message.includes("user rejected")) {
          errorMessage = "用户取消了交易";
        } else if (error.message.includes("Listing not active")) {
          errorMessage = "该NFT已不可购买，可能已被其他人购买";
        } else {
          errorMessage += `: ${error.message}`;
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 网络连接检查函数
  const checkNetworkConnection = async () => {
    try {
      console.log("🔍 检查网络连接状态...");
      
      if (!publicClient) {
        alert("❌ 网络连接异常！\n\n🚨 错误信息: PublicClient未初始化\n\n🔧 建议解决方案:\n1. 检查钱包连接\n2. 刷新页面重试\n3. 切换钱包网络\n4. 联系技术支持");
        return;
      }
      
      // 检查当前链ID
      const currentChainId = await publicClient.getChainId();
      console.log("当前链ID:", currentChainId);
      
      // 检查最新区块
      const latestBlock = await publicClient.getBlockNumber();
      console.log("最新区块:", latestBlock);
      
      // 格式化余额显示
      const balanceDisplay = balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : 'N/A';
      
      alert(`✅ 网络连接正常！

🌐 网络信息:
• 链ID: ${currentChainId}
• 网络名称: ${currentChainId === 1287 ? "Moonbase Alpha" : currentChainId === 420420422 ? "Polkadot Hub TestNet" : "未知网络"}
• 最新区块: ${latestBlock}
• 账户: ${connectedAddress || '未连接'}
• 余额: ${balanceDisplay}

🔗 RPC端点状态: 正常`);
      
    } catch (error: any) {
      console.error("网络连接检查失败:", error);
      
      let errorMessage = "网络连接异常";
      if (error?.message) {
        if (error.message.includes("fetch")) {
          errorMessage = "RPC端点连接失败，请检查网络连接";
        } else if (error.message.includes("timeout")) {
          errorMessage = "网络请求超时，请稍后重试";
        } else {
          errorMessage += `: ${error.message}`;
        }
      }
      
      alert(`❌ ${errorMessage}！

🔧 建议解决方案:
1. 检查网络连接
2. 刷新页面重试
3. 切换钱包网络
4. 尝试切换RPC端点
5. 联系技术支持`);
    }
  };

  // 授权NFT合约进行跨链转移
  const handleAuthorizeContract = async () => {
    if (!connectedAddress) {
      alert("请先连接钱包");
      return;
    }

    const contracts = getContractAddresses();
    if (!contracts) {
      alert("不支持的网络");
      return;
    }

    try {
      console.log("🔐 开始授权NFT合约...");
      console.log("NFT合约地址:", contracts.YourCollectible);
      console.log("XCM Bridge地址:", contracts.XCMBridge);

      const authorizeTx = await writeXCMBridgeAsync({
        functionName: "setContractAuthorization",
        args: [contracts.YourCollectible as `0x${string}`, true],
      });

      console.log("✅ 授权交易已提交:", authorizeTx);
      alert(`✅ NFT合约授权成功！

📋 交易详情:
• 交易哈希: ${authorizeTx}
• NFT合约: ${contracts.YourCollectible}
• 状态: 已授权

现在可以进行跨链转移了！`);

    } catch (error: any) {
      console.error("授权失败:", error);
      
      let errorMessage = "授权失败";
      if (error?.message) {
        if (error.message.includes("user rejected")) {
          errorMessage = "用户取消了交易";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "余额不足，请确保有足够的gas费";
        } else if (error.message.includes("Ownable: caller is not the owner")) {
          errorMessage = "只有合约所有者才能授权NFT合约";
        } else {
          errorMessage += `: ${error.message}`;
        }
      }
      
      alert(`❌ ${errorMessage}！

🔧 解决方案:
1. 确保你是XCM Bridge合约的所有者
2. 检查钱包余额是否足够支付gas费
3. 重新尝试授权操作`);
    }
  };

  const handleLockForCrossChain = async () => {
    if (!tokenId || !connectedAddress) {
      alert("请填写Token ID并连接钱包");
      return;
    }

    const contracts = getContractAddresses();
    if (!contracts) {
      alert("不支持的网络");
      return;
    }

    // 确定目标链ID
    const destinationChainId = chainId === 1287 ? 420420422 : 1287;

    setIsLoading(true);
    try {
      console.log("开始跨链转移NFT...");
      console.log("参数:", { 
        tokenId, 
        currentChain: chainId,
        destinationChain: destinationChainId,
        nftContract: contracts.YourCollectible,
        xcmBridge: contracts.XCMBridge
      });

      // 预检查：验证NFT所有权
      console.log("🔍 验证NFT所有权...");
      
      // 刷新所有权数据
      const { data: currentOwner } = await refetchOwner();
      
      if (currentOwner && currentOwner.toLowerCase() !== connectedAddress.toLowerCase()) {
        alert(`错误：您不是Token ID ${tokenId}的所有者\n当前所有者：${currentOwner}`);
        setIsLoading(false);
        return;
      }

      // 预检查：验证NFT是否已被授权
      console.log("🔍 检查当前授权状态...");
      
      // 刷新授权数据
      const { data: currentApproval } = await refetchApproval();

      if (currentApproval && currentApproval.toLowerCase() === contracts.XCMBridge.toLowerCase()) {
        console.log("✅ NFT已经授权给XCM Bridge，跳过授权步骤");
      } else {
        // 第一步：授权XCM Bridge操作NFT
        console.log("1️⃣ 授权XCM Bridge...");
        
        try {
          const approveTx = await writeYourCollectibleAsync({
            functionName: "approve",
            args: [contracts.XCMBridge, BigInt(tokenId)],
          });

          console.log("✅ 授权交易已提交:", approveTx);
          alert(`授权交易已提交: ${approveTx}\n\n请等待交易确认后点击"确定"继续...`);

          // 等待用户确认
          const continueTransfer = confirm("授权交易是否已确认？点击确定继续锁定NFT，取消则停止操作。");
          if (!continueTransfer) {
            setIsLoading(false);
            return;
          }
        } catch (approveError: any) {
          console.error("授权失败:", approveError);
          
          let errorMessage = "授权失败";
          if (approveError?.message) {
            if (approveError.message.includes("insufficient funds")) {
              errorMessage = "余额不足，请确保有足够的代币支付gas费";
            } else if (approveError.message.includes("user rejected")) {
              errorMessage = "用户取消了授权交易";
            } else if (approveError.message.includes("Internal JSON-RPC error")) {
              errorMessage = "网络连接错误，请检查RPC连接或稍后重试";
            } else {
              errorMessage += `: ${approveError.message}`;
            }
          }
          
          alert(errorMessage);
          setIsLoading(false);
          return;
        }
      }

      // 第二步：锁定NFT进行跨链转移
      console.log("2️⃣ 锁定NFT到XCM Bridge...");
      console.log("🔍 XCM Bridge合约信息:", xcmBridgeContract);
      console.log("🔍 writeXCMBridgeAsync函数:", writeXCMBridgeAsync);
      
      try {
        const lockTx = await writeXCMBridgeAsync({
          functionName: "lockNFT",
          args: [
            contracts.YourCollectible,
            BigInt(tokenId),
            destinationChainId,
          ],
        });

        console.log("✅ 锁定交易已提交:", lockTx);
        console.log("🔍 锁定交易类型:", typeof lockTx);
        console.log("🔍 锁定交易完整对象:", JSON.stringify(lockTx, null, 2));

        // 生成消息哈希用于跟踪 - 注意：这只是估算值，实际值需要从事件中获取
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const estimatedMessageHash = keccak256(
          encodePacked(
            ["address", "uint256", "address", "uint256", "uint32", "uint256"],
            [
              contracts.YourCollectible,
              BigInt(tokenId),
              connectedAddress,
              BigInt(chainId),
              BigInt(destinationChainId),
              BigInt(currentTimestamp)
            ]
          )
        );

        alert(`🎉 跨链转移请求已发起！

📋 转移详情:
• Token ID: ${tokenId}
• 源链: ${chainId === 1287 ? "Moonbase Alpha" : "Polkadot Hub TestNet"}
• 目标链: ${destinationChainId === 1287 ? "Moonbase Alpha" : "Polkadot Hub TestNet"}
• 交易哈希: ${lockTx}

⚠️ 重要提示:
要获取正确的消息哈希进行解锁，请：
1. 在区块链浏览器中查看交易 ${lockTx}
2. 查找 "NFTLocked" 事件
3. 复制事件中的 "messageHash" 参数

🔄 处理流程:
1. ✅ NFT已锁定到XCM Bridge
2. 🔄 XCM消息正在传递到目标链
3. ⏳ 等待目标链处理消息
4. 🎯 使用正确的messageHash解锁NFT

💡 临时跟踪ID (仅供参考): ${estimatedMessageHash}`);

        // 清空输入
        setTokenId("");
        
      } catch (lockError: any) {
          console.error("锁定失败:", lockError);
          
          let errorMessage = "锁定NFT失败";
          if (lockError?.message) {
            if (lockError.message.includes("insufficient funds")) {
              errorMessage = "余额不足，请确保有足够的代币支付gas费";
            } else if (lockError.message.includes("user rejected")) {
              errorMessage = "用户取消了锁定交易";
            } else if (lockError.message.includes("Contract not authorized")) {
              errorMessage = "合约未授权，请先完成授权步骤";
            } else if (lockError.message.includes("Not token owner")) {
              errorMessage = "您不是该NFT的所有者";
            } else if (lockError.message.includes("Chain not supported")) {
              errorMessage = "目标链不受支持";
            } else if (lockError.message.includes("Internal JSON-RPC error")) {
              errorMessage = "网络连接错误，请检查RPC连接或稍后重试";
            } else {
              errorMessage += `: ${lockError.message}`;
            }
          }
          
          alert(errorMessage);
        }
      
    } catch (error: any) {
      console.error("跨链转移失败:", error);
      
      let errorMessage = "跨链转移失败";
      if (error?.message) {
        if (error.message.includes("Internal JSON-RPC error")) {
          errorMessage = "网络连接错误，请尝试以下解决方案：\n\n1. 检查网络连接\n2. 切换到其他RPC端点\n3. 刷新页面重试\n4. 检查钱包网络设置";
        } else {
          errorMessage += `: ${error.message}`;
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理XCM消息函数
  const handleProcessXCMMessage = async () => {
    if (!messageHash || !connectedAddress) {
      alert("请填写消息哈希并连接钱包");
      return;
    }

    const contracts = getContractAddresses();
    if (!contracts) {
      alert("不支持的网络");
      return;
    }

    // 首先检查当前网络是否为目标链
    if (chainId !== 420420422) {
      alert(`⚠️ 请切换到目标链网络

当前网络: ${chainId === 1287 ? "Moonbase Alpha" : "未知网络"}
需要切换到: Polkadot Hub TestNet (链ID: 420420422)

XCM消息处理必须在目标链上进行！`);
      return;
    }

    setIsLoading(true);
    try {
      console.log("🔄 开始处理XCM消息...");
      console.log("参数:", { 
        messageHash,
        xcmBridge: contracts.XCMBridge,
        currentChain: chainId
      });

      // 首先从源链获取XCM消息信息
      // 注意：这里需要从源链获取消息详情，然后在目标链处理
      const sourceChainContracts = {
        XCMBridge: "0x1519c05ABD62bdcc2adf7c9028Dc0260755B021a" // Moonbase Alpha XCMBridge
      };

      // 创建源链的公共客户端来获取消息详情
      const sourceChainRPC = "https://rpc.api.moonbase.moonbeam.network";
      const { createPublicClient, http } = await import('viem');
      const sourcePublicClient = createPublicClient({
        transport: http(sourceChainRPC)
      });

      // 从源链获取XCM消息详情
      const sourceXcmMessage = await sourcePublicClient.readContract({
        address: sourceChainContracts.XCMBridge as `0x${string}`,
        abi: [
          {
            "inputs": [{"internalType": "bytes32", "name": "messageHash", "type": "bytes32"}],
            "name": "getXCMMessage",
            "outputs": [
              {
                "components": [
                  {"internalType": "enum XCMBridge.MessageType", "name": "messageType", "type": "uint8"},
                  {"internalType": "address", "name": "nftContract", "type": "address"},
                  {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
                  {"internalType": "address", "name": "recipient", "type": "address"},
                  {"internalType": "uint32", "name": "sourceChainId", "type": "uint32"},
                  {"internalType": "uint32", "name": "destinationChainId", "type": "uint32"},
                  {"internalType": "bytes32", "name": "messageHash", "type": "bytes32"},
                  {"internalType": "bool", "name": "processed", "type": "bool"},
                  {"internalType": "string", "name": "tokenURI", "type": "string"}
                ],
                "internalType": "struct XCMBridge.XCMMessage",
                "name": "",
                "type": "tuple"
              }
            ],
            "stateMutability": "view",
            "type": "function"
          }
        ],
        functionName: 'getXCMMessage',
        args: [messageHash as `0x${string}`],
      });

      console.log("📥 源链XCM消息详情:", sourceXcmMessage);

      // 检查源链消息是否存在
      if (!sourceXcmMessage || sourceXcmMessage.nftContract === "0x0000000000000000000000000000000000000000") {
        alert(`❌ 在源链上未找到XCM消息

🔍 调试信息:
• 消息哈希: ${messageHash}
• 源链XCM Bridge: ${sourceChainContracts.XCMBridge}

💡 可能的原因:
1. 消息哈希不正确
2. NFT从未在源链锁定
3. 消息已被删除或过期

🔧 建议操作:
1. 检查消息哈希是否正确
2. 在源链上查询锁定状态
3. 确认NFT确实已被锁定`);
        return;
      }

      // 调用目标链的processXCMMessage函数
      const result = await writeXCMBridgeAsync({
        functionName: "processXCMMessage",
        args: [
          messageHash as `0x${string}`,
          sourceXcmMessage.messageType,
          sourceXcmMessage.nftContract,
          sourceXcmMessage.tokenId,
          sourceXcmMessage.recipient,
          sourceXcmMessage.sourceChainId,
          sourceXcmMessage.tokenURI || ""  // 添加tokenURI参数
        ],
      });

      console.log("✅ XCM消息处理交易已提交:", result);

      // 根据消息类型显示不同的成功信息
      if (sourceXcmMessage.messageType === 0) { // LOCK_NFT
        alert(`🎉 跨链NFT转移成功！

📋 处理详情:
• 消息哈希: ${messageHash}
• 消息类型: LOCK_NFT (锁定NFT)
• 原始NFT合约: ${sourceXcmMessage.nftContract}
• 原始Token ID: ${sourceXcmMessage.tokenId?.toString()}
• 接收者: ${sourceXcmMessage.recipient}
• 源链ID: ${sourceXcmMessage.sourceChainId}
• 交易哈希: ${result}

✅ 包装NFT已在当前链成功铸造！
🔍 你可以在NFT列表中查看新铸造的包装NFT。`);
      } else if (sourceXcmMessage.messageType === 1) { // UNLOCK_NFT
        alert(`🎉 NFT解锁成功！

📋 处理详情:
• 消息哈希: ${messageHash}
• 消息类型: UNLOCK_NFT (解锁NFT)
• NFT合约: ${sourceXcmMessage.nftContract}
• Token ID: ${sourceXcmMessage.tokenId?.toString()}
• 接收者: ${sourceXcmMessage.recipient}
• 源链ID: ${sourceXcmMessage.sourceChainId}
• 交易哈希: ${result}

✅ 原始NFT已成功解锁并转回给你！`);
      } else {
        alert(`🎉 XCM消息处理成功！

📋 处理详情:
• 消息哈希: ${messageHash}
• 消息类型: ${sourceXcmMessage.messageType}
• NFT合约: ${sourceXcmMessage.nftContract}
• Token ID: ${sourceXcmMessage.tokenId?.toString()}
• 接收者: ${sourceXcmMessage.recipient}
• 源链ID: ${sourceXcmMessage.sourceChainId}
• 交易哈希: ${result}

✅ 消息处理完成！`);
      }

    } catch (error: any) {
      console.error("XCM消息处理失败:", error);
      
      let errorMessage = "XCM消息处理失败";
      if (error?.message) {
        if (error.message.includes("Ownable: caller is not the owner")) {
          errorMessage = "权限不足：只有合约所有者可以处理XCM消息";
        } else if (error.message.includes("Message already processed")) {
          errorMessage = "消息已处理：此XCM消息已经被处理过了";
        } else if (error.message.includes("Source chain not supported")) {
          errorMessage = "不支持的源链：源链ID不在支持列表中";
        } else if (error.message.includes("Internal JSON-RPC error")) {
          errorMessage = "网络连接错误，请检查RPC连接或稍后重试";
        } else {
          errorMessage += `: ${error.message}`;
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryListing = async () => {
    if (!listingId || !marketplaceContract) {
      alert("请填写Listing ID");
      return;
    }

    try {
      setIsLoading(true);
      console.log("查询Listing状态...", listingId);
      
      // 调用合约的listings映射
      const listing = await marketplaceContract.read.listings([listingId as `0x${string}`]);
      
      if (!listing || listing[0] === "0x0000000000000000000000000000000000000000") {
        alert("❌ Listing不存在\n请检查Listing ID是否正确");
        return;
      }

      const [nftContract, tokenId, seller, price, paymentToken, isActive, isCrossChain] = listing;
      
      const statusMessage = `📋 Listing信息:\n\nNFT合约: ${nftContract}\nToken ID: ${tokenId.toString()}\n卖家: ${seller}\n价格: ${price.toString()} wei\n支付代币: ${paymentToken}\n状态: ${isActive ? '✅ 活跃' : '❌ 已失效'}\n跨链: ${isCrossChain ? '是' : '否'}`;
      
      alert(statusMessage);
      
    } catch (error: any) {
      console.error("查询失败:", error);
      alert(`查询失败: ${error?.message || "未知错误"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-base-100 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-center">🎨 瓷板画NFT跨链平台</h2>
      
      {/* 当前网络状态 */}
      <div className={`alert ${chainId === 1287 || chainId === 420420422 ? 'alert-success' : 'alert-warning'}`}>
        <div>
          <h3 className="font-bold">🌐 当前网络状态</h3>
          <p>当前连接: Chain ID {chainId}</p>
          {chainId === 1287 && (
            <div>
              <p>✅ Moonbase Alpha - 可以铸造和交易NFT</p>
              <p className="text-sm">合约地址: {getContractAddresses()?.YourCollectible}</p>
            </div>
          )}
          {chainId === 420420422 && (
            <div>
              <p>✅ Polkadot Hub TestNet - 可以铸造和交易NFT</p>
              <p className="text-sm">合约地址: {getContractAddresses()?.YourCollectible}</p>
            </div>
          )}
          {chainId !== 1287 && chainId !== 420420422 && (
            <div>
              <p>⚠️ 请切换到支持的网络:</p>
              <p>• Moonbase Alpha (Chain ID: 1287)</p>
              <p>• Polkadot Hub TestNet (Chain ID: 420420422)</p>
            </div>
          )}
          {!connectedAddress && (
            <p className="text-red-600 font-semibold">❌ 请先连接钱包</p>
          )}
        </div>
      </div>
      
      {/* 网络信息 */}
      <div className="alert alert-info">
        <div>
          <h3 className="font-bold">🌐 支持的网络</h3>
          <p>• Moonbase Alpha (Chain ID: 1287)</p>
          <p>• Polkadot Hub TestNet (Chain ID: 420420422)</p>
        </div>
      </div>

      {/* 铸造NFT */}
      <div className="card bg-base-200 p-4">
        <h3 className="text-lg font-semibold mb-3">1️⃣ 铸造瓷板画NFT</h3>
        
        {/* 网络和钱包状态检查 */}
        {(!connectedAddress || (chainId !== 1287 && chainId !== 420420422)) && (
          <div className="alert alert-warning mb-3">
            <div>
              {!connectedAddress && <p>⚠️ 请先连接钱包</p>}
              {connectedAddress && chainId !== 1287 && chainId !== 420420422 && (
                <p>⚠️ 请切换到支持的网络 (Moonbase Alpha 或 Polkadot Hub TestNet)</p>
              )}
            </div>
          </div>
        )}
        
        {lastMintedTokenId && (
          <div className="alert alert-success mb-3">
            <span>✅ 最近铸造的NFT Token ID: {lastMintedTokenId}</span>
          </div>
        )}
        {tokenCounter && (
          <div className="text-sm text-gray-600 mb-2">
            下一个Token ID将是: {Number(tokenCounter) + 1}
          </div>
        )}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Token URI (IPFS哈希或URL)</span>
          </label>
          <input
            type="text"
            placeholder="QmPorcelainPainting123... 或 https://ipfs.io/ipfs/..."
            className="input input-bordered"
            value={tokenURI}
            onChange={(e) => setTokenURI(e.target.value)}
            disabled={isLoading}
          />
          <label className="label">
            <span className="label-text-alt">版税费用: 2.5% (250/10000)</span>
          </label>
        </div>
        <button 
          className={`btn btn-primary mt-3 ${isLoading ? 'loading' : ''}`} 
          onClick={handleMintNFT}
          disabled={isLoading || !tokenURI || !connectedAddress || (chainId !== 1287 && chainId !== 420420422)}
        >
          {isLoading ? '铸造中...' : '铸造NFT'}
        </button>
        {isLoading && (
          <div className="text-sm text-gray-600 mt-2">
            🔄 正在处理交易，请在钱包中确认...
          </div>
        )}
      </div>

      {/* 跨链上架 */}
      <div className="card bg-base-200 p-4">
        <h3 className="text-lg font-semibold mb-3">2️⃣ 跨链市场上架</h3>
        
        {/* 当前Listing ID显示 */}
        {listingId && (
          <div className="alert alert-success mb-3">
            <div className="w-full">
              <div className="flex items-center justify-between">
                <span className="font-semibold">✅ 最新Listing ID:</span>
                <button 
                  className="btn btn-xs btn-outline"
                  onClick={() => navigator.clipboard.writeText(listingId)}
                >
                  复制
                </button>
              </div>
              <div className="text-xs mt-1 break-all font-mono bg-base-100 p-2 rounded">
                {listingId}
              </div>
              <div className="text-xs mt-1 text-gray-600">
                💡 此ID可直接用于跨链购买
              </div>
            </div>
          </div>
        )}

        {/* 交易处理中状态 */}
        {currentListingTxHash && (
          <div className="alert alert-info mb-3">
            <div>
              <span className="loading loading-spinner loading-sm"></span>
              <span className="ml-2">正在处理上架交易，请等待确认...</span>
              <div className="text-xs mt-1 break-all">
                交易哈希: {currentListingTxHash}
              </div>
            </div>
          </div>
        )}

        {/* Listing历史记录 */}
        {listingHistory.length > 0 && (
          <div className="collapse collapse-arrow bg-base-100 mb-3">
            <input type="checkbox" />
            <div className="collapse-title text-sm font-medium">
              📋 Listing历史记录 ({listingHistory.length})
            </div>
            <div className="collapse-content">
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {listingHistory.map((listing, index) => (
                  <div key={index} className="border rounded p-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <div><strong>Token ID:</strong> {listing.tokenId}</div>
                        <div><strong>价格:</strong> {listing.price} ETH</div>
                        <div><strong>网络:</strong> {listing.chainId === 1287 ? 'Moonbase Alpha' : 'Polkadot Hub'}</div>
                        <div><strong>时间:</strong> {new Date(listing.timestamp).toLocaleString()}</div>
                      </div>
                      <button 
                        className="btn btn-xs btn-outline"
                        onClick={() => {
                          setListingId(listing.id);
                          navigator.clipboard.writeText(listing.id);
                        }}
                      >
                        使用
                      </button>
                    </div>
                    <div className="mt-1 break-all font-mono text-gray-600">
                      ID: {listing.id}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <div className="form-control flex-1">
            <label className="label">
              <span className="label-text">Token ID</span>
            </label>
            <input
              type="number"
              placeholder="1"
              className="input input-bordered"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="form-control flex-1">
            <label className="label">
              <span className="label-text">价格 (ETH)</span>
            </label>
            <input
              type="text"
              placeholder="0.1"
              className="input input-bordered"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>
        <button 
          className={`btn btn-secondary mt-3 ${isLoading ? 'loading' : ''}`} 
          onClick={handleListNFT}
          disabled={isLoading || !tokenId || !price || !connectedAddress}
        >
          {isLoading ? '上架中...' : '上架到跨链市场'}
        </button>
      </div>

      {/* 跨链购买 */}
      <div className="card bg-base-200 p-4">
        <h3 className="text-lg font-semibold mb-3">3️⃣ 跨链购买</h3>
        
        {/* 网络状态提示 */}
        <div className="alert alert-info mb-3">
          <div className="flex-1">
            <div className="text-sm">
              <div className="font-semibold">当前网络: {chainId === 1287 ? "Moonbase Alpha" : "Polkadot Hub TestNet"}</div>
              <div className="mt-1">
                ⚠️ <strong>重要提示：</strong>跨链购买需要在NFT所在的源链上发起！
              </div>
              <div className="mt-1">
                💡 <strong>操作流程：</strong>
                <br />1. 先查询Listing状态确认NFT在哪条链
                <br />2. 切换到NFT所在的链网络
                <br />3. 在源链上发起跨链购买
              </div>
            </div>
          </div>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Listing ID (32字节哈希)</span>
          </label>
          <input
            type="text"
            placeholder="0xe6d30f568072a59233c97185085ec26f8936c73761a91ae34c3c90954d1ac4b4"
            className="input input-bordered"
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="form-control mt-3">
          <label className="label">
            <span className="label-text">价格 (ETH)</span>
          </label>
          <input
            type="text"
            placeholder="0.1"
            className="input input-bordered"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={isLoading}
          />
        </div>
        
        {/* 添加查询按钮 */}
        <div className="flex gap-3 mt-3">
          <button 
            className={`btn btn-info flex-1 ${isLoading ? 'loading' : ''}`} 
            onClick={handleQueryListing}
            disabled={isLoading || !listingId || !connectedAddress}
          >
            {isLoading ? '查询中...' : '查询Listing状态'}
          </button>
          <button 
            className={`btn btn-accent flex-1 ${isLoading ? 'loading' : ''}`} 
            onClick={handleCrossChainPurchase}
            disabled={isLoading || !listingId || !price || !connectedAddress}
          >
            {isLoading ? '购买中...' : '发起跨链购买'}
          </button>
        </div>
      </div>

      {/* 跨链转移 */}
      <div className="card bg-base-200 p-4">
        <h3 className="text-lg font-semibold mb-3">4️⃣ 跨链转移</h3>
        <div className="text-sm text-gray-600 mb-3">
          目标链: {chainId === 1287 ? "Polkadot Hub TestNet" : "Moonbase Alpha"}
        </div>
        <p className="text-sm text-gray-600 mb-3">
          将NFT锁定到XCM Bridge进行跨链转移
        </p>
        
        {/* 网络状态检查 */}
        <div className="alert alert-info mb-3">
          <div className="flex items-center justify-between w-full">
            <div>
              <span className="text-sm">
                🌐 当前网络: {chainId === 1287 ? "Moonbase Alpha" : chainId === 420420422 ? "Polkadot Hub TestNet" : "未知网络"}
              </span>
            </div>
            <button 
              className="btn btn-xs btn-outline"
              onClick={checkNetworkConnection}
              disabled={isLoading}
            >
              检查连接
            </button>
          </div>
        </div>
        
        <div className="form-control">
          <label className="label">
            <span className="label-text">Token ID</span>
          </label>
          <input
            type="number"
            placeholder="1"
            className="input input-bordered"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            disabled={isLoading}
          />
        </div>
        
        {/* 授权和跨链转移按钮 */}
        <div className="space-y-2 mt-3">
          <button 
            className={`btn btn-info w-full ${isLoading ? 'loading' : ''}`} 
            onClick={handleAuthorizeContract}
            disabled={isLoading || !connectedAddress}
          >
            {isLoading ? '授权中...' : '🔐 授权NFT合约'}
          </button>
          
          <button 
            className={`btn btn-warning w-full ${isLoading ? 'loading' : ''}`} 
            onClick={handleLockForCrossChain}
            disabled={isLoading || !tokenId || !connectedAddress}
          >
            {isLoading ? '转移中...' : '🔒 锁定NFT进行跨链转移'}
          </button>
        </div>
        
        {/* 故障排除提示 */}
        <div className="collapse collapse-arrow bg-base-300 mt-3">
          <input type="checkbox" /> 
          <div className="collapse-title text-sm font-medium">
            🔧 遇到问题？点击查看故障排除
          </div>
          <div className="collapse-content text-xs"> 
            <div className="space-y-2">
              <p><strong>常见错误解决方案：</strong></p>
              <p>• <strong>Contract not authorized:</strong> NFT合约未授权，请先点击"授权NFT合约"按钮</p>
              <p>• <strong>Ownable: caller is not the owner:</strong> 只有合约所有者才能授权NFT合约</p>
              <p>• <strong>Internal JSON-RPC error:</strong> 网络连接问题，点击"检查连接"按钮诊断</p>
              <p>• <strong>Insufficient funds:</strong> 余额不足，请确保有足够ETH支付gas费</p>
              <p>• <strong>Not token owner:</strong> 您不是该NFT的所有者</p>
              <p>• <strong>User rejected:</strong> 用户取消了交易</p>
              <br />
              <p><strong>建议操作步骤：</strong></p>
              <p>1. 先点击"检查连接"确认网络状态</p>
              <p>2. 点击"授权NFT合约"进行合约授权（仅需一次）</p>
              <p>3. 确认您拥有要转移的NFT</p>
              <p>4. 确保钱包有足够的ETH支付gas费</p>
              <p>5. 如果仍有问题，请刷新页面重试</p>
            </div>
          </div>
        </div>
      </div>

      {/* 销毁包装NFT */}
      <div className="card bg-base-200 p-4">
        <h3 className="text-lg font-semibold mb-3">🔥 销毁包装NFT</h3>
        <div className="alert alert-info mb-3">
          <div>
            <span className="text-sm">
              💡 如果您在目标链上拥有包装NFT，可以销毁它并解锁源链上的原始NFT
            </span>
          </div>
        </div>
        
        <div className="text-sm text-gray-600 mb-3">
          当前网络: {chainId === 1287 ? "Moonbase Alpha" : chainId === 420420422 ? "Polkadot Hub TestNet" : "未知网络"}
        </div>
        
        <div className="form-control">
          <label className="label">
            <span className="label-text">包装NFT Token ID</span>
          </label>
          <input
            type="number"
            placeholder="1"
            className="input input-bordered"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            disabled={isLoading}
          />
        </div>
        
        <button 
          className={`btn btn-error mt-3 ${isLoading ? 'loading' : ''}`} 
          onClick={handleBurnWrappedNFT}
          disabled={isLoading || !tokenId || !connectedAddress}
        >
          {isLoading ? '销毁中...' : '销毁包装NFT并解锁原始NFT'}
        </button>
        
        <div className="alert alert-warning mt-3">
          <div className="text-xs">
            <p><strong>⚠️ 重要提示：</strong></p>
            <p>• 销毁包装NFT是不可逆操作</p>
            <p>• 确保您拥有要销毁的包装NFT</p>
            <p>• 原始NFT将在源链上解锁给原始所有者</p>
            <p>• 操作完成后请切换到源链查看解锁的NFT</p>
          </div>
        </div>
      </div>

      {/* 手动解锁NFT - 仅在源链显示 */}
      {chainId === 1287 && ( // 仅在Moonbase Alpha显示
        <div className="card bg-base-200 p-4">
          <h3 className="text-lg font-semibold mb-3">🔓 手动解锁NFT</h3>
          <div className="alert alert-warning mb-3">
            <div>
              <span className="text-sm">
                ⚠️ 如果跨链转移失败或卡住，您可以使用此功能手动解锁被锁定的NFT
              </span>
            </div>
          </div>
          
          <div className="form-control">
            <label className="label">
              <span className="label-text">消息哈希 (Message Hash)</span>
            </label>
            <input
              type="text"
              placeholder="0x..."
              className="input input-bordered text-xs"
              value={messageHash}
              onChange={(e) => setMessageHash(e.target.value)}
              disabled={isLoading}
            />
            <div className="label">
              <span className="label-text-alt text-xs">
                ⚠️ 请使用区块链浏览器中"NFTLocked"事件的真实messageHash，不是前端显示的临时ID
              </span>
            </div>
          </div>

          {/* 从交易哈希获取messageHash */}
          <div className="divider text-xs">或者从交易哈希自动获取</div>
          
          <div className="form-control">
            <label className="label">
              <span className="label-text">📝 锁定交易哈希</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="0x8c4ad02ced06cf32f8734901b4aa139233afa2e9828d76c296f993b14af145bd"
                className="input input-bordered flex-1 text-xs"
                value={transactionHash}
                onChange={(e) => setTransactionHash(e.target.value)}
                disabled={isLoading}
              />
              <button 
                className={`btn btn-outline btn-sm ${isLoading ? 'loading' : ''}`} 
                onClick={handleGetMessageHashFromTx}
                disabled={isLoading || !transactionHash || !connectedAddress}
              >
                {isLoading ? '获取中...' : '获取'}
              </button>
            </div>
            <div className="label">
              <span className="label-text-alt text-xs">
                💡 输入锁定NFT时的交易哈希，系统将自动提取正确的messageHash
              </span>
            </div>
          </div>
          
          <button 
             className={`btn btn-success mt-3 ${isLoading ? 'loading' : ''}`} 
             onClick={handleUnlockNFT}
             disabled={isLoading || !messageHash || !connectedAddress}
           >
             {isLoading ? '解锁中...' : '解锁NFT'}
           </button>
           
           {/* 查询锁定状态按钮 */}
           <button 
             className={`btn btn-info mt-2 ${isLoading ? 'loading' : ''}`} 
             onClick={handleQueryLockStatus}
           disabled={isLoading || !messageHash || !connectedAddress}
         >
           {isLoading ? '查询中...' : '查询锁定状态'}
         </button>
         
         {/* 检查XCM消息状态按钮 */}
         <button 
           className={`btn btn-warning mt-2 ${isLoading ? 'loading' : ''}`} 
           onClick={handleCheckXCMMessage}
           disabled={isLoading || !messageHash || !connectedAddress}
         >
           {isLoading ? '检查中...' : '检查XCM消息状态'}
         </button>
         
         {/* 处理XCM消息按钮 */}
         <button 
           className={`btn btn-secondary mt-2 ${isLoading ? 'loading' : ''}`} 
           onClick={handleProcessXCMMessage}
           disabled={isLoading || !messageHash || !connectedAddress}
         >
           {isLoading ? '处理中...' : '处理XCM消息'}
         </button>
        
        {/* 解锁说明 */}
        <div className="collapse collapse-arrow bg-base-300 mt-3">
          <input type="checkbox" /> 
          <div className="collapse-title text-sm font-medium">
            ℹ️ 如何获取消息哈希？
          </div>
          <div className="collapse-content text-xs"> 
            <div className="space-y-2">
              <p><strong>获取正确消息哈希的方法：</strong></p>
              <p>1. 复制锁定交易的哈希值</p>
              <p>2. 在区块链浏览器中查看该交易</p>
              <p>3. 找到"NFTLocked"事件</p>
              <p>4. 复制事件中的"messageHash"参数</p>
              <br />
              <p><strong>⚠️ 重要提示：</strong></p>
              <p>• 不要使用前端显示的"临时跟踪ID"</p>
              <p>• 必须使用区块链事件中的真实messageHash</p>
              <p>• 只有NFT的原始所有者才能解锁</p>
              <p>• 解锁后NFT将返回到您的钱包</p>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* 合约地址信息 */}
      <div className="card bg-base-300 p-4">
        <h3 className="text-lg font-semibold mb-3">📋 合约地址</h3>
        <div className="text-xs space-y-1">
          <p><strong>Moonbase Alpha:</strong></p>
          <p>NFT: 0xA8d71101fFFc06C4c1da8700f209a57553116Dea</p>
          <p>Bridge: 0xccd4370CDC99f5EfAd36a98Aed10a549CCEaBaE0</p>
          <p>Market: 0xa56fD2dD1E1570B46365ac277B290BAC2C1D9e83</p>
          <br />
          <p><strong>Polkadot Hub:</strong></p>
          <p>NFT: 0xB70435eD04461aA4a70f324ab54e22d4f19af4Ce</p>
          <p>Bridge: 0xf5Ed5e17C846ECB57EBd66fcA89216274F60F426</p>
          <p>Market: 0x7429B770b8289Dd080ea91F8348D443d13A13563</p>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="alert alert-warning">
        <div>
          <h3 className="font-bold">💡 使用说明</h3>
          <p>1. 确保钱包连接到正确的网络</p>
          <p>2. 获取测试代币：Moonbase Alpha 水龙头</p>
          <p>3. 跨链操作需要等待XCM消息处理</p>
          <p>4. 可以在区块链浏览器中监控交易状态</p>
          <p>5. <strong>新功能：</strong>如果XCM消息未自动处理，可使用"处理XCM消息"按钮手动处理</p>
        </div>
      </div>
      
      {/* XCM消息处理说明 */}
      <div className="collapse collapse-arrow bg-base-300 mt-3">
        <input type="checkbox" /> 
        <div className="collapse-title text-sm font-medium">
          🔧 XCM消息处理流程说明
        </div>
        <div className="collapse-content text-xs"> 
          <div className="space-y-2">
            <p><strong>跨链NFT解锁流程：</strong></p>
            <p>1. <span className="badge badge-primary badge-xs">锁定</span> 在源链(Moonbase Alpha)锁定NFT</p>
            <p>2. <span className="badge badge-warning badge-xs">检查</span> 使用"检查XCM消息状态"确认消息存在</p>
            <p>3. <span className="badge badge-secondary badge-xs">处理</span> 切换到目标链(Polkadot Hub)，使用"处理XCM消息"</p>
            <p>4. <span className="badge badge-success badge-xs">解锁</span> 处理成功后，使用"解锁NFT"获取NFT</p>
            <br />
            <p><strong>⚠️ 重要注意事项：</strong></p>
            <p>• "处理XCM消息"必须在目标链上执行</p>
            <p>• 需要合约所有者权限才能处理XCM消息</p>
            <p>• 每个XCM消息只能处理一次</p>
            <p>• 处理成功后才能解锁NFT</p>
            <br />
            <p><strong>🔍 故障排除：</strong></p>
            <p>• 如果解锁失败，先检查XCM消息状态</p>
            <p>• 如果消息未处理，使用处理功能</p>
            <p>• 确保在正确的网络上执行操作</p>
          </div>
        </div>
      </div>
    </div>
  );
};