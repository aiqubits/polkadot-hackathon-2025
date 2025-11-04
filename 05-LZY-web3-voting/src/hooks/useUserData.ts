"use client";

import {
  useReadContract,
  useAccount,
  useChainId,
  useBalance,
  useWatchContractEvent,
} from "wagmi";
import { useMemo, useState, useEffect } from "react";
import {
  getContractAddress,
  vDOTAbi,
  votingTicketAbi as VotingTicketAbi,
  stakingContractAbi as StakingContractAbi,
  votingContractAbi as VotingContractAbi,
} from "@/config/contracts";

/**
 * Format large number display
 */
function formatNumber(value: bigint, decimals = 18): string {
  const divisor = BigInt(10 ** decimals);
  const wholePart = value / divisor;
  const fractionalPart = value % divisor;

  // Convert to number for formatting
  const wholeNumber = Number(wholePart);
  const fractionalNumber = Number(fractionalPart) / Number(divisor);
  const totalNumber = wholeNumber + fractionalNumber;

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(totalNumber);
}

/**
 * User data interface
 */
export interface UserData {
  // Native token balance (DOT)
  nativeBalance: string;
  // vDOT balance
  vDOTBalance: string;
  // Total staked amount
  stakedAmount: string;
  // Voting power (ticket count)
  votingPower: string;
  // Ticket balance
  ticketBalance: string;
  // Whether user has voted
  hasVoted: boolean;
  // Total minted vDOT (vDOT balance + staked amount)
  totalVDOT: string;
  // Loading state
  isLoading: boolean;
  // Error state
  hasError: boolean;
  // Error message
  error: Error | null;
}

/**
 * Hook to get user personal data
 */
export function useUserData(): UserData {
  const chainId = useChainId();
  const { address } = useAccount();

  // Get contract addresses
  const vDOTAddress = getContractAddress(chainId, "vDOT");
  const votingTicketAddress = getContractAddress(chainId, "VotingTicket");
  const stakingContractAddress = getContractAddress(chainId, "StakingContract");
  const votingContractAddress = getContractAddress(chainId, "VotingContract");

  // Get staking details
  const stakeDetails = useUserStakeDetails();

  // Read native token balance (DOT)
  const { data: nativeBalance } = useBalance({
    address,
    query: {
      refetchInterval: 10000, // Refresh every 10 seconds
    },
  });

  // Read user vDOT balance
  const {
    data: vDOTBalance,
    isLoading: isLoadingVDOT,
    error: vDOTError,
  } = useReadContract({
    address: vDOTAddress,
    abi: vDOTAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      refetchInterval: 10000,
    },
  });

  // Read user ticket balance
  const {
    data: ticketBalance,
    isLoading: isLoadingTickets,
    error: ticketError,
  } = useReadContract({
    address: votingTicketAddress,
    abi: VotingTicketAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      refetchInterval: 10000,
    },
  });

  // Read user staking record count
  const {
    data: _stakeCount,
    isLoading: isLoadingStakeCount,
    error: stakeCountError,
  } = useReadContract({
    address: stakingContractAddress,
    abi: StakingContractAbi,
    functionName: "getUserStakeCount",
    args: address ? [address] : undefined,
    query: {
      refetchInterval: 10000,
    },
  });

  // Read user vote record count
  const {
    data: voteCount,
    isLoading: isLoadingVoteCount,
    error: voteCountError,
    refetch: refetchVoteCount,
  } = useReadContract({
    address: votingContractAddress,
    abi: VotingContractAbi,
    functionName: "getUserVoteCount",
    args: address ? [address] : undefined,
    query: {
      refetchInterval: 10000,
    },
  });

  // Watch vDOT transfer events
  useWatchContractEvent({
    address: vDOTAddress,
    abi: vDOTAbi,
    eventName: "Transfer",
    args: {
      from: address, // Watch transfers related to user
    },
    onLogs: (_logs) => {
      console.log("Detected vDOT transfer event, refreshing data");
      // When transfer occurs, refetch data
      // Can trigger refetch here, but useReadContract already has refetchInterval, will auto-update
    },
  });

  // Watch staking events
  useWatchContractEvent({
    address: stakingContractAddress,
    abi: StakingContractAbi,
    eventName: "Staked",
    args: {
      user: address,
    },
    onLogs: (_logs) => {
      console.log("Detected staking event, refreshing data");
      // When staking occurs, refetch data
      // Can trigger refetch here, but useReadContract already has refetchInterval, will auto-update
    },
  });

  // Watch voting events
  useWatchContractEvent({
    address: votingContractAddress,
    abi: VotingContractAbi,
    eventName: "Voted",
    args: {
      voter: address,
    },
    onLogs: (_logs) => {
      console.log("Detected voting event, refreshing data");
      // When vote occurs, refetch data
      void refetchVoteCount();
    },
  });

  // Calculate user data
  const userData = useMemo(() => {
    const isLoading =
      isLoadingVDOT ??
      isLoadingTickets ??
      isLoadingStakeCount ??
      isLoadingVoteCount ??
      stakeDetails.isLoading;

    const hasError = Boolean(
      vDOTError ?? ticketError ?? stakeCountError ?? voteCountError,
    );

    const error = vDOTError ?? ticketError ?? stakeCountError ?? voteCountError;

    // If wallet not connected, return default values
    if (!address) {
      return {
        nativeBalance: "0",
        vDOTBalance: "0",
        stakedAmount: "0",
        votingPower: "0",
        ticketBalance: "0",
        hasVoted: false,
        totalVDOT: "0",
        isLoading: false,
        hasError: false,
        error: null,
      };
    }

    // If loading or error, return loading state
    if (isLoading || hasError) {
      return {
        nativeBalance: "0",
        vDOTBalance: "0",
        stakedAmount: "0",
        votingPower: "0",
        ticketBalance: "0",
        hasVoted: false,
        totalVDOT: "0",
        isLoading,
        hasError,
        error,
      };
    }

    // Format data
    const formattedNativeBalance = nativeBalance
      ? formatNumber(nativeBalance.value, nativeBalance.decimals)
      : "0";

    const formattedVDOTBalance = vDOTBalance
      ? formatNumber(vDOTBalance as bigint)
      : "0";

    const formattedTicketBalance = ticketBalance
      ? formatNumber(ticketBalance as bigint)
      : "0";

    // Use real staking data
    const formattedStakedAmount = formatNumber(stakeDetails.totalStaked);
    const formattedVotingPower = formatNumber(stakeDetails.totalVotingPower);

    // Calculate total minted vDOT (vDOT balance + staked amount)
    const totalVDOTValue =
      (vDOTBalance ? (vDOTBalance as bigint) : BigInt(0)) +
      stakeDetails.totalStaked;
    const formattedTotalVDOT = formatNumber(totalVDOTValue);

    // Check if user has voted
    const hasVoted = voteCount ? Number(voteCount) > 0 : false;

    return {
      nativeBalance: formattedNativeBalance,
      vDOTBalance: formattedVDOTBalance,
      stakedAmount: formattedStakedAmount,
      votingPower: formattedVotingPower,
      ticketBalance: formattedTicketBalance,
      hasVoted,
      totalVDOT: formattedTotalVDOT,
      isLoading: false,
      hasError: false,
      error: null,
    };
  }, [
    address,
    nativeBalance,
    vDOTBalance,
    ticketBalance,
    voteCount,
    stakeDetails,
    isLoadingVDOT,
    isLoadingTickets,
    isLoadingStakeCount,
    isLoadingVoteCount,
    vDOTError,
    ticketError,
    stakeCountError,
    voteCountError,
  ]);

  return userData;
}

