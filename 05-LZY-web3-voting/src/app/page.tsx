"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ActionCallouts,
  ConnectWalletPanel,
  FaqSection,
  MissionChecklist,
  ProcessTimeline,
} from "@/components/voting/HomeSections";
import { UserDashboard } from "@/components/voting/UserDashboard";
import { useWalletContext } from "@/contexts/WalletContext";
import { useContractStats } from "@/hooks/useContractStats";

export default function Home() {
  const [communityJoined, setCommunityJoined] = useState(false);

  // Get on-chain statistics
  const contractStats = useContractStats();

  const {
    isConnected: walletConnected,
    connect,
    isLoading: connecting,
  } = useWalletContext();

  const connectWallet = () => connect("evm"); // Default to EVM wallet

  const tasks = useMemo(
    () => [
      {
        label: "Connect Wallet",
        done: walletConnected,
        description: "Switch to Moonbeam network and authorize extension.",
      },
      {
        label: "Mint vDOT",
        done: false,
        description: "Complete DOT → vDOT exchange via SLPx bridge.",
      },
      {
        label: "Stake vDOT",
        done: false,
        description: "Lock vDOT in platform contract to get voting tickets.",
      },
      {
        label: "Submit Prediction",
        done: false,
        description:
          "Select year and confirm transaction, wait for Chainlink reveal.",
      },
      {
        label: "Join TG Community",
        done: communityJoined,
        description:
          "Join Telegram group for reveal alerts and latest activities.",
      },
    ],
    [walletConnected, communityJoined],
  );

  const heroMetrics = useMemo(
    () => [
      {
        label: "Total Minted",
        value: contractStats.isLoading
          ? "Loading..."
          : contractStats.hasError
            ? "Data Error"
            : `${contractStats.totalMinted} vDOT`,
      },
      {
        label: "Total Staked",
        value: contractStats.isLoading
          ? "Loading..."
          : contractStats.hasError
            ? "Data Error"
            : `${contractStats.totalStaked} vDOT`,
      },
      {
        label: "Participating Addresses",
        value: contractStats.isLoading
          ? "Loading..."
          : contractStats.hasError
            ? "Data Error"
            : contractStats.participantCount,
      },
    ],
    [contractStats],
  );

  return (
    <>
      <main className="container mx-auto max-w-7xl px-4 pt-16 pb-20">
        <section className="relative mb-16 grid gap-10 lg:grid-cols-[2fr,1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs tracking-[0.2em] text-white/60 uppercase">
              When Will BTC Be Surpassed by Competitors
            </span>
            <h1 className="mt-6 text-4xl leading-tight font-semibold md:text-5xl lg:text-6xl">
              Complete DOT Cross-Chain Staking with One Click, Predict
              BTC&apos;s Future Turning Point
            </h1>
            <p className="mt-4 max-w-3xl text-base text-white/70 md:text-lg">
              Connect Moonbeam wallet, automatically call Bifrost SLPx to mint
              vDOT, lock assets to get voting tickets, Chainlink oracle monitors
              competitor market cap in real-time and distributes prediction NFTs
              when triggered.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              {walletConnected ? (
                <Button
                  asChild
                  className="border-0 bg-gradient-to-r from-cyan-500 to-purple-500 px-8 text-white hover:from-cyan-600 hover:to-purple-600"
                >
                  <Link href="/mint">Go to Mint Page</Link>
                </Button>
              ) : (
                <Button
                  onClick={connectWallet}
                  disabled={connecting}
                  className="border-0 bg-gradient-to-r from-cyan-500 to-purple-500 px-8 text-white hover:from-cyan-600 hover:to-purple-600"
                >
                  {connecting ? "Connecting..." : "Connect Wallet"}
                </Button>
              )}
              <Button
                asChild
                variant="outline"
                className="border-white/30 bg-white/5 px-8 text-white hover:bg-white/10"
              >
                <Link href="#flow">Learn Full Process</Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-white/60">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-green-400" />
                Chain Status Normal
              </div>
              <div className="flex items-center gap-2">
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Chainlink Update Frequency: Daily at 00:00 UTC
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/70">Real-time Progress</p>
              <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                <span className="flex h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                Live
              </span>
            </div>
            <div className="mt-6 space-y-4">
              {heroMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                >
                  <span className="text-white/60">{metric.label}</span>
                  <span className="text-lg font-semibold text-white">
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs text-white/50">
              {contractStats.hasError
                ? "⚠️ Failed to read on-chain data, please check network connection or switch network"
                : contractStats.isLoading
                  ? "🔄 Syncing on-chain data..."
                  : "✅ Data is read in real-time from smart contracts, auto-updated every 10 seconds"}
            </p>
          </div>
        </section>

        <ProcessTimeline />

        {!walletConnected && (
          <ConnectWalletPanel
            onConnect={connectWallet}
            isConnecting={connecting}
          />
        )}

        <ActionCallouts
          hasVoted={false}
          communityJoined={communityJoined}
          onJoinCommunity={() => setCommunityJoined(true)}
        />

        {walletConnected && (
          <>
            <UserDashboard />
          </>
        )}

        <MissionChecklist tasks={tasks} />
        <FaqSection />
      </main>

      <footer className="border-t border-white/10 bg-black/20">
        <div className="container mx-auto max-w-7xl px-4 py-10 text-sm text-white/60">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p>© 2025 Web3 Voting · Powered by Moonbeam & Bifrost</p>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <Link href="/docs/security" className="hover:text-white">
                Security Audit Report
              </Link>
              <Link href="/docs/tokenomics" className="hover:text-white">
                Tokenomics
              </Link>
              <Link href="/docs/support" className="hover:text-white">
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
