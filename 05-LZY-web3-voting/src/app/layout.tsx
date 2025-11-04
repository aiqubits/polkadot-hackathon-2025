import "@/styles/globals.css";

import { type Metadata } from "next";
import { Inter, Unbounded } from "next/font/google";

import { TRPCReactProvider } from "@/trpc/react";
import { Web3Provider } from "@/providers/Web3Provider";
import { WalletProvider } from "@/contexts/WalletContext";
import { HeaderWithWallet } from "@/components/voting/HeaderWithWallet";

export const metadata: Metadata = {
  title: "Web3 Voting",
  description:
    "Decentralized voting platform on Moonbeam & Bifrost powered by Chainlink",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

// Polkadot-style font system
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const unbounded = Unbounded({
  subsets: ["latin"],
  variable: "--font-unbounded",
  display: "swap",
  preload: true,
  weight: ["400", "600", "700"],
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${unbounded.variable}`}>
      <body className="min-h-screen bg-gradient-to-br from-[#0d0d27] via-[#1a1a3e] to-[#0d0d27] font-sans text-white">
        <TRPCReactProvider>
          <Web3Provider>
            <WalletProvider>
              <HeaderWithWallet />
              {children}
            </WalletProvider>
          </Web3Provider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
