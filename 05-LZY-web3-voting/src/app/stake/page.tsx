"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStakingContract } from "@/hooks/useStakingContract";
import { StakingHistory } from "@/components/minting/StakingHistory";

const LOCK_OPTIONS = [
  { label: "Unlock after reveal", value: 0, multiplier: 1.0 },
] as const;

export default function StakePage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const [stakeAmount, setStakeAmount] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [stakedAmount, setStakedAmount] = useState<string>("");
  const selectedLock = LOCK_OPTIONS[0];

  const {
    vDOTBalance,
    stakeCount,
    ticketBalance,
    stake,
    isPending,
    error,
    txHash,
  } = useStakingContract();

  // Listen for transaction confirmation
  const { data: receipt, isLoading: isConfirming } =
    useWaitForTransactionReceipt({
      hash: txHash ?? undefined, // Fix type: null needs to be converted to undefined
    });

  // Handle after transaction confirmation
  useEffect(() => {
    if (receipt && receipt.status === "success") {
      setShowSuccessModal(true);
      setStakeAmount(""); // Clear input
    }
  }, [receipt]);

  // Format balance display
  const formattedBalance = useMemo(() => {
    if (!vDOTBalance || vDOTBalance === BigInt(0)) return "0.00";
    return formatEther(vDOTBalance as bigint);
  }, [vDOTBalance]);

  // Format ticket balance display
  const formattedTicketBalance = useMemo(() => {
    if (!ticketBalance || ticketBalance === BigInt(0)) return "0.00";
    return formatEther(ticketBalance as bigint);
  }, [ticketBalance]);

  // Calculate projected tickets (1:1 ratio)
  const projectedTickets = useMemo(() => {
    const amount = parseFloat(stakeAmount) || 0;
    return amount > 0 ? amount : 0; // 1:1 ratio
  }, [stakeAmount]);

  // Handle staking
  const handleStake = async () => {
    if (!isConnected) {
      alert("Please connect wallet first");
      return;
    }

    const amount = parseFloat(stakeAmount);
    if (!amount || amount <= 0) {
      alert("Please enter a valid stake amount");
      return;
    }

    if (amount > parseFloat(formattedBalance)) {
      alert("Stake amount cannot exceed balance");
      return;
    }

    try {
      setStakedAmount(stakeAmount); // Save stake amount for display
      await stake(parseEther(stakeAmount));
    } catch (error) {
      console.error("Staking failed:", error);
    }
  };

  // Quick percentage selection
  const handlePercentageSelect = (percent: number) => {
    const balance = parseFloat(formattedBalance);
    const amount = (balance * percent) / 100;
    setStakeAmount(amount.toFixed(4));
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
          <h1 className="mb-4 text-3xl font-bold text-white">Stake vDOT</h1>
          <p className="mb-6 text-gray-400">
            Please connect wallet first to start staking vDOT
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
    <>
      {/* Staking success modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-3xl border border-white/20 bg-white/10 p-8 backdrop-blur-xl">
            <div className="text-center">
              {/* Success icon */}
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                <svg
                  className="h-8 w-8 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              {/* Success title */}
              <h3 className="mb-2 text-2xl font-semibold text-white">
                Staking Successful!
              </h3>
              <p className="mb-6 text-sm text-white/70">
                You have successfully staked {stakedAmount} vDOT and received{" "}
                {stakedAmount} voting tickets
              </p>

              {/* Staking details */}
              <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
                <div className="flex items-center justify-between py-2 text-sm">
                  <span className="text-white/60">Staked Amount</span>
                  <span className="text-white">{stakedAmount} vDOT</span>
                </div>
                <div className="flex items-center justify-between py-2 text-sm">
                  <span className="text-white/60">Voting Tickets Received</span>
                  <span className="text-white">{stakedAmount} tickets</span>
                </div>
                <div className="flex items-center justify-between py-2 text-sm">
                  <span className="text-white/60">Lock Status</span>
                  <span className="text-green-400">Locked</span>
                </div>
                <div className="flex items-center justify-between py-2 text-sm">
                  <span className="text-white/60">Unlock Time</span>
                  <span className="text-white/60">
                    After voting period reveal
                  </span>
                </div>
              </div>

              {/* Next step guidance */}
              <div className="mb-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20">
                    <svg
                      className="h-4 w-4 text-cyan-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-cyan-400">
                      Next: Participate in Voting
                    </p>
                    <p className="text-xs text-white/60">
                      Use your voting tickets to participate in BTC future
                      prediction voting
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowSuccessModal(false)}
                  variant="outline"
                  className="flex-1 border-white/20 bg-white/5 text-white hover:bg-white/10"
                >
                  Continue Staking
                </Button>
                <Button
                  onClick={() => {
                    setShowSuccessModal(false);
                    router.push("/vote");
                  }}
                  className="flex-1 border-0 bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:from-cyan-600 hover:to-purple-600"
                >
                  Go to Voting
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto max-w-6xl px-4 pt-16 pb-20">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold md:text-4xl">Stake vDOT</h1>
            <p className="mt-3 max-w-2xl text-sm text-white/70 md:text-base">
              Lock vDOT in the platform staking contract to exchange for voting
              tickets. The contract is managed by the project team but cannot
              operate funds, only used for proxy governance voting.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70">
            <span className="flex h-2 w-2 rounded-full bg-green-400" />
            Contract Audit: Completed · 2024 Q4
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-8 backdrop-blur-xl">
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Staking Form</h2>
                  <p className="text-sm text-white/60">
                    Available Balance: {formattedBalance} vDOT
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70">
                  <span className="flex h-2 w-2 rounded-full bg-green-400" />
                  Wallet Connected
                </div>
              </div>

              <label className="mb-2 block text-xs tracking-wide text-white/60 uppercase">
                Stake Amount
              </label>
              <Input
                value={stakeAmount}
                onChange={(event) => setStakeAmount(event.target.value)}
                type="number"
                min="0"
                step="0.0001"
                className="border-white/20 bg-white/5 text-lg text-white placeholder:text-white/40"
                placeholder="0.00"
              />
              <div className="mt-3 flex gap-2 text-xs text-white/60">
                {[25, 50, 75, 100].map((percent) => (
                  <button
                    key={percent}
                    type="button"
                    onClick={() => handlePercentageSelect(percent)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 hover:border-white/30"
                  >
                    {percent}%
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <p className="mb-2 text-xs tracking-wide text-white/60 uppercase">
                  Lock Period
                </p>
                <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                  <p className="text-sm font-medium text-white">
                    {selectedLock.label}
                  </p>
                  <p className="mt-1 text-xs text-white/60">Ticket Ratio 1:1</p>
                  <p className="mt-2 text-xs text-white/50">
                    Staked vDOT will automatically unlock after Chainlink
                    returns data and triggers reveal conditions
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                <div className="flex items-center justify-between">
                  <span>Projected Tickets</span>
                  <span className="text-white">
                    {projectedTickets.toFixed(2)} tickets
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Current Ticket Balance</span>
                  <span className="text-white">
                    {formattedTicketBalance} tickets
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Current Staking Records</span>
                  <span className="text-white">
                    {Number(stakeCount)} records
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-3 text-white">
                  <span>Estimated Unlock Time</span>
                  <span>After Chainlink reveal</span>
                </div>
              </div>

              {/* Error notification */}
              {error && (
                <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                  <p className="text-xs text-red-400">Error: {error.message}</p>
                </div>
              )}

              <div className="mt-8 flex items-center gap-3 text-xs text-white/60">
                <span className="flex h-4 w-4 items-center justify-center rounded-full border border-white/20">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </span>
                Voting tickets (vTicket) will be automatically generated and
                deposited to your account after successful staking.
              </div>

              <Button
                onClick={handleStake}
                disabled={
                  isPending ||
                  isConfirming ||
                  !stakeAmount ||
                  parseFloat(stakeAmount) <= 0
                }
                className="mt-8 w-full border-0 bg-gradient-to-r from-cyan-500 to-purple-500 text-lg text-white hover:from-cyan-600 hover:to-purple-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending
                  ? "Processing staking..."
                  : isConfirming
                    ? "Waiting for confirmation..."
                    : "Confirm Stake"}
              </Button>
              <p className="mt-3 text-center text-xs text-white/50">
                Staked vDOT will be locked until Chainlink reveal, and will
                automatically unlock after reveal.
              </p>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <p className="text-xs tracking-wide text-white/60 uppercase">
                Locking Information
              </p>
              <ul className="mt-4 space-y-3 text-sm text-white/70">
                <li>
                  · Contract Address: 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
                </li>
                <li>· Audit Firm: SlowMist (2024 Q4)</li>
                <li>
                  · Project team can only initiate governance proxy, cannot
                  transfer assets.
                </li>
              </ul>
              <Button
                asChild
                variant="outline"
                className="mt-6 w-full border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <Link href="/docs/audit">View Audit Report</Link>
              </Button>
            </div>

            <StakingHistory />
          </aside>
        </section>
      </main>
    </>
  );
}
