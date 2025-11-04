"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useWalletContext } from "@/contexts/WalletContext";
import { useVotingContract } from "@/hooks/useVotingContract";
import { VotingHistory } from "@/components/voting/VotingHistory";
import { parseEther } from "viem";

const generateYearOptions = () => {
  const options = [];
  const startYear = 2025;

  // Generate 20 preset year ranges: 2025-2027, 2027-2029, ..., 2063-2065
  for (let i = 0; i < 20; i++) {
    const rangeStart = startYear + i * 2;
    const rangeEnd = rangeStart + 2;
    options.push({
      value: rangeEnd, // Use end year as value
      label: `${rangeStart}-${rangeEnd}`,
      description: `Surpassed before ${rangeEnd}`,
    });
  }

  return options;
};

const OPTIONS = generateYearOptions();

export default function VotePage() {
  const [selected, setSelected] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [votedOption, setVotedOption] = useState<string>("");
  const [customYear, setCustomYear] = useState<string>("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [ticketsToVote, setTicketsToVote] = useState<string>("");
  const [longTermApproval, setLongTermApproval] = useState(false);
  const router = useRouter();

  const {
    isConnected: walletConnected,
    connect,
    isLoading: connecting,
  } = useWalletContext();

  // Use voting contract hook
  const {
    ticketBalance,
    completeVote,
    isPending,
    isApproving,
    isVoting,
    isConfirmingApproval,
    isConfirmingVote,
    voteReceipt,
    refetchTicketBalance,
  } = useVotingContract();

  const tickets = Number(ticketBalance) / 1e18; // Convert to readable format

  const connectWallet = () => void connect("evm");

  // Listen for vote transaction confirmation
  useEffect(() => {
    if (voteReceipt && voteReceipt.status === "success") {
      setShowSuccessModal(true);
      setHasSubmitted(true);
      // Refresh ticket balance
      void refetchTicketBalance();
    }
  }, [voteReceipt, refetchTicketBalance]);

  const handleSubmit = async () => {
    if (!walletConnected) {
      connectWallet();
      return;
    }

    let selectedValue = selected;
    let selectedLabel = "";

    if (showCustomInput && customYear) {
      selectedValue = parseInt(customYear);

      // Calculate nearest odd year as start
      const inputYear = selectedValue;
      const rangeStart = inputYear % 2 === 0 ? inputYear - 1 : inputYear;
      const rangeEnd = rangeStart + 2;

      selectedLabel = `${rangeStart}-${rangeEnd}`;
      selectedValue = rangeEnd; // Use end year as value for consistency
    } else {
      const selectedOption = OPTIONS.find(
        (option) => option.value === selected,
      );
      selectedLabel = selectedOption?.label ?? "";
    }

    if (!selectedValue) return;

    // Validate ticket amount
    const ticketsToUseNumber = parseFloat(ticketsToVote);
    if (!ticketsToVote || ticketsToUseNumber <= 0) {
      alert("Please enter a valid ticket amount");
      return;
    }

    if (ticketsToUseNumber > tickets) {
      alert("Insufficient ticket balance");
      return;
    }

    try {
      // Convert to BigInt format
      const ticketsToUseBigInt = parseEther(ticketsToVote);

      // Call smart contract to vote
      await completeVote(selectedValue, ticketsToUseBigInt, longTermApproval);

      // Set voted option for display
      setVotedOption(selectedLabel);

      // Clear ticket amount input
      setTicketsToVote("");
    } catch (error) {
      console.error("Vote failed:", error);

      // Display more detailed error information
      let errorMessage = "Unknown error";
      if (error instanceof Error) {
        errorMessage = error.message;

        // Handle common error types
        if (errorMessage.includes("Voting period ended")) {
          errorMessage =
            "Current voting period has ended, please wait for a new voting period";
        } else if (errorMessage.includes("Insufficient allowance")) {
          errorMessage = "Insufficient ticket allowance, please re-authorize";
        } else if (errorMessage.includes("Insufficient balance")) {
          errorMessage =
            "Insufficient ticket balance, please check your balance";
        } else if (errorMessage.includes("User rejected")) {
          errorMessage = "User cancelled the transaction";
        } else if (errorMessage.includes("Transaction hash not generated")) {
          errorMessage =
            "Transaction submission failed, please check network connection and retry";
        } else if (errorMessage.includes("Transaction submission failed")) {
          errorMessage =
            "Transaction submission failed, please check network connection and retry";
        } else if (errorMessage.includes("Vote timeout")) {
          errorMessage =
            "Transaction confirmation timeout, please check transaction status later";
        }
      }

      alert(`Vote failed: ${errorMessage}`);
    }
  };

  return (
    <>
      {/* Vote success modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-3xl border border-white/20 bg-white/10 p-8 backdrop-blur-xl">
            <div className="text-center">
              {/* Success icon */}
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/20">
                <svg
                  className="h-8 w-8 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              {/* Success title */}
              <h3 className="mb-2 text-2xl font-semibold text-white">
                Vote Successful!
              </h3>
              <p className="mb-6 text-sm text-white/70">
                You have successfully submitted your prediction: {votedOption}
              </p>

              {/* Vote details */}
              <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
                <div className="flex items-center justify-between py-2 text-sm">
                  <span className="text-white/60">Prediction Option</span>
                  <span className="text-white">{votedOption}</span>
                </div>
                <div className="flex items-center justify-between py-2 text-sm">
                  <span className="text-white/60">Tickets Used</span>
                  <span className="text-white">
                    {tickets.toFixed(2)} tickets
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 text-sm">
                  <span className="text-white/60">Vote Status</span>
                  <span className="text-green-400">Locked</span>
                </div>
                <div className="flex items-center justify-between py-2 text-sm">
                  <span className="text-white/60">Reveal Time</span>
                  <span className="text-white/60">After Chainlink trigger</span>
                </div>
              </div>

              {/* Next step guidance */}
              <div className="mb-6 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20">
                    <svg
                      className="h-4 w-4 text-purple-400"
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
                    <p className="text-sm font-medium text-purple-400">
                      Next: Wait for reveal
                    </p>
                    <p className="text-xs text-white/60">
                      Check the reveal page for latest information and NFT
                      rewards
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowSuccessModal(false);
                    // Reset all voting-related states to allow user to vote again
                    setSelected(null);
                    setHasSubmitted(false);
                    setVotedOption("");
                    setTicketsToVote("");
                    setCustomYear("");
                    setShowCustomInput(false);
                    // Note: Don't reset longTermApproval to maintain user's authorization preference
                  }}
                  variant="outline"
                  className="flex-1 border-white/20 bg-white/5 text-white hover:bg-white/10"
                >
                  Continue Voting
                </Button>
                <Button
                  onClick={() => {
                    setShowSuccessModal(false);
                    router.push("/reveal");
                  }}
                  className="flex-1 border-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                >
                  View Reveal
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto max-w-6xl px-4 pt-16 pb-20">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold md:text-4xl">
              Submit Prediction
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/70 md:text-base">
              Use your voting tickets to predict whether Bitcoin will be
              surpassed by other competing chains in market cap in the coming
              years. Once submitted, it cannot be modified, please choose
              carefully.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70">
            <span className="flex h-2 w-2 rounded-full bg-purple-400" />
            Current Tickets: {tickets.toFixed(2)}
          </div>
        </div>

        <section className="mx-auto max-w-7xl">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-8 backdrop-blur-xl">
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    Select Prediction Year
                  </h2>
                  <p className="text-sm text-white/60">
                    Cannot be modified after submission, tickets will be locked.
                  </p>
                </div>
                {!walletConnected && (
                  <Button
                    onClick={connectWallet}
                    disabled={connecting}
                    className="border-0 bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:from-cyan-600 hover:to-purple-600"
                  >
                    {connecting ? "Connecting..." : "Connect Wallet"}
                  </Button>
                )}
              </div>

              {/* Year selection scroll container */}
              <div className="scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/20 hover:scrollbar-thumb-white/30 max-h-80 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {OPTIONS.map((option) => {
                    const isActive = selected === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() =>
                          !hasSubmitted && setSelected(option.value)
                        }
                        className={`rounded-xl border p-4 text-left transition ${
                          isActive
                            ? "border-white/50 bg-white/15"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        } ${hasSubmitted ? "cursor-not-allowed opacity-60" : ""}`}
                        disabled={hasSubmitted}
                      >
                        <p className="text-base font-semibold text-white">
                          {option.label}
                        </p>
                        <p className="mt-1 text-sm text-white/60">
                          {option.description}
                        </p>
                        {isActive && (
                          <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/50 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                            Selected
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Custom year input option */}
                  <button
                    onClick={() => !hasSubmitted && setShowCustomInput(true)}
                    className={`rounded-xl border p-4 text-left transition ${
                      showCustomInput
                        ? "border-white/50 bg-white/15"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    } ${hasSubmitted ? "cursor-not-allowed opacity-60" : ""}`}
                    disabled={hasSubmitted}
                  >
                    <p className="text-base font-semibold text-white">
                      Custom Year
                    </p>
                    <p className="mt-1 text-sm text-white/60">
                      Enter your predicted year
                    </p>
                    {showCustomInput && (
                      <div className="mt-3 space-y-2">
                        <input
                          type="number"
                          min={2027}
                          value={customYear}
                          onChange={(e) => {
                            setCustomYear(e.target.value);
                            setSelected(parseInt(e.target.value));
                          }}
                          placeholder="e.g.: 2049"
                          className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                        {customYear && (
                          <div className="text-xs text-white/60">
                            Will be paired as:{" "}
                            {(() => {
                              const inputYear = parseInt(customYear);
                              if (isNaN(inputYear)) return "";
                              const rangeStart =
                                inputYear % 2 === 0 ? inputYear - 1 : inputYear;
                              const rangeEnd = rangeStart + 2;
                              return `${rangeStart}-${rangeEnd}`;
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                    {showCustomInput && customYear && (
                      <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/50 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200">
                        <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                        Selected
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Ticket amount input */}
              <div className="mt-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/10 p-6 backdrop-blur-sm">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20">
                    <svg
                      className="h-4 w-4 text-purple-300"
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
                  <h3 className="text-lg font-semibold text-white">
                    Number of Tickets to Use
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type="number"
                        min="0.01"
                        max={tickets}
                        step="0.01"
                        value={ticketsToVote}
                        onChange={(e) => setTicketsToVote(e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-4 text-lg text-white transition-all duration-200 placeholder:text-white/50 focus:border-purple-400/60 focus:bg-white/15 focus:ring-2 focus:ring-purple-400/20 focus:outline-none"
                        disabled={hasSubmitted || isPending}
                      />
                      <div className="absolute top-1/2 right-4 -translate-y-1/2 text-sm text-white/40">
                        tickets
                      </div>
                    </div>

                    {/* Percentage selection buttons */}
                    <div className="flex gap-2">
                      {[0.25, 0.5, 0.75, 1].map((ratio) => {
                        const amount =
                          tickets > 0 ? (tickets * ratio).toFixed(2) : "0.00";
                        return (
                          <Button
                            key={ratio}
                            variant="outline"
                            onClick={() => setTicketsToVote(amount)}
                            disabled={
                              hasSubmitted || isPending || tickets === 0
                            }
                            className="flex-1 rounded-full border-white/20 bg-white/5 px-4 py-2 text-sm text-white transition-all duration-200 hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {ratio === 1
                              ? "100%"
                              : `${(ratio * 100).toFixed(0)}%`}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Balance display */}
                  <div className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-2">
                    <span className="text-sm text-white/70">
                      Available Balance
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-white">
                        {tickets.toFixed(2)}
                      </span>
                      <span className="text-sm text-white/50">tickets</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Information cards */}
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="group rounded-xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-emerald-400/5 p-4 transition-all duration-200 hover:border-emerald-400/30 hover:bg-gradient-to-br hover:from-emerald-500/15 hover:to-emerald-400/10">
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
                      <svg
                        className="h-3 w-3 text-emerald-300"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        One-time Investment
                      </p>
                      <p className="mt-1 text-xs text-white/60">
                        Tickets will be invested in the selected year at once
                      </p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 to-amber-400/5 p-4 transition-all duration-200 hover:border-amber-400/30 hover:bg-gradient-to-br hover:from-amber-500/15 hover:to-amber-400/10">
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20">
                      <svg
                        className="h-3 w-3 text-amber-300"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        Cannot be Changed
                      </p>
                      <p className="mt-1 text-xs text-white/60">
                        Cannot change selection before reveal
                      </p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-xl border border-purple-400/20 bg-gradient-to-br from-purple-500/10 to-purple-400/5 p-4 transition-all duration-200 hover:border-purple-400/30 hover:bg-gradient-to-br hover:from-purple-500/15 hover:to-purple-400/10">
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20">
                      <svg
                        className="h-3 w-3 text-purple-300"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        NFT Rewards
                      </p>
                      <p className="mt-1 text-xs text-white/60">
                        Correct users receive NFT rewards after reveal
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Long-term approval option */}
              <div className="mt-6 rounded-xl border border-orange-500/20 bg-orange-500/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/20">
                      <svg
                        className="h-4 w-4 text-orange-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-orange-400">
                        Long-term Approval Settings
                      </h4>
                      <p className="text-xs text-orange-300/70">
                        Once enabled, only need to approve once, subsequent
                        votes won&apos;t require re-authorization
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={longTermApproval}
                      onChange={(e) => setLongTermApproval(e.target.checked)}
                      className="peer sr-only"
                      disabled={
                        hasSubmitted || isPending || isApproving || isVoting
                      }
                    />
                    <div className="peer h-6 w-11 rounded-full bg-white/20 peer-checked:bg-orange-500 peer-focus:ring-4 peer-focus:ring-orange-300/20 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                  </label>
                </div>

                {longTermApproval && (
                  <div className="mt-3 rounded-lg bg-orange-500/20 p-3">
                    <div className="flex items-start gap-2">
                      <svg
                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-400"
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
                      <div className="text-xs text-orange-300">
                        <p className="mb-1 font-medium">
                          ⚠️ Long-term Approval Notice:
                        </p>
                        <ul className="space-y-1 text-orange-300/80">
                          <li>
                            • Will authorize the voting contract to use all
                            tickets in your wallet
                          </li>
                          <li>
                            • Subsequent votes won&apos;t require
                            re-authorization, improving user experience
                          </li>
                          <li>
                            • To revoke authorization, please manually revoke it
                            in your wallet
                          </li>
                          <li>
                            • It is recommended to check authorization status
                            regularly to ensure fund security
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Operation status notification */}
              {(isApproving ||
                isConfirmingApproval ||
                isVoting ||
                isConfirmingVote) && (
                <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20">
                      <svg
                        className="h-3 w-3 animate-spin text-blue-400"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-400">
                        {isApproving || isConfirmingApproval
                          ? "Step 1/2: Approving Tickets"
                          : "Step 2/2: Executing Vote"}
                      </p>
                      <p className="text-xs text-blue-300/70">
                        {isApproving || isConfirmingApproval
                          ? "Authorizing voting contract to use your tickets..."
                          : "Submitting your voting prediction..."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={
                  hasSubmitted ||
                  !selected ||
                  isPending ||
                  isApproving ||
                  isVoting ||
                  !ticketsToVote
                }
                className="mt-6 w-full border-0 bg-gradient-to-r from-purple-500 to-pink-500 text-lg text-white hover:from-purple-600 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {hasSubmitted
                  ? "Submitted, waiting for reveal"
                  : isApproving || isConfirmingApproval
                    ? "Approving tickets..."
                    : isVoting || isConfirmingVote
                      ? "Processing vote..."
                      : isPending
                        ? "Processing..."
                        : !walletConnected
                          ? "Connect Wallet"
                          : !selected
                            ? "Please select prediction year"
                            : !ticketsToVote
                              ? "Please enter ticket amount"
                              : "Submit Prediction"}
              </Button>
              <p className="mt-3 text-center text-xs text-white/50">
                Reveal results will be synced to your account and email
                notifications, NFT rewards will be distributed within 24 hours.
              </p>
            </div>

            <VotingHistory />
          </div>
        </section>
      </main>
    </>
  );
}
