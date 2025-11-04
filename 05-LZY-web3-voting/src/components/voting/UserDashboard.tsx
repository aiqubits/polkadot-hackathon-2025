"use client";

import { useUserData } from "@/hooks/useUserData";

export function UserDashboard() {
  const userData = useUserData();
  const cards = [
    {
      label: "Moonbeam DOT",
      value: userData.isLoading
        ? "Loading..."
        : userData.hasError
          ? "Data Error"
          : `${userData.nativeBalance} DOT`,
      helper: "Wallet balance",
      iconColor: "text-cyan-300",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: "Minted vDOT",
      value: userData.isLoading
        ? "Loading..."
        : userData.hasError
          ? "Data Error"
          : `${userData.totalVDOT} vDOT`,
      helper: "Cross-chain successful",
      iconColor: "text-purple-300",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 7l8-4 8 4-8 4-8-4z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 11l8-4"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 19l8-4"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 7l8 4v8"
          />
        </svg>
      ),
    },
    {
      label: "Staked",
      value: userData.isLoading
        ? "Loading..."
        : userData.hasError
          ? "Data Error"
          : `${userData.stakedAmount} vDOT`,
      helper: "Locked in contract",
      iconColor: "text-emerald-300",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 11c1.657 0 3-.895 3-2s-1.343-2-3-2-3 .895-3 2 1.343 2 3 2zm0 0c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2zm0 0V7m0 4v4m0 4v1"
          />
        </svg>
      ),
    },
    {
      label: "Voting Power",
      value: userData.isLoading
        ? "Loading..."
        : userData.hasError
          ? "Data Error"
          : `${userData.votingPower} votes`,
      helper: "Available tickets",
      iconColor: "text-amber-300",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 17l10-10"
          />
        </svg>
      ),
    },
    {
      label: "Ticket Balance",
      value: userData.isLoading
        ? "Loading..."
        : userData.hasError
          ? "Data Error"
          : `${userData.ticketBalance} tickets`,
      helper: "Pending vote",
      iconColor: "text-pink-300",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7l9 6 9-6-9-5-9 5z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 17l9 5 9-5"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l9 5 9-5"
          />
        </svg>
      ),
    },
    {
      label: "Vote Status",
      value: userData.isLoading
        ? "Loading..."
        : userData.hasError
          ? "Data Error"
          : userData.hasVoted
            ? "Submitted"
            : "Pending",
      helper: userData.hasVoted
        ? "Waiting for reveal"
        : "Complete staking to vote",
      iconColor: userData.hasVoted ? "text-green-300" : "text-yellow-300",
      icon: userData.hasVoted ? (
        <svg
          className="h-5 w-5"
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
          className="h-5 w-5"
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
      ),
    },
  ];

  return (
    <section className="mb-16" aria-labelledby="dashboard-title">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2
            id="dashboard-title"
            className="polkadot-gradient-text font-[family-name:var(--font-heading)] text-3xl font-bold"
          >
            My Dashboard
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            Minted and staked data syncs in real-time, all tickets are 1:1 bound
            to on-chain assets.
          </p>
        </div>
        <div className="glass-effect flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-xs transition-all duration-300 hover:border-[#e6007a]/50 hover:shadow-lg hover:shadow-[#e6007a]/20">
          <span
            className={`flex h-2 w-2 rounded-full ${
              userData.isLoading
                ? "animate-pulse bg-[#e6007a]"
                : userData.hasError
                  ? "bg-[#ff4d88]"
                  : "bg-[#56f39a]"
            }`}
          />
          <span className="font-semibold text-white">
            {userData.isLoading
              ? "Syncing..."
              : userData.hasError
                ? "Data Error"
                : "Status Normal"}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card, index) => (
          <div
            key={card.label}
            className="group glass-effect rounded-3xl border border-white/10 p-6 shadow-xl transition-all duration-500 hover:-translate-y-2 hover:border-[#e6007a]/50 hover:shadow-2xl hover:shadow-[#e6007a]/30"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="mb-4 flex items-center justify-between text-sm text-gray-400">
              <span className="font-semibold">{card.label}</span>
              <span className={`${card.iconColor}`}>{card.icon}</span>
            </div>
            <p className="polkadot-gradient-text font-[family-name:var(--font-heading)] text-3xl font-bold">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-white/60">{card.helper}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
