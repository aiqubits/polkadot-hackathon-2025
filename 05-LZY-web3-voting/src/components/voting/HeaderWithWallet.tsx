"use client";

import Link from "next/link";

import { WalletButton } from "@/components/wallet/WalletButton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { label: "Mint", href: "/mint" },
  { label: "Stake", href: "/stake" },
  { label: "Vote", href: "/vote" },
  { label: "Reveal", href: "/reveal" },
];

const networks = [
  {
    name: "Moonbeam",
    color: "from-cyan-500 to-cyan-300",
  },
  {
    name: "Bifrost",
    color: "from-purple-500 to-purple-300",
  },
  {
    name: "Chainlink",
    color: "from-pink-500 to-pink-300",
  },
];

/**
 * Header component with integrated Web3 wallet support
 * Uses the new WalletButton component for unified wallet management
 */
export function HeaderWithWallet() {
  return (
    <header className="glass-effect sticky top-0 z-50 border-b border-[#e6007a]/20 shadow-lg">
      <div className="container mx-auto flex items-center justify-between gap-6 px-4 py-4">
        <div className="flex flex-1 items-center gap-4">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#e6007a] to-[#552bbf] shadow-lg shadow-[#e6007a]/50 transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-[#e6007a]/70">
              <svg
                className="h-7 w-7 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
              </svg>
            </div>
            <div className="hidden flex-col sm:flex">
              <span className="polkadot-gradient-text font-[family-name:var(--font-heading)] text-base font-bold">
                Web3 Voting
              </span>
              <span className="text-xs text-gray-300">
                Moonbeam × Bifrost × Chainlink
              </span>
            </div>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            {networks.map((network) => (
              <div
                key={network.name}
                className="glass-effect flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs transition-all duration-300 hover:border-[#e6007a]/50 hover:shadow-md hover:shadow-[#e6007a]/20"
              >
                <span
                  className={`h-2 w-2 rounded-full bg-gradient-to-r ${network.color} animate-pulse`}
                />
                <span className="font-semibold text-white">{network.name}</span>
              </div>
            ))}
          </div>
        </div>

        <nav className="hidden items-center gap-3 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative px-2 py-1 text-sm font-semibold text-gray-200 transition-all duration-300 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-gradient-to-r after:from-[#e6007a] after:to-[#552bbf] after:transition-all after:duration-300 hover:scale-110 hover:text-[#e6007a] hover:after:w-full"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10"
                  aria-label="Open Menu"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="border-white/10 bg-slate-950/90 p-0 text-white shadow-[0_0_40px_rgba(59,130,246,0.25)] sm:max-w-sm"
              >
                <div className="relative flex h-full flex-col overflow-hidden">
                  <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),transparent_60%)]" />
                  <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_bottom,_rgba(192,132,252,0.18),transparent_55%)]" />

                  <div className="flex items-center gap-3 px-6 pt-9">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500">
                      <svg
                        className="h-6 w-6 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white">
                        Web3 Voting
                      </span>
                      <span className="text-xs text-white/60">
                        Moonbeam · Bifrost · Chainlink
                      </span>
                    </div>
                  </div>

                  <nav className="mt-10 flex flex-col gap-3 px-6">
                    {navItems.map((item) => (
                      <Link
                        key={`mobile-${item.href}`}
                        href={item.href}
                        className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base font-medium text-white/80 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
                      >
                        <span>{item.label}</span>
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/60 transition group-hover:border-cyan-400/40 group-hover:bg-cyan-500/10 group-hover:text-cyan-200">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.6}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </span>
                      </Link>
                    ))}
                  </nav>

                  <div className="mt-auto px-6 pb-10">
                    <p className="mt-6 text-xs text-white/50">
                      Data is synchronized in real-time from Moonbeam, Bifrost,
                      and Chainlink, keeping track of cross-chain and reveal
                      progress at all times.
                    </p>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
