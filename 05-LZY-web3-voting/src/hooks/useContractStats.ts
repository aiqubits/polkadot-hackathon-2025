"use client";

import { useEffect, useState } from "react";
import { createPublicClient, http, type PublicClient } from "viem";
import { useChainId } from "wagmi";
import { getChainById } from "@/config/chains";
import {
  getContractAddress,
  vDOTAbi,
  stakingContractAbi as StakingContractAbi,
} from "@/config/contracts";

/**
 * 格式化大数字显示
 */
function formatNumber(value: bigint, decimals = 18): string {
  const divisor = BigInt(10 ** decimals);
  const wholePart = value / divisor;
  const fractionalPart = value % divisor;

  // 转换为数字进行格式化
  const wholeNumber = Number(wholePart);
  const fractionalNumber = Number(fractionalPart) / Number(divisor);
  const totalNumber = wholeNumber + fractionalNumber;

  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(totalNumber);
}

/**
 * 获取链上统计数据
 * 使用公共客户端直接读取合约数据，不依赖钱包连接
 */
export function useContractStats() {
  const chainId = useChainId();
  const [stats, setStats] = useState({
    totalMinted: "0",
    totalStaked: "0",
    participantCount: "0",
    isLoading: true,
    hasError: false,
    error: null as Error | null,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        // 创建公共客户端连接到当前网络
        const client = createPublicClient({
          chain: getChainById(chainId),
          transport: http(),
        });

        // 获取合约地址
        const vDOTAddress = getContractAddress(chainId, "vDOT");
        const stakingContractAddress = getContractAddress(
          chainId,
          "StakingContract",
        );

        if (!isMounted) return;

        // 并行读取合约数据
        const [totalSupply, totalStaked] = await Promise.all([
          client.readContract({
            address: vDOTAddress,
            abi: vDOTAbi,
            functionName: "totalSupply",
          }),
          client.readContract({
            address: stakingContractAddress,
            abi: StakingContractAbi,
            functionName: "totalStaked",
          }),
        ]);

        if (!isMounted) return;

        // 从事件日志中获取参与地址数
        const participantCount = await getParticipantCount(
          client,
          stakingContractAddress,
        );

        setStats({
          totalMinted: formatNumber(totalSupply as bigint),
          totalStaked: formatNumber(totalStaked as bigint),
          participantCount,
          isLoading: false,
          hasError: false,
          error: null,
        });
      } catch (error) {
        if (!isMounted) return;

        console.error("读取合约数据失败:", error);
        setStats({
          totalMinted: "0",
          totalStaked: "0",
          participantCount: "0",
          isLoading: false,
          hasError: true,
          error: error as Error,
        });
      }
    };

    fetchStats().catch(console.error);

    // 设置定时刷新
    const interval = setInterval(() => {
      fetchStats().catch(console.error);
    }, 10000); // 每10秒刷新一次

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [chainId]);

  return stats;
}

/**
 * 从事件日志获取参与地址数
 */
async function getParticipantCount(
  client: PublicClient,
  stakingContractAddress: string,
): Promise<string> {
  try {
    // 获取当前区块号
    const currentBlock = await client.getBlockNumber();

    // Moonbase Alpha 限制单次查询 1024 个区块
    // 我们分批查询，每次查询 1000 个区块
    const BATCH_SIZE = 1000n;
    const uniqueUsers = new Set<string>();

    // 从最近的 10000 个区块开始查询（约 1-2 天的数据）
    // 如果需要更多历史数据，可以增加这个值
    const blocksToQuery = 10000n;
    const startBlock =
      currentBlock > blocksToQuery ? currentBlock - blocksToQuery : 0n;

    // 分批查询
    for (
      let fromBlock = startBlock;
      fromBlock <= currentBlock;
      fromBlock += BATCH_SIZE
    ) {
      const toBlock =
        fromBlock + BATCH_SIZE > currentBlock
          ? currentBlock
          : fromBlock + BATCH_SIZE;

      try {
        const logs = await client.getLogs({
          address: stakingContractAddress as `0x${string}`,
          event: {
            type: "event",
            name: "Staked",
            inputs: [
              { name: "user", type: "address", indexed: true },
              { name: "amount", type: "uint256", indexed: false },
              { name: "lockDuration", type: "uint256", indexed: false },
              { name: "ticketsMinted", type: "uint256", indexed: false },
            ],
          },
          fromBlock,
          toBlock,
        });

        // 统计唯一的用户地址
        logs.forEach((log) => {
          if (log?.args?.user) {
            uniqueUsers.add((log.args.user as string).toLowerCase());
          }
        });
      } catch (batchError) {
        console.warn(`查询区块 ${fromBlock} 到 ${toBlock} 失败:`, batchError);
        // 继续查询其他批次
      }
    }

    return uniqueUsers.size.toString();
  } catch (error) {
    console.error("获取参与地址数失败:", error);
    return "0";
  }
}
