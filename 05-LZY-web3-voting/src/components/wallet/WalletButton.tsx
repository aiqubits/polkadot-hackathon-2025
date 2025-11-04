"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useWalletContext } from "@/contexts/WalletContext";
import { useState } from "react";

/**
 * Wallet connection button with modal for selecting wallet type
 */
export function WalletButton() {
  const { isConnected, address, disconnect, connect, isLoading, walletType } =
    useWalletContext();
  const [open, setOpen] = useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleConnect = async (type: "evm" | "substrate") => {
    await connect(type);
    setOpen(false);
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="hidden items-center rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white sm:flex">
          <span className="mr-2 flex h-2 w-2 animate-pulse rounded-full bg-green-400" />
          <span className="mr-2 text-xs text-white/60">
            {walletType === "evm" ? "EVM" : "Substrate"}
          </span>
          {formatAddress(address)}
        </div>
        <Button
          onClick={disconnect}
          variant="outline"
          className="border-white/20 bg-white/5 text-white hover:bg-white/10"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          disabled={isLoading}
          className="border-0 bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:from-cyan-600 hover:to-purple-600"
        >
          {isLoading ? "Connecting..." : "Connect Wallet"}
        </Button>
      </DialogTrigger>
      <DialogContent className="border-white/10 bg-slate-950/95 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Wallet Type</DialogTitle>
          <DialogDescription className="text-gray-400">
            Choose wallet type based on the network you want to use
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <button
            onClick={() => handleConnect("evm")}
            className="group flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-cyan-500/50 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500">
                <svg
                  className="h-6 w-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">
                  EVM Wallet (Moonbeam)
                </h3>
                <p className="text-sm text-gray-400">
                  MetaMask, WalletConnect, etc.
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              EVM-compatible wallets for Moonbeam network
            </p>
          </button>

          <button
            onClick={() => handleConnect("substrate")}
            className="group flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-purple-500/50 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <svg
                  className="h-6 w-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="3" />
                  <circle cx="12" cy="4" r="2" />
                  <circle cx="12" cy="20" r="2" />
                  <circle cx="4" cy="8" r="2" />
                  <circle cx="20" cy="8" r="2" />
                  <circle cx="4" cy="16" r="2" />
                  <circle cx="20" cy="16" r="2" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">
                  Substrate Wallet (Bifrost)
                </h3>
                <p className="text-sm text-gray-400">
                  Polkadot.js, Talisman, SubWallet
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              For Bifrost and other Polkadot ecosystem chains
            </p>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
