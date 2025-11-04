"use client";

import {
  useReadContract,
  useWriteContract,
  useSendTransaction,
  useAccount,
  useChainId,
} from "wagmi";
import { formatEther, createPublicClient, http } from "viem";
import {
  getContractAddress,
  stakingContractAbi as StakingContractAbi,
  vDOTAbi,
  votingTicketAbi as VotingTicketAbi,
} from "@/config/contracts";
import { getChainById } from "@/config/chains";

/**
 * 用户抵押信息
 */
export interface StakeInfo {
  amount: bigint;
  votingPeriodId: bigint;
  startTime: bigint;
  ticketsMinted: bigint;
  active: boolean;
}

/**
 * 抵押合约交互 Hook
 */
export function useStakingContract() {
  const chainId = useChainId();
  const { address } = useAccount();

  const stakingContractAddress = getContractAddress(chainId, "StakingContract");
  const vDOTAddress = getContractAddress(chainId, "vDOT");
  const votingTicketAddress = getContractAddress(chainId, "VotingTicket");

  // 写入合约方法
  const {
    writeContract,
    data: txHash,
    isPending,
    error: writeError,
  } = useWriteContract();
  const { isPending: isSending, error: sendError } = useSendTransaction();

  // 读取用户 vDOT 余额
  const { data: vDOTBalance } = useReadContract({
    address: vDOTAddress,
    abi: vDOTAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // 读取用户对抵押合约的授权额度
  const { data: allowance } = useReadContract({
    address: vDOTAddress,
    abi: vDOTAbi,
    functionName: "allowance",
    args:
      address && stakingContractAddress
        ? [address, stakingContractAddress]
        : undefined,
  });

  // 读取用户抵押记录数量
  const { data: stakeCount } = useReadContract({
    address: stakingContractAddress,
    abi: StakingContractAbi,
    functionName: "getUserStakeCount",
    args: address ? [address] : undefined,
  });

  // 读取用户投票券余额
  const { data: ticketBalance } = useReadContract({
    address: votingTicketAddress,
    abi: VotingTicketAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // 读取总抵押量
  const { data: totalStaked } = useReadContract({
    address: stakingContractAddress,
    abi: StakingContractAbi,
    functionName: "totalStaked",
  });

  // 抵押方法
  const stake = async (amount: bigint): Promise<void> => {
    if (!address) {
      throw new Error("请先连接钱包");
    }

    try {
      // 首先检查授权额度
      if (!allowance || (allowance as bigint) < amount) {
        // 需要先授权
        console.log("需要先授权 vDOT 代币...");
        writeContract({
          address: vDOTAddress,
          abi: vDOTAbi,
          functionName: "approve",
          args: [stakingContractAddress, amount],
        });

        // 等待授权完成（这里简化处理，实际应该监听交易确认）
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // 执行抵押
      console.log(`开始抵押 ${formatEther(amount)} vDOT，锁定到投票期开奖...`);
      writeContract({
        address: stakingContractAddress,
        abi: StakingContractAbi,
        functionName: "stake",
        args: [amount],
      });
    } catch (error) {
      console.error("抵押失败:", error);
      throw error;
    }
  };

  // 解除抵押方法
  const unstake = async (stakeIndex: number) => {
    if (!address) {
      throw new Error("请先连接钱包");
    }

    try {
      writeContract({
        address: stakingContractAddress,
        abi: StakingContractAbi,
        functionName: "unstake",
        args: [BigInt(stakeIndex)],
      });
    } catch (error) {
      console.error("解除抵押失败:", error);
      throw error;
    }
  };

  // 计算投票券数量（1:1比例）
  const calculatedTickets = (amount: bigint) => {
    return amount; // 新合约是1:1比例
  };

  // 创建公共客户端用于读取合约数据
  const publicClient = createPublicClient({
    chain: getChainById(chainId),
    transport: http(),
  });

  // 获取用户抵押历史
  const getUserStakingHistory = async () => {
    if (!address || !stakeCount) {
      return [];
    }

    const stakeCountNum = Number(stakeCount);
    const history = [];

    for (let i = 0; i < stakeCountNum; i++) {
      try {
        const stakeInfo = (await publicClient.readContract({
          address: stakingContractAddress,
          abi: StakingContractAbi,
          functionName: "getUserStake",
          args: [address, BigInt(i)],
        })) as StakeInfo;

        // 检查投票期是否已开奖
        const canUnstake = (await publicClient.readContract({
          address: stakingContractAddress,
          abi: StakingContractAbi,
          functionName: "canUnstake",
          args: [address, BigInt(i)],
        })) as boolean;

        history.push({
          index: i,
          amount: formatEther(stakeInfo.amount),
          votingPeriodId: Number(stakeInfo.votingPeriodId),
          startTime: new Date(Number(stakeInfo.startTime) * 1000),
          ticketsMinted: formatEther(stakeInfo.ticketsMinted),
          active: stakeInfo.active,
          canUnstake,
        });
      } catch (error) {
        console.error(`Error fetching stake ${i}:`, error);
      }
    }

    // 按时间排序（最新的在前）
    return history.sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime(),
    );
  };

  return {
    // 数据
    vDOTBalance: vDOTBalance ?? BigInt(0),
    allowance: allowance ?? BigInt(0),
    stakeCount: stakeCount ?? BigInt(0),
    totalStaked: totalStaked ?? BigInt(0),
    ticketBalance: ticketBalance ?? BigInt(0),

    // 方法
    stake,
    unstake,
    calculatedTickets,
    getUserStakingHistory,

    // 状态
    isPending: isPending ?? isSending,
    error: writeError ?? sendError,
    txHash: txHash ?? null, // Add transaction hash to return

    // 合约地址
    stakingContractAddress,
    vDOTAddress,
    votingTicketAddress,
  };
}

/**
 * 获取用户特定抵押记录的 Hook
 */
export function useUserStake(
  userAddress: string | undefined,
  stakeIndex: number,
) {
  const chainId = useChainId();
  const stakingContractAddress = getContractAddress(chainId, "StakingContract");

  const {
    data: stakeInfo,
    isLoading,
    error,
  } = useReadContract({
    address: stakingContractAddress,
    abi: StakingContractAbi,
    functionName: "getUserStake",
    args:
      userAddress && stakeIndex >= 0
        ? [userAddress, BigInt(stakeIndex)]
        : undefined,
  });

  const { data: canUnstake } = useReadContract({
    address: stakingContractAddress,
    abi: StakingContractAbi,
    functionName: "canUnstake",
    args:
      userAddress && stakeIndex >= 0
        ? [userAddress, BigInt(stakeIndex)]
        : undefined,
  });

  return {
    stakeInfo: stakeInfo as StakeInfo | undefined,
    canUnstake: canUnstake ?? false,
    isLoading,
    error,
  };
}
