import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatEther, createPublicClient, http } from "viem";
import {
  getContractAddress,
  votingContractAbi,
  votingTicketAbi,
} from "@/config/contracts";
import { useChainId } from "wagmi";
import { getChainById } from "@/config/chains";

// Types for contract responses
interface UserVote {
  predictedYear: bigint;
  ticketsUsed: bigint;
  votingPeriodId: bigint;
  timestamp: bigint;
  claimed: boolean;
}

type VotingPeriod = [bigint, bigint, boolean, boolean, bigint]; // [startTime, endTime, active, resolved, correctAnswerYear]

export function useVotingContract() {
  const { address } = useAccount();
  const chainId = useChainId();

  // Contract addresses
  const votingContractAddress = getContractAddress(chainId, "VotingContract");
  const votingTicketAddress = getContractAddress(chainId, "VotingTicket");

  // Create public client for reading contract data
  const publicClient = createPublicClient({
    chain: getChainById(chainId),
    transport: http(),
  });

  // Read user's voting ticket balance
  const { data: ticketBalance, refetch: refetchTicketBalance } =
    useReadContract({
      address: votingTicketAddress,
      abi: votingTicketAbi,
      functionName: "balanceOf",
      args: address ? [address] : undefined,
      query: {
        enabled: !!address,
        refetchInterval: 5000, // 每5秒自动刷新
        refetchOnWindowFocus: true, // 窗口聚焦时刷新
      },
    });

  // Read user's vote count
  const { data: userVoteCount } = useReadContract({
    address: votingContractAddress,
    abi: votingContractAbi,
    functionName: "getUserVoteCount",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
    },
  });

  // Read current voting period
  const { data: currentVotingPeriod } = useReadContract({
    address: votingContractAddress,
    abi: votingContractAbi,
    functionName: "currentVotingPeriodId",
    query: {
      enabled: !!address,
    },
  });

  // Read voting period info
  const { data: votingPeriodInfo } = useReadContract({
    address: votingContractAddress,
    abi: votingContractAbi,
    functionName: "votingPeriods",
    args: currentVotingPeriod ? [currentVotingPeriod] : undefined,
    query: {
      enabled: !!currentVotingPeriod,
    },
  });

  // Check allowance for voting tickets
  const { data: allowance } = useReadContract({
    address: votingTicketAddress,
    abi: votingTicketAbi,
    functionName: "allowance",
    args:
      address && votingContractAddress
        ? [address, votingContractAddress]
        : undefined,
    query: {
      enabled: !!address && !!votingContractAddress,
    },
  });

  // Write contract for voting ticket approval
  const {
    writeContract: approveVotingTickets,
    writeContractAsync: approveVotingTicketsAsync,
    data: approvalTxHash,
    isPending: isApproving,
    error: approvalError,
  } = useWriteContract();

  // Write contract for voting
  const {
    writeContract: vote,
    writeContractAsync: voteAsync,
    data: voteTxHash,
    isPending: isVoting,
    error: voteError,
  } = useWriteContract();

  // Wait for approval transaction
  const { data: approvalReceipt, isLoading: isConfirmingApproval } =
    useWaitForTransactionReceipt({
      hash: approvalTxHash,
    });

  // Wait for vote transaction
  const { data: voteReceipt, isLoading: isConfirmingVote } =
    useWaitForTransactionReceipt({
      hash: voteTxHash,
    });

  // Approval function
  const approve = async (amount: bigint) => {
    if (!address || !votingContractAddress) {
      throw new Error("请先连接钱包");
    }

    approveVotingTickets({
      address: votingTicketAddress,
      abi: votingTicketAbi,
      functionName: "approve",
      args: [votingContractAddress, amount],
    });
  };

  // Vote function
  const submitVote = async (predictedYear: number, ticketsToUse: bigint) => {
    if (!address) {
      throw new Error("请先连接钱包");
    }

    if (!votingContractAddress) {
      throw new Error("投票合约地址未配置");
    }

    // Check if we have enough allowance
    const currentAllowance = (allowance as bigint) || 0n;
    if (currentAllowance < ticketsToUse) {
      throw new Error("投票券授权不足，请先授权");
    }

    vote({
      address: votingContractAddress,
      abi: votingContractAbi,
      functionName: "vote",
      args: [BigInt(predictedYear), ticketsToUse],
    });
  };

  // Complete voting flow (approve if needed, then vote)
  const completeVote = async (
    predictedYear: number,
    ticketsToUse: bigint,
    longTermApproval = false,
  ) => {
    if (!address) {
      throw new Error("请先连接钱包");
    }

    const currentAllowance = (allowance as bigint) || 0n;

    try {
      // Step 1: Check if we need approval
      if (currentAllowance < ticketsToUse) {
        console.log("🔐 需要授权投票券，开始授权流程...");

        // Calculate approval amount
        let approvalAmount: bigint;
        if (longTermApproval) {
          // 长期授权：使用最大uint256值，相当于无限授权
          approvalAmount = BigInt(
            "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
          );
          console.log("🔄 设置长期授权（无限额度）");
        } else {
          // 短期授权：只授权需要的数量
          approvalAmount = ticketsToUse;
          console.log("🔒 设置短期授权（仅当前投票数量）");
        }

        // Execute approval and get transaction hash directly
        const approvalTxHash = await approveVotingTicketsAsync({
          address: votingTicketAddress,
          abi: votingTicketAbi,
          functionName: "approve",
          args: [votingContractAddress, approvalAmount],
        });

        console.log("📝 授权交易已提交，哈希:", approvalTxHash);

        // Wait for approval to be mined
        console.log("⏳ 等待授权交易确认...");

        try {
          const approvalReceipt = await publicClient.waitForTransactionReceipt({
            hash: approvalTxHash,
            timeout: 30000, // 30 seconds
          });

          if (approvalReceipt.status === "success") {
            console.log("✅ 投票券授权成功，开始投票...");
          } else {
            throw new Error("投票券授权失败");
          }
        } catch (approvalWaitError) {
          console.error("等待授权交易失败:", approvalWaitError);
          throw new Error("授权超时，请重试");
        }
      }

      // Step 2: Execute vote
      console.log("🗳️ 开始执行投票...");

      // Execute the vote and get transaction hash directly
      const txHash = await voteAsync({
        address: votingContractAddress,
        abi: votingContractAbi,
        functionName: "vote",
        args: [BigInt(predictedYear), ticketsToUse],
      });

      console.log("📝 投票交易已提交，哈希:", txHash);

      // Wait for the transaction to be mined
      console.log("⏳ 等待投票交易确认...");

      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
          timeout: 30000, // 30 seconds
        });

        if (receipt.status === "success") {
          console.log("✅ 投票成功完成！");
        } else {
          throw new Error("投票交易失败");
        }
      } catch (waitError) {
        console.error("等待投票交易失败:", waitError);
        throw new Error("投票超时，请重试");
      }
    } catch (error) {
      console.error("投票流程失败:", error);
      throw error;
    }
  };

  // Get user voting history
  const getUserVotingHistory = async () => {
    console.log(
      "🔍 getUserVotingHistory called - address:",
      address,
      "userVoteCount:",
      userVoteCount?.toString(),
    );

    if (!address || !userVoteCount) {
      console.log("❌ No address or vote count, returning empty array");
      return [];
    }

    const voteCount = Number(userVoteCount);
    console.log("📊 Processing", voteCount, "votes for address:", address);
    const history = [];

    for (let i = 0; i < voteCount; i++) {
      try {
        const vote = (await publicClient.readContract({
          address: votingContractAddress,
          abi: votingContractAbi,
          functionName: "getUserVote",
          args: [address, BigInt(i)],
        })) as UserVote;

        console.log(`  Vote data for index ${i}:`, vote);

        // Check if vote data is valid
        if (!vote || typeof vote !== "object" || !vote.predictedYear) {
          console.error(`Invalid vote data for index ${i}:`, vote);
          continue;
        }

        const votingPeriodId = vote.votingPeriodId;
        if (!votingPeriodId) {
          console.error(`No votingPeriodId for vote ${i}:`, vote);
          continue;
        }

        // Get voting period info
        const period = (await publicClient.readContract({
          address: votingContractAddress,
          abi: votingContractAbi,
          functionName: "votingPeriods",
          args: [votingPeriodId],
        })) as VotingPeriod;

        console.log(
          `  Period data for votingPeriodId ${votingPeriodId}:`,
          period,
        );

        // Check if period data is valid
        if (!period || period.length < 5) {
          console.error(
            `Invalid period data for votingPeriodId ${votingPeriodId}:`,
            period,
          );
          continue;
        }

        // Format the vote data
        const voteData = {
          index: i,
          predictedYear: Number(vote.predictedYear), // predictedYear
          ticketsUsed: formatEther(vote.ticketsUsed), // ticketsUsed
          votingPeriodId: Number(vote.votingPeriodId), // votingPeriodId
          timestamp: new Date(Number(vote.timestamp) * 1000), // timestamp
          claimed: vote.claimed, // claimed
          periodStartTime: new Date(Number(period[0]) * 1000),
          periodEndTime: new Date(Number(period[1]) * 1000),
          periodActive: period[2],
          periodResolved: period[3],
          correctAnswerYear: Number(period[4]),
        };

        history.push(voteData);
      } catch (error) {
        console.error(`Error fetching vote ${i}:`, error);
      }
    }

    // Sort by timestamp (newest first)
    return history.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  };

  return {
    // Data
    ticketBalance: (ticketBalance as bigint) || 0n,
    currentVotingPeriod: (currentVotingPeriod as bigint) || 0n,
    votingPeriodInfo,
    allowance: (allowance as bigint) || 0n,
    userVoteCount: (userVoteCount as bigint) || 0n,

    // Transaction hashes
    approvalTxHash,
    voteTxHash,

    // Loading states
    isApproving,
    isVoting,
    isConfirmingApproval,
    isConfirmingVote,

    // Error states
    approvalError,
    voteError,

    // Receipts
    approvalReceipt,
    voteReceipt,

    // Functions
    approve,
    submitVote,
    completeVote,
    refetchTicketBalance,
    getUserVotingHistory,

    // Computed values
    isPending:
      isApproving || isVoting || isConfirmingApproval || isConfirmingVote,
    hasError: !!approvalError || !!voteError,
    error: approvalError ?? voteError,
  };
}
