"use client";

import type { JSX } from "react";

import Link from "next/link";

import { Button } from "@/components/ui/button";

interface ConnectWalletPanelProps {
  onConnect: () => void;
  isConnecting?: boolean;
}

export function ConnectWalletPanel({
  onConnect,
  isConnecting,
}: ConnectWalletPanelProps) {
  return (
    <section
      id="connect"
      className="mx-auto mb-16 max-w-3xl"
      aria-labelledby="connect-wallet"
    >
      <div className="rounded-3xl border border-white/10 bg-white/10 p-10 text-center backdrop-blur-xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-500">
          <svg
            className="h-8 w-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2
          id="connect-wallet"
          className="mb-3 text-2xl font-semibold text-white"
        >
          Connect Your Moonbeam Wallet
        </h2>
        <p className="mx-auto mb-8 max-w-xl text-sm text-gray-300">
          Connect to Moonbeam network to view DOT assets, initiate SLPx
          cross-chain minting process, and complete vDOT staking and voting in
          minutes.
        </p>
        <Button
          onClick={onConnect}
          disabled={isConnecting}
          size="lg"
          className="border-0 bg-gradient-to-r from-cyan-500 to-purple-500 px-10 text-white hover:from-cyan-600 hover:to-purple-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </Button>
        <p className="mt-6 text-xs text-gray-400">
          Haven&apos;t installed Moonbeam extension?
          <Link
            href="https://docs.moonbeam.network/learn/features/connect/"
            className="ml-1 text-cyan-300 underline-offset-4 hover:underline"
          >
            View Connection Guide
          </Link>
        </p>
      </div>
    </section>
  );
}

