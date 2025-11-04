"use client";

import { useState, useMemo } from "react";
import {
  useAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useChainId,
  useBalance,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { getContractAddress, vDOTAbi } from "@/config/contracts";

export function useMintingPage() {
  const { address } = useAccount();
  const chainId = useChainId();
  const [amount, setAmount] = useState("");
  const [redeemAmount, setRedeemAmount] = useState("");

  // 获取合约地址
  const vDOTAddress = getContractAddress(chainId, "vDOT");

  // 获取 DOT 余额
  const { data: balance } = useBalance({
    address,
    query: {
      refetchInterval: 5000,
    },
  });

  // 获取 vDOT 余额
  const { data: vDOTBalance } = useReadContract({
    address: vDOTAddress,
    abi: vDOTAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      refetchInterval: 5000,
    },
  });

  // 发送交易 (用于存入DOT)
  const {
    sendTransaction,
    isPending,
    error,
    data: hash,
  } = useSendTransaction({
    mutation: {
      onError: (error) => {
        console.error("Deposit transaction error:", error);
        // Log detailed error information for debugging
        if (error.message?.includes("circuit breaker")) {
          console.error("Circuit breaker error detected. Possible causes:");
          console.error("1. RPC node temporarily unavailable");
          console.error("2. Request rate limit exceeded");
          console.error("3. Network connectivity issues");
          console.error("4. Wallet provider RPC endpoint issues");
        }
      },
    },
  });

  // 写入合约 (用于redeem vDOT)
  const {
    writeContract: writeContractRedeem,
    isPending: isRedeemPending,
    error: redeemError,
    data: redeemHash,
  } = useWriteContract();

  // 等待交易确认
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // 等待redeem交易确认
  const { isLoading: isRedeemConfirming, isSuccess: isRedeemSuccess } =
    useWaitForTransactionReceipt({
      hash: redeemHash,
    });

  // 1:1 兑换，无需复杂计算
  const vDOTAmount = useMemo(() => {
    if (!amount || isNaN(parseFloat(amount))) {
      return "0";
    }
    return parseFloat(amount).toFixed(4);
  }, [amount]);

  // 存入 DOT 铸造 vDOT
  const deposit = () => {
    if (!address) {
      throw new Error("请先连接钱包");
    }

    if (!amount || parseFloat(amount) <= 0) {
      throw new Error("请输入有效的数量");
    }

    console.log("🚀 Starting deposit transaction...");
    console.log("  - Amount:", amount, "DOT");
    console.log("  - To address:", vDOTAddress);
    console.log("  - Chain ID:", chainId);

    try {
      sendTransaction({
        to: vDOTAddress,
        value: parseEther(amount), // 发送 DOT 到合约地址触发 receive 函数
      });
    } catch (error) {
      console.error("❌ Error in deposit function:", error);
      throw error;
    }
  };

  // Redeem vDOT 赎回 DOT
  const redeem = () => {
    if (!address) {
      throw new Error("请先连接钱包");
    }

    if (!redeemAmount || parseFloat(redeemAmount) <= 0) {
      throw new Error("请输入有效的数量");
    }

    writeContractRedeem({
      address: vDOTAddress,
      abi: vDOTAbi,
      functionName: "withdraw",
      args: [parseEther(redeemAmount)],
    });
  };

  // 格式化余额
  const formattedBalance = balance ? formatEther(balance.value) : "0";
  const formattedVDOTBalance = vDOTBalance
    ? formatEther(vDOTBalance as bigint)
    : "0";

  return {
    // 铸造相关
    amount,
    setAmount,
    balance: formattedBalance,
    vDOTAmount,
    deposit,
    isPending: isPending || isConfirming,
    isSuccess,
    error,

    // Redeem相关
    redeemAmount,
    setRedeemAmount,
    vDOTBalance: formattedVDOTBalance,
    redeem,
    isRedeemPending: isRedeemPending || isRedeemConfirming,
    isRedeemSuccess,
    redeemError,

    vDOTAddress,
  };
}