/**
 * Hook to get user staking details
 * Used to calculate real total staked amount and voting power
 */
export function useUserStakeDetails() {
  const chainId = useChainId();
  const { address } = useAccount();
  const stakingContractAddress = getContractAddress(chainId, "StakingContract");
  const [stakeDetails, setStakeDetails] = useState({
    totalStaked: BigInt(0),
    totalVotingPower: BigInt(0),
    activeStakes: 0,
    isLoading: false,
  });

  // Read user staking record count
  const { data: stakeCount, refetch: refetchStakeCount } = useReadContract({
    address: stakingContractAddress,
    abi: StakingContractAbi,
    functionName: "getUserStakeCount",
    args: address ? [address] : undefined,
    query: {
      refetchInterval: 10000,
    },
  });

  // Calculate staking details
  useEffect(() => {
    const fetchStakeDetails = async () => {
      if (!address || !stakeCount || Number(stakeCount) === 0) {
        setStakeDetails({
          totalStaked: BigInt(0),
          totalVotingPower: BigInt(0),
          activeStakes: 0,
          isLoading: false,
        });
        return;
      }

      setStakeDetails((prev) => ({ ...prev, isLoading: true }));

      try {
        // Create public client
        const { createPublicClient, http } = await import("viem");
        const { getChainById } = await import("@/config/chains");

        const client = createPublicClient({
          chain: getChainById(chainId),
          transport: http(),
        });

        // Iterate through all staking records
        const stakePromises = [];
        for (let i = 0; i < Number(stakeCount); i++) {
          stakePromises.push(
            client.readContract({
              address: stakingContractAddress,
              abi: StakingContractAbi,
              functionName: "getUserStake",
              args: [address, BigInt(i)],
            }),
          );
        }

        // Wait for all staking records to be read
        const stakes = await Promise.all(stakePromises);

        let totalStaked = BigInt(0);
        let totalVotingPower = BigInt(0);
        let activeStakes = 0;

        stakes.forEach((stake: unknown) => {
          const stakeData = stake as {
            active: boolean;
            amount: bigint;
            ticketsMinted: bigint;
          };
          if (stakeData?.active) {
            totalStaked += stakeData.amount;
            totalVotingPower += stakeData.ticketsMinted;
            activeStakes++;
          }
        });

        setStakeDetails({
          totalStaked,
          totalVotingPower,
          activeStakes,
          isLoading: false,
        });
      } catch (error) {
        console.error("Failed to fetch staking details:", error);
        setStakeDetails({
          totalStaked: BigInt(0),
          totalVotingPower: BigInt(0),
          activeStakes: 0,
          isLoading: false,
        });
      }
    };

    void fetchStakeDetails();
  }, [address, stakeCount, stakingContractAddress, chainId]);

  return {
    ...stakeDetails,
    refetch: refetchStakeCount,
  };
}