export function ProcessTimeline() {
  const steps = [
    {
      title: "Connect Wallet",
      subtitle: "Sync Moonbeam DOT Balance",
      description:
        "After signing authorization, you can detect available DOT and verify network status.",
      iconBg: "from-cyan-500 to-cyan-400",
      href: "#connect",
    },
    {
      title: "Mint vDOT",
      subtitle: "One-click Bifrost SLPx",
      description:
        "Cross-chain bridge automatically completes DOT→vDOT exchange and return.",
      iconBg: "from-purple-500 to-purple-400",
      href: "/mint",
    },
    {
      title: "Stake for Tickets",
      subtitle: "Lock vDOT to Get Voting Rights",
      description:
        "Self-developed contract escrows assets, project team can only proxy governance.",
      iconBg: "from-indigo-500 to-indigo-400",
      href: "/stake",
    },
    {
      title: "Submit Prediction",
      subtitle: "Select BTC Surpass Year",
      description:
        "Chainlink monitors competitor market cap, triggers reveal and distributes NFT.",
      iconBg: "from-pink-500 to-pink-400",
      href: "/vote",
    },
    {
      title: "Join Community",
      subtitle: "Join Group for Latest Activities",
      description:
        "Join Telegram community to interact with core team and predictors in real-time and get reveal notifications first.",
      iconBg: "from-emerald-500 to-teal-400",
      href: "https://t.me/vdot_community",
      external: true,
    },
  ];

  return (
    <section id="flow" className="mb-16" aria-labelledby="process-title">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 id="process-title" className="text-2xl font-semibold text-white">
            Complete Process in Five Minutes
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-300">
            From wallet connection to prediction submission in just four steps,
            the system provides guidance and status feedback at key points to
            ensure cross-chain, staking and voting are completed successfully.
          </p>
        </div>
        <Link
          href="#missions"
          className="text-sm text-cyan-300 underline-offset-4 hover:underline"
        >
          View Interaction Demo
        </Link>
      </div>
      <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
          >
            <div className="mb-4 flex items-center justify-between text-sm text-white/60">
              <span className="flex items-center gap-2">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${step.iconBg} text-sm font-semibold text-white`}
                >
                  {index + 1}
                </span>
                <span className="text-xs tracking-wide text-white/50 uppercase">
                  Step {index + 1}
                </span>
              </span>
              <Link
                href={step.href}
                className="text-xs text-cyan-300 underline-offset-4 hover:underline"
                prefetch={false}
                {...(step.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                Learn More
              </Link>
            </div>
            <h3 className="text-lg font-semibold text-white">{step.title}</h3>
            <p className="mt-1 text-sm text-cyan-200">{step.subtitle}</p>
            <p className="mt-3 text-sm leading-relaxed text-gray-300">
              {step.description}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

import { useUserData } from "@/hooks/useUserData";
import { useAccount } from "wagmi";
import { useMemo } from "react";

export function AssetOverview() {
  const { address } = useAccount();
  const userData = useUserData();
  const walletConnected = Boolean(address);

  // Calculate available minting amount
  const availableToMint = useMemo(() => {
    if (!walletConnected || userData.isLoading) return "--";

    const nativeBalance = parseFloat(userData.nativeBalance);
    const vDOTBalance = parseFloat(userData.vDOTBalance);
    const available = Math.max(nativeBalance - vDOTBalance, 0);

    return available.toFixed(2);
  }, [walletConnected, userData]);
  const cards = [
    {
      label: "Moonbeam DOT Balance",
      value: walletConnected
        ? userData.isLoading
          ? "Loading..."
          : userData.hasError
            ? "Data Error"
            : `${userData.nativeBalance} DOT`
        : "--",
      hint: "Actual balance displayed after wallet connection",
      accent: "from-cyan-500/30 to-cyan-400/20",
    },
    {
      label: "Available to Mint",
      value: walletConnected
        ? userData.isLoading
          ? "Loading..."
          : userData.hasError
            ? "Data Error"
            : `${availableToMint} DOT`
        : "--",
      hint: "Remaining available after deducting reserved staking",
      accent: "from-purple-500/30 to-purple-400/20",
    },
    {
      label: "Minted vDOT",
      value: walletConnected
        ? userData.isLoading
          ? "Loading..."
          : userData.hasError
            ? "Data Error"
            : `${userData.vDOTBalance} vDOT`
        : "--",
      hint: "Auto-updated after successful cross-chain",
      accent: "from-blue-500/30 to-indigo-400/20",
    },
    {
      label: "Ticket Balance",
      value: walletConnected
        ? userData.isLoading
          ? "Loading..."
          : userData.hasError
            ? "Data Error"
            : `${userData.ticketBalance} tickets`
        : "--",
      hint: "1 vDOT = 1 voting ticket",
      accent: "from-pink-500/30 to-pink-400/20",
    },
    {
      label: "Total Staked",
      value: walletConnected
        ? userData.isLoading
          ? "Loading..."
          : userData.hasError
            ? "Data Error"
            : `${userData.stakedAmount} vDOT`
        : "--",
      hint: "Staking contract real-time sync",
      accent: "from-emerald-500/30 to-emerald-400/20",
    },
    {
      label: "Available Voting Power",
      value: walletConnected
        ? userData.isLoading
          ? "Loading..."
          : userData.hasError
            ? "Data Error"
            : `${userData.votingPower} votes`
        : "--",
      hint: "Received immediately after staking",
      accent: "from-orange-500/30 to-amber-400/20",
    },
  ];

  return (
    <section className="mb-16" aria-labelledby="assets-title">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 id="assets-title" className="text-2xl font-semibold text-white">
            Asset Overview
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            Asset data is read from on-chain information in real-time, helping
            you understand mintable amounts, staking status and remaining voting
            power.
          </p>
        </div>
        <Link
          href="/mint"
          className="text-sm text-cyan-300 underline-offset-4 hover:underline"
        >
          Mint vDOT Now
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border border-white/10 bg-gradient-to-br ${card.accent} p-5 backdrop-blur-sm`}
          >
            <p className="text-xs tracking-wide text-white/60 uppercase">
              {card.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-white">
              {card.value}
            </p>
            <p className="mt-2 text-xs text-white/60">{card.hint}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

interface MissionChecklistProps {
  tasks: Array<{ label: string; done: boolean; description: string }>;
}

export function MissionChecklist({ tasks }: MissionChecklistProps) {
  const completed = tasks.filter((task) => task.done).length;
  const progress = Math.round((completed / tasks.length) * 100);

  return (
    <section id="missions" className="mb-16" aria-labelledby="mission-title">
      <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-3xl border border-white/10 bg-white/10 p-8 backdrop-blur-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2
                id="mission-title"
                className="text-2xl font-semibold text-white"
              >
                Beginner Task Checklist
              </h2>
              <p className="text-sm text-gray-300">
                Complete four steps in order to claim your first voting NFT.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200">
              <span className="flex h-2 w-2 rounded-full bg-green-400" />
              {completed}/{tasks.length} Completed
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {tasks.map((task, index) => (
              <div
                key={task.label}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <span className="text-sm text-white/50">0{index + 1}</span>
                <div className="flex flex-1 flex-col">
                  <p className="text-base font-medium text-white">
                    {task.label}
                  </p>
                  <p className="text-sm text-gray-400">{task.description}</p>
                </div>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                    task.done
                      ? "border-green-400 bg-green-500/20 text-green-300"
                      : "border-white/20 bg-white/5 text-white/50"
                  }`}
                  aria-hidden
                >
                  {task.done ? (
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
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
                        d="M12 8v4l3 3"
                      />
                    </svg>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex h-full flex-col justify-between gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 p-6 backdrop-blur-xl">
          <div>
            <p className="text-sm tracking-wide text-gray-200 uppercase">
              Overall Progress
            </p>
            <p className="mt-3 text-4xl font-semibold text-white">
              {progress}%
            </p>
            <p className="mt-2 text-sm text-gray-200">
              After completing all tasks, you can claim limited predictor NFT
              during the reveal phase.
            </p>
          </div>
          <Button
            asChild
            variant="secondary"
            className="border-white/30 bg-white/10 text-white hover:bg-white/20"
          >
            <Link href="/docs/tutorial">View Task Guide</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function FaqSection() {
  const faqs = [
    {
      question: "Why do I need to mint vDOT on Moonbeam first?",
      answer:
        "vDOT is a staking derivative asset on Bifrost. Through SLPx cross-chain, DOT can be automatically converted into a stakable and votable asset.",
    },
    {
      question: "Is the staking contract safe?",
      answer:
        "The staking contract has been audited by third parties and is publicly available on-chain. The project team only has proxy voting rights and cannot transfer users' vDOT.",
    },
    {
      question: "How does Chainlink trigger the reveal?",
      answer:
        "The oracle checks mainstream competitor market cap every 24 hours. When any chain surpasses BTC, it triggers the reveal and records addresses with correct predictions.",
    },
    {
      question: "Can I revoke my vote?",
      answer:
        "After submission, votes lock corresponding tickets and cannot be modified, but you can participate again in the next voting period.",
    },
  ];

  return (
    <section id="faq" className="mb-20" aria-labelledby="faq-title">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 id="faq-title" className="text-2xl font-semibold text-white">
            FAQ & Risk Notice
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-300">
            We&apos;ve compiled the most common questions during participation,
            along with audit and documentation links, to help you complete
            cross-chain and staking operations more safely.
          </p>
        </div>
        <Link
          href="/docs/security"
          className="text-sm text-cyan-300 underline-offset-4 hover:underline"
        >
          View Security Whitepaper
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {faqs.map((faq) => (
          <article
            key={faq.question}
            className="h-full rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
          >
            <h3 className="text-lg font-medium text-white">{faq.question}</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-300">
              {faq.answer}
            </p>
            <Link
              href="/docs/faq"
              className="mt-4 inline-flex items-center text-xs text-cyan-300 underline-offset-4 hover:underline"
            >
              Learn More
              <svg
                className="ml-1 h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ChainlinkStatusCard() {
  return (
    <section
      id="reveal"
      className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs tracking-wide text-white/60 uppercase">
            Chainlink Oracle
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Reveal Monitoring Status
          </h2>
        </div>
        <span className="flex items-center gap-2 rounded-full border border-green-400/50 bg-green-500/10 px-3 py-1 text-xs text-green-300">
          <span className="flex h-2 w-2 rounded-full bg-green-400" />
          Running
        </span>
      </div>
      <div className="space-y-4 text-sm text-gray-200">
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
          <span>Last Check</span>
          <span className="text-white">2025-03-01 14:30 (UTC+0)</span>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
          <span>Monitoring</span>
          <span className="text-white">Top 10 Competitor Market Cap</span>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
          <span>Trigger Condition</span>
          <span className="text-white">Any competitor market cap ≥ BTC</span>
        </div>
      </div>
      <p className="mt-6 text-xs text-gray-400">
        Chainlink data feeds update every 24 hours. After trigger conditions are
        met, the system will automatically settle and distribute reward NFTs.
      </p>
    </section>
  );
}

interface ActionCalloutsProps {
  hasVoted: boolean;
  communityJoined: boolean;
  onJoinCommunity?: () => void;
}

export function ActionCallouts({
  hasVoted,
  communityJoined,
  onJoinCommunity,
}: ActionCalloutsProps) {
  const cards: Array<{
    title: string;
    description: string;
    href: string;
    accent: string;
    icon: JSX.Element;
    external?: boolean;
    onClick?: () => void;
  }> = [
    {
      title: "Mint vDOT",
      description:
        "Complete DOT → vDOT cross-chain exchange with one click through Bifrost SLPx.",
      href: "/mint",
      accent: "from-cyan-500/30 to-cyan-300/20",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      title: "Stake & Get Tickets",
      description:
        "Lock vDOT to get voting rights, smart contract escrows assets to ensure security.",
      href: "/stake",
      accent: "from-purple-500/30 to-purple-300/20",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M3 7l9-4 9 4-9 4-9-4z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M3 17l9 4 9-4"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M3 12l9 4 9-4"
          />
        </svg>
      ),
    },
    {
      title: hasVoted ? "View Vote Results" : "Submit Prediction Now",
      description: hasVoted
        ? "Keep an eye on community prediction trends and reward distribution time."
        : "Select the year range when BTC will be surpassed, submit and wait for Chainlink reveal.",
      href: "/vote",
      accent: "from-pink-500/30 to-pink-300/20",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M9 12l2 2 4-4"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M12 19l9-7-9-7-9 7 9 7z"
          />
        </svg>
      ),
    },
    {
      title: communityJoined ? "Community Joined" : "Join TG Community",
      description: communityJoined
        ? "Welcome back! Latest reveals and proposals will be synced to the group in real-time."
        : "Join Telegram group to get reveal alerts, proposal updates and benefit activities in real-time.",
      href: "https://t.me/vdot_community",
      accent: "from-emerald-500/30 to-teal-300/20",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M7 8h10M7 12h6m-2 8l-4-4H7a4 4 0 01-4-4V8a4 4 0 014-4h10a4 4 0 014 4v4a4 4 0 01-4 4h-2l-4 4z"
          />
        </svg>
      ),
      external: true,
      onClick: onJoinCommunity,
    },
  ];

  return (
    <section className="mb-16" aria-labelledby="actions-title">
      <h2 id="actions-title" className="mb-6 text-2xl font-semibold text-white">
        Quick Access
      </h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className={`group relative flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-br ${card.accent} p-6 backdrop-blur-sm transition hover:-translate-y-1 hover:border-white/30`}
            prefetch={false}
            target={card.external ? "_blank" : undefined}
            rel={card.external ? "noopener noreferrer" : undefined}
            onClick={() => card.onClick?.()}
          >
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white">
                {card.icon}
              </div>
              <h3 className="text-lg font-semibold text-white">{card.title}</h3>
              <p className="mt-3 text-sm text-gray-200">{card.description}</p>
            </div>
            <span className="mt-6 inline-flex items-center text-sm text-cyan-200">
              View Details
              <svg
                className="ml-1 h-4 w-4 transition group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
