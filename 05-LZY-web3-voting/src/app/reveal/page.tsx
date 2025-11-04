"use client";

import Link from "next/link";
import React, { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { useWalletContext } from "@/contexts/WalletContext";
import { useBTCOracle } from "@/hooks/useBTCOracle";
import { useVotingContract } from "@/hooks/useVotingContract";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { btcOracleAddress, btcOracleAbi } from "@/config/contracts";

export default function RevealPage() {
  const {
    isConnected: walletConnected,
    address: walletAddress,
    connect,
  } = useWalletContext();

  const connectWallet = () => connect("evm");

  // Get BTCOracle data (reduce query frequency: 30 seconds)
  const {
    latestSnapshot,
    votingPeriod,
    competitors,
    lastSnapshotTime,
    nextSnapshotTime,
    canTakeSnapshot,
    snapshotCount,
  } = useBTCOracle(1);

  // BTC price query status
  const [isQueryingPrice, setIsQueryingPrice] = React.useState(false);
  const [isWaitingConfirmation, setIsWaitingConfirmation] =
    React.useState(false);
  const [pendingTxHash, setPendingTxHash] = React.useState<
    `0x${string}` | null
  >(null);
  const [lastPriceQuery, setLastPriceQuery] = React.useState<{
    price: string;
    timestamp: number;
    marketCap: string;
  } | null>(null);
  const [queryError, setQueryError] = React.useState<string | null>(null);

  // Manually take market snapshot (includes BTC price query)
  const { writeContractAsync: takeMarketSnapshot } = useWriteContract({
    mutation: {
      onSuccess: (hash) => {
        console.log("Market snapshot transaction submitted, tx hash:", hash);
        setPendingTxHash(hash);
        setIsWaitingConfirmation(true);
      },
      onError: (error) => {
        console.error("Market snapshot creation failed:", error);
        setIsQueryingPrice(false);
        setIsWaitingConfirmation(false);
        setPendingTxHash(null);
        setQueryError("Transaction submission failed, please retry");
      },
    },
  });

  // Wait for transaction confirmation
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: pendingTxHash ?? undefined,
    query: {
      enabled: !!pendingTxHash,
    },
  });

  // Listen for transaction confirmation status
  React.useEffect(() => {
    if (isConfirmed && isWaitingConfirmation) {
      console.log("Transaction confirmed!");
      // Set success status
      setLastPriceQuery({
        price: "Snapshot created",
        timestamp: Date.now(),
        marketCap: "Data stored on blockchain",
      });
      setQueryError(null);
      setIsQueryingPrice(false);
      setIsWaitingConfirmation(false);
      setPendingTxHash(null);
    }
  }, [isConfirmed, isWaitingConfirmation]);

  // Handler function for taking market snapshot (includes BTC price query and storage)
  const handleQueryBTCPrice = async () => {
    setIsQueryingPrice(true);
    setQueryError(null); // Clear previous errors

    try {
      // If wallet not connected, connect first
      if (!walletConnected) {
        console.log("Wallet not connected, connecting...");
        await connectWallet();

        // Wait for connection status update, max 5 seconds
        let retryCount = 0;
        while (!walletConnected && retryCount < 10) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          retryCount++;
        }

        if (!walletConnected) {
          throw new Error(
            "Wallet connection failed, please ensure MetaMask is installed and unlocked",
          );
        }
      }

      console.log("Starting market snapshot (includes BTC price query)...");
      // Call takeMarketSnapshot function to take current market snapshot
      await takeMarketSnapshot({
        address: btcOracleAddress,
        abi: btcOracleAbi,
        functionName: "takeMarketSnapshot",
        args: [1], // Voting period ID is 1
      });

      // Note: Success status will be set via useEffect after transaction confirmation
    } catch (error) {
      console.error("Market snapshot failed:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Snapshot failed, please retry";
      setQueryError(errorMessage);
    } finally {
      setIsQueryingPrice(false);
    }
  };

  // Get user voting history function (only called when needed, no auto polling)
  const { getUserVotingHistory } = useVotingContract();

  // User voting history data (needs async loading)
  const [userVotingHistory, setUserVotingHistory] = React.useState<
    Array<{
      predictedYear: number;
      ticketsUsed: string;
      votingPeriodId: number;
      timestamp: Date;
      claimed: boolean;
    }>
  >([]);

  // Load user voting history (only when wallet connected and voting period resolved)
  React.useEffect(() => {
    if (walletConnected && getUserVotingHistory && votingPeriod?.resolved) {
      void getUserVotingHistory().then(setUserVotingHistory);
    }
  }, [walletConnected, getUserVotingHistory, votingPeriod?.resolved]);

  // Oracle status
  const oracleStatus = useMemo(() => {
    const state = votingPeriod?.resolved
      ? "Resolved"
      : canTakeSnapshot
        ? "Waiting for snapshot"
        : "Monitoring";

    const lastCheck = lastSnapshotTime
      ? new Date(lastSnapshotTime * 1000).toLocaleString("en-US", {
          timeZone: "UTC",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "No data";

    const nextCheck = nextSnapshotTime
      ? new Date(nextSnapshotTime * 1000).toLocaleString("en-US", {
          timeZone: "UTC",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "No data";

    return {
      state,
      lastCheck,
      nextCheck,
      triggerCondition: "Any competitor market cap ≥ BTC",
      snapshotCount: snapshotCount || 0,
    };
  }, [
    votingPeriod,
    canTakeSnapshot,
    lastSnapshotTime,
    nextSnapshotTime,
    snapshotCount,
  ]);

  // Winners list (based on user voting history)
  const winners = useMemo(() => {
    if (!userVotingHistory || !votingPeriod?.resolved) return [];

    return userVotingHistory
      .filter((vote) => {
        // Only show correctly predicted votes
        return (
          vote.votingPeriodId === 1 &&
          vote.predictedYear === votingPeriod.correctAnswerYear
        );
      })
      .slice(0, 10) // Show at most 10
      .map((vote, index) => ({
        address: walletAddress
          ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
          : "Not connected",
        reward:
          index === 0 ? "Legendary NFT" : index < 3 ? "Rare NFT" : "Common NFT",
        option: vote.predictedYear === 0 ? "Never" : `${vote.predictedYear}`,
      })) as Array<{
      address: string;
      reward: string;
      option: string;
    }>;
  }, [userVotingHistory, votingPeriod, walletAddress]);

  // Timeline data
  const timeline = useMemo(() => {
    const events = [];

    // Add latest snapshot event
    if (latestSnapshot) {
      const winningCompetitor = competitors[latestSnapshot.winningCompetitorId];
      const resultText =
        latestSnapshot.result === 1
          ? `${winningCompetitor?.name ?? "Competitor"} market cap exceeds BTC`
          : "BTC market cap remains leading";

      events.push({
        time: new Date(latestSnapshot.timestamp * 1000).toLocaleDateString(
          "en-US",
        ),
        title: "Latest Snapshot",
        description: `${resultText}`,
      });
    }

    // If resolved, add reveal event
    if (votingPeriod?.resolved) {
      events.push({
        time: new Date(votingPeriod.endTime * 1000).toLocaleDateString("en-US"),
        title: "Reveal Triggered",
        description:
          votingPeriod.correctAnswerYear === 0
            ? "BTC market cap not surpassed"
            : `Market cap surpassed in ${votingPeriod.correctAnswerYear}`,
      });

      events.push({
        time: new Date(votingPeriod.endTime * 1000).toLocaleDateString("en-US"),
        title: "Reward Distribution",
        description: "Users with correct predictions can claim rewards",
      });
    }

    return events.length > 0
      ? events
      : [
          {
            time: "Pending",
            title: "Waiting for snapshot data",
            description: "Chainlink oracle is monitoring",
          },
        ];
  }, [latestSnapshot, votingPeriod, competitors]);

  return (
    <>
      <main className="container mx-auto max-w-6xl px-4 pt-16 pb-20">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold md:text-4xl">
              Reveal & Rewards
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/70 md:text-base">
              Chainlink checks competitor market cap every 24 hours, immediately
              triggers reveal and distributes NFT rewards when conditions are
              met. The following information helps you understand the reveal
              progress and reward claim process.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70">
            <span className="flex h-2 w-2 rounded-full bg-green-400" />
            Chainlink Status: {oracleStatus.state}
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-8 backdrop-blur-xl">
              <h2 className="text-xl font-semibold">Reveal Monitoring Panel</h2>
              <div className="mt-6 grid gap-4 text-sm text-white/70 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-white/50">Last Check</p>
                  <p className="mt-2 text-white">{oracleStatus.lastCheck}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-white/50">Next Check</p>
                  <p className="mt-2 text-white">{oracleStatus.nextCheck}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-white/50">Trigger Condition</p>
                  <p className="mt-2 text-white">
                    {oracleStatus.triggerCondition}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-white/50">Snapshot Count</p>
                  <p className="mt-2 text-white">
                    {oracleStatus.snapshotCount} times
                  </p>
                </div>
              </div>

              {/* Display latest snapshot data */}
              {latestSnapshot && (
                <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                  <p className="text-sm font-medium text-blue-400">
                    📊 Latest Market Cap Snapshot
                  </p>
                  <div className="mt-3 grid gap-3 text-xs md:grid-cols-2">
                    <div>
                      <span className="text-white/50">BTC Market Cap: </span>
                      <span className="ml-2 text-white">
                        $
                        {(
                          parseFloat(latestSnapshot.btcMarketCap) / 1e9
                        ).toFixed(2)}
                        B
                      </span>
                    </div>
                    <div>
                      <span className="text-white/50">
                        Highest Competitor Market Cap:{" "}
                      </span>
                      <span className="ml-2 text-white">
                        $
                        {(
                          parseFloat(latestSnapshot.highestCompetitorCap) / 1e9
                        ).toFixed(2)}
                        B
                      </span>
                    </div>
                    <div>
                      <span className="text-white/50">
                        Leading Competitor:{" "}
                      </span>
                      <span className="ml-2 text-white">
                        {competitors[latestSnapshot.winningCompetitorId]
                          ?.name ?? "Unknown"}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/50">Result: </span>
                      <span
                        className={`ml-2 font-medium ${
                          latestSnapshot.result === 1
                            ? "text-green-400"
                            : "text-orange-400"
                        }`}
                      >
                        {latestSnapshot.result === 1
                          ? "Competitor Wins"
                          : latestSnapshot.result === 0
                            ? "BTC Dominant"
                            : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Display voting period status */}
              {votingPeriod && (
                <div
                  className={`mt-4 rounded-2xl border p-4 ${
                    votingPeriod.resolved
                      ? "border-green-500/20 bg-green-500/10"
                      : "border-orange-500/20 bg-orange-500/10"
                  }`}
                >
                  <p className="text-sm font-medium text-white">
                    🗳️ Voting Period Status:{" "}
                    <span
                      className={`ml-2 ${
                        votingPeriod.resolved
                          ? "text-green-400"
                          : "text-orange-400"
                      }`}
                    >
                      {votingPeriod.resolved ? "Resolved" : "In Progress"}
                    </span>
                  </p>
                  {votingPeriod.resolved && (
                    <p className="mt-2 text-xs text-white/70">
                      Correct Answer:{" "}
                      <span className="ml-2 font-medium text-white">
                        {votingPeriod.correctAnswerYear === 0
                          ? "Never"
                          : `${votingPeriod.correctAnswerYear}`}
                      </span>
                    </p>
                  )}
                </div>
              )}
              <p className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
                Note: Chainlink results will be double-signature verified with
                the platform server to ensure reveal data consistency. If your
                prediction is correct, please keep your wallet online to claim
                NFT.
              </p>
            </div>

            {/* BTC price query module */}
            <div className="rounded-3xl border border-white/10 bg-white/10 p-8 backdrop-blur-xl">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20">
                  <svg
                    className="h-5 w-5 text-orange-400"
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
                <div>
                  <h2 className="text-xl font-semibold">
                    Market Snapshot Capture
                  </h2>
                  <p className="text-sm text-white/70">
                    Capture market snapshot, query and store BTC and competitor
                    price data
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <Button
                    onClick={handleQueryBTCPrice}
                    disabled={isQueryingPrice || isWaitingConfirmation}
                    className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white hover:from-orange-600 hover:to-yellow-600 disabled:opacity-50"
                  >
                    {isQueryingPrice ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                        Submitting transaction...
                      </div>
                    ) : isWaitingConfirmation ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                        Waiting for confirmation...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        Take Market Snapshot
                      </div>
                    )}
                  </Button>

                  {!walletConnected && (
                    <p className="text-xs text-orange-400">
                      💡 Clicking will automatically connect wallet
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  {queryError ? (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-400"></div>
                        <span className="text-sm font-medium text-red-400">
                          Query Failed
                        </span>
                      </div>
                      <p className="text-sm text-red-300">{queryError}</p>
                      <button
                        onClick={handleQueryBTCPrice}
                        className="mt-2 text-xs text-red-300 underline hover:text-red-200"
                      >
                        Retry Query
                      </button>
                    </div>
                  ) : isWaitingConfirmation ? (
                    <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-400"></div>
                        <span className="text-sm font-medium text-yellow-400">
                          Transaction Processing
                        </span>
                        <span className="text-xs text-yellow-300/70">
                          {new Date().toLocaleTimeString("en-US")}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs text-white/50">
                            Status:{" "}
                          </span>
                          <span className="ml-2 text-lg font-bold text-white">
                            Waiting for Confirmation
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-white/50">Data: </span>
                          <span className="ml-2 text-white">
                            Transaction submitted, waiting for blockchain
                            confirmation
                          </span>
                        </div>
                        {pendingTxHash && (
                          <div>
                            <span className="text-xs text-white/50">
                              Transaction Hash:{" "}
                            </span>
                            <span className="ml-2 font-mono text-xs text-white/70">
                              {pendingTxHash.slice(0, 10)}...
                              {pendingTxHash.slice(-8)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : lastPriceQuery ? (
                    <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-400"></div>
                        <span className="text-sm font-medium text-green-400">
                          Snapshot Created Successfully
                        </span>
                        <span className="text-xs text-green-300/70">
                          {new Date(
                            lastPriceQuery.timestamp,
                          ).toLocaleTimeString("en-US")}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs text-white/50">
                            Status:{" "}
                          </span>
                          <span className="ml-2 text-lg font-bold text-white">
                            {lastPriceQuery.price}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-white/50">Data: </span>
                          <span className="ml-2 text-white">
                            {lastPriceQuery.marketCap}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                      <p className="text-sm text-white/60">
                        Click &quot;Take Market Snapshot&quot; to query and
                        store price data
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                <div className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400"
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
                  <div className="text-xs text-blue-300">
                    <p className="mb-1 font-medium">
                      📊 Snapshot Instructions:
                    </p>
                    <ul className="space-y-1 text-blue-300/80">
                      <li>
                        • Capture current market snapshot of BTC and competitors
                      </li>
                      <li>• Price data comes from Chainlink oracle network</li>
                      <li>
                        • Snapshot data is permanently stored on blockchain
                      </li>
                      <li>• Can take snapshot at any time (no time limit)</li>
                      <li>• Requires gas fees and wallet signature</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold">Reveal Timeline</h2>
                <span className="text-xs text-white/60">
                  On-chain real data · Trackable Tx
                </span>
              </div>
              <div className="mt-4 space-y-4 text-sm text-white/70">
                {timeline.length > 0 ? (
                  timeline.map((item, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-white/50">
                          {item.time}
                        </span>
                        {index < timeline.length - 1 && (
                          <span
                            className="mt-2 h-full w-px bg-white/10"
                            aria-hidden
                          />
                        )}
                      </div>
                      <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-base text-white">{item.title}</p>
                        <p className="mt-2 text-xs text-white/60">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                    <p className="text-sm text-white/60">
                      No timeline data yet, waiting for Chainlink monitoring...
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold">Reward Claim Guide</h2>
                <Button
                  asChild
                  variant="outline"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                >
                  <Link href="/docs/reward">View Detailed Tutorial</Link>
                </Button>
              </div>
              <ol className="mt-4 space-y-3 text-sm text-white/70">
                <li>
                  1. After Chainlink triggers reveal, the platform will send
                  notification within 5 minutes.
                </li>
                <li>
                  2. Connect wallet and confirm reward claim transaction
                  (signature only, gas-free).
                </li>
                <li>
                  3. View in &quot;My NFT&quot;, current period rewards support
                  cross-chain display.
                </li>
              </ol>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <p className="text-xs tracking-wide text-white/60 uppercase">
                My Winning Records
              </p>

              {!walletConnected ? (
                <div className="mt-4 text-center">
                  <p className="mb-4 text-sm text-white/60">
                    Connect wallet to view your winning records
                  </p>
                  <Button
                    onClick={connectWallet}
                    className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600"
                  >
                    Connect Wallet
                  </Button>
                </div>
              ) : winners.length > 0 ? (
                <>
                  <div className="mt-4 space-y-4 text-sm text-white/70">
                    {winners.map((winner, index) => (
                      <div
                        key={index}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <div className="flex items-center justify-between font-mono text-xs text-white/50">
                          <span>{winner.address}</span>
                          <span>{winner.option}</span>
                        </div>
                        <p className="mt-2 text-base text-white">
                          Reward: {winner.reward}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
                    <p className="text-xs text-green-400">
                      🎉 Congratulations! You have {winners.length} correctly
                      predicted votes
                    </p>
                  </div>
                </>
              ) : votingPeriod?.resolved ? (
                <div className="mt-4 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4">
                  <p className="text-sm text-orange-400">
                    😔 You did not win in this voting period
                  </p>
                  <p className="mt-2 text-xs text-white/60">
                    Continue participating in the next voting period!
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                  <p className="text-sm text-blue-400">
                    ⏳ Voting period in progress
                  </p>
                  <p className="mt-2 text-xs text-white/60">
                    Wait for reveal to view winning status
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <p className="text-xs tracking-wide text-white/60 uppercase">
                FAQ
              </p>
              <ul className="mt-4 space-y-3 text-sm text-white/70">
                <li>
                  · If your prediction is correct but you haven&apos;t received
                  a reward, please submit a ticket within 24 hours.
                </li>
                <li>
                  · NFTs will be stored on Moonbeam by default, can be
                  cross-chained to other networks later.
                </li>
                <li>· Reward claim deadline is 30 days after reveal.</li>
              </ul>
            </div>
          </aside>
        </section>
      </main>
    </>
  );
}
