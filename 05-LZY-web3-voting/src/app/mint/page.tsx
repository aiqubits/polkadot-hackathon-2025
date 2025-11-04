"use client";

import { useMintingPage } from "@/hooks/useMintingPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccount } from "wagmi";
import Link from "next/link";

export default function MintPage() {
  const { address } = useAccount();
  const {
    amount,
    setAmount,
    balance,
    vDOTAmount,
    deposit,
    isPending,
    isSuccess,
    error,
    redeemAmount,
    setRedeemAmount,
    vDOTBalance,
    redeem,
    isRedeemPending,
    isRedeemSuccess,
    redeemError,
  } = useMintingPage();

  if (!address) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
          <h1 className="mb-4 text-3xl font-bold text-white">
            Deposit DOT to Mint vDOT
          </h1>
          <p className="mb-6 text-gray-400">
            Please connect wallet first to start depositing DOT and minting vDOT
          </p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 px-6 py-3 text-white transition-all hover:from-cyan-600 hover:to-purple-600"
          >
            Return to Home to Connect Wallet
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-16">
      {/* Title Area */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Deposit DOT to Mint vDOT
          </h1>
          <p className="mt-2 text-gray-400">
            Directly deposit DOT to automatically mint vDOT at a 1:1 ratio. vDOT
            is a wrapped DOT token, redeemable at any time.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-cyan-300">Exchange Rate</p>
          <p className="text-lg font-semibold text-white">1 DOT = 1 vDOT</p>
        </div>
      </div>

      {/* Input Card */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
        <h2 className="mb-6 text-xl font-semibold text-white">
          Enter Deposit Amount
        </h2>
        <p className="mb-4 text-sm text-gray-400">
          Available Balance: {parseFloat(balance).toFixed(4)} DOT
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {/* DOT Input */}
          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Deposit DOT Amount
            </label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter DOT amount"
              className="border-white/20 bg-white/5 text-white"
            />
            <p className="mt-2 text-xs text-gray-500">
              Enter the amount of DOT you want to deposit
            </p>
          </div>

          {/* vDOT Expected */}
          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Will Receive vDOT
            </label>
            <Input
              type="text"
              value={vDOTAmount}
              readOnly
              className="border-white/20 bg-white/5 text-white"
            />
            <p className="mt-2 text-xs text-gray-500">
              1:1 ratio auto-calculated
            </p>
          </div>
        </div>

        {/* Exchange Description */}
        <div className="mt-8 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Exchange Rate</span>
            <span className="text-white">1 DOT = 1 vDOT</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Gas Fee</span>
            <span className="text-white">Determined by network</span>
          </div>
          <div className="border-t border-white/10 pt-3" />
          <div className="flex justify-between">
            <span className="font-semibold text-white">Estimated Receive</span>
            <span className="text-xl font-bold text-cyan-300">
              {vDOTAmount} vDOT
            </span>
          </div>
        </div>

        {/* Info Text */}
        <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-gray-300">
          <p className="mb-2 font-semibold text-cyan-300">💡 About vDOT</p>
          <ul className="space-y-1 text-xs">
            <li>• vDOT is a 1:1 wrapped DOT token (similar to WDOT)</li>
            <li>• Deposited DOT will be locked in the smart contract</li>
            <li>
              • You can redeem an equal amount of DOT by burning vDOT at any
              time
            </li>
            <li>• vDOT can be used for staking to get voting tickets</li>
          </ul>
        </div>

        {/* Confirm Button */}
        <Button
          onClick={deposit}
          disabled={isPending || !amount || parseFloat(amount) <= 0}
          className="mt-6 w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Depositing..." : "Confirm Deposit"}
        </Button>

        {/* Status Prompt */}
        {isSuccess && (
          <div className="mt-4 text-center">
            <p className="mb-2 text-sm text-green-400">
              ✅ Deposit successful! vDOT has been minted to your wallet
            </p>
            <Link
              href="/stake"
              className="inline-block text-sm text-cyan-300 underline hover:text-cyan-200"
            >
              Go to Stake Page to get voting rights now →
            </Link>
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
            <p className="mb-2 text-center text-sm font-medium text-red-400">
              ❌ Deposit Failed
            </p>
            <p className="text-center text-xs text-red-300/80">
              {error.message?.includes("circuit breaker") ||
              error.message?.includes("circuit breaker is open")
                ? "Network connection issue. This usually happens when the RPC node is temporarily unavailable or rate-limited. Please try the following solutions:"
                : error.message?.includes("User rejected") ||
                    error.message?.includes("user rejected")
                  ? "Transaction was cancelled by user."
                  : error.message?.includes("insufficient funds") ||
                      error.message?.includes("insufficient balance")
                    ? "Insufficient balance. Please check your wallet balance."
                    : error.message || "Unknown error occurred"}
            </p>
            {(error.message?.includes("circuit breaker") ||
              error.message?.includes("circuit breaker is open")) && (
              <div className="mt-3 space-y-1 text-left text-xs text-red-300/60">
                <p className="font-medium">💡 Solutions:</p>
                <ul className="ml-4 list-disc space-y-0.5">
                  <li>Wait 10-30 seconds and try again</li>
                  <li>Refresh the page</li>
                  <li>Switch to a different network and switch back</li>
                  <li>Check your internet connection</li>
                  <li>If using MetaMask, try disconnecting and reconnecting</li>
                </ul>
                <p className="mt-2 text-xs text-red-300/50">
                  Note: This error is often caused by RPC node rate limiting.
                  The transaction will work once the RPC node recovers.
                </p>
              </div>
            )}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-gray-500">
          After depositing, you can go to the staking page to stake vDOT to get
          voting tickets.
        </p>
      </div>

      {/* Redeem Module */}
      <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20">
            <svg
              className="h-4 w-4 text-orange-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white">Redeem vDOT</h2>
        </div>

        <p className="mb-6 text-sm text-gray-400">
          Burn vDOT and redeem an equal amount of DOT. Redemption ratio is 1:1,
          no fees.
        </p>

        <div className="mb-6 flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
          <span className="text-sm text-gray-300">vDOT Balance</span>
          <span className="text-lg font-semibold text-white">
            {parseFloat(vDOTBalance).toFixed(4)} vDOT
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* vDOT Input */}
          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Redeem vDOT Amount
            </label>
            <Input
              type="number"
              value={redeemAmount}
              onChange={(e) => setRedeemAmount(e.target.value)}
              placeholder="Enter vDOT amount"
              className="border-white/20 bg-white/5 text-white"
            />
            <p className="mt-2 text-xs text-gray-500">
              Enter the amount of vDOT you want to redeem
            </p>
          </div>

          {/* DOT Expected */}
          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Will Receive DOT
            </label>
            <Input
              type="text"
              value={redeemAmount ? parseFloat(redeemAmount).toFixed(4) : "0"}
              readOnly
              className="border-white/20 bg-white/5 text-white"
            />
            <p className="mt-2 text-xs text-gray-500">
              1:1 ratio auto-calculated
            </p>
          </div>
        </div>

        {/* Redeem Description */}
        <div className="mt-8 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Redemption Ratio</span>
            <span className="text-white">1 vDOT = 1 DOT</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Fees</span>
            <span className="text-white">No fees</span>
          </div>
          <div className="border-t border-white/10 pt-3" />
          <div className="flex justify-between">
            <span className="font-semibold text-white">Estimated Receive</span>
            <span className="text-xl font-bold text-orange-300">
              {redeemAmount ? parseFloat(redeemAmount).toFixed(4) : "0"} DOT
            </span>
          </div>
        </div>

        {/* Info Text */}
        <div className="mt-6 rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 text-sm text-gray-300">
          <p className="mb-2 font-semibold text-orange-300">
            ⚠️ Redemption Notice
          </p>
          <ul className="space-y-1 text-xs">
            <li>• vDOT will be permanently burned after redemption</li>
            <li>• Redeemed DOT will be sent directly to your wallet</li>
            <li>
              • If vDOT is currently staked, please unstake before redeeming
            </li>
            <li>
              • Redemption operations are irreversible, please proceed with
              caution
            </li>
          </ul>
        </div>

        {/* Confirm Button */}
        <Button
          onClick={redeem}
          disabled={
            isRedeemPending ||
            !redeemAmount ||
            parseFloat(redeemAmount) <= 0 ||
            parseFloat(redeemAmount) > parseFloat(vDOTBalance)
          }
          className="mt-6 w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRedeemPending ? "Redeeming..." : "Confirm Redemption"}
        </Button>

        {/* Status Prompt */}
        {isRedeemSuccess && (
          <div className="mt-4 text-center">
            <p className="mb-2 text-sm text-green-400">
              ✅ Redemption successful! DOT has been sent to your wallet
            </p>
            <p className="text-xs text-gray-400">
              vDOT has been burned, and the corresponding amount of DOT has been
              received
            </p>
          </div>
        )}
        {redeemError && (
          <p className="mt-4 text-center text-sm text-red-400">
            ❌ {redeemError.message}
          </p>
        )}
      </div>
    </div>
  );
}
