import { defineChain } from "viem";

/**
 * Moonbeam Network Configuration
 * Moonbeam is an EVM-compatible smart contract platform on Polkadot
 */
export const moonbeam = defineChain({
  id: 1284,
  name: "Moonbeam",
  network: "moonbeam",
  nativeCurrency: {
    decimals: 18,
    name: "GLMR",
    symbol: "GLMR",
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_MOONBEAM_RPC_URL ??
          "https://rpc.api.moonbeam.network",
      ],
      webSocket: ["wss://wss.api.moonbeam.network"],
    },
    public: {
      http: ["https://rpc.api.moonbeam.network"],
      webSocket: ["wss://wss.api.moonbeam.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Moonscan",
      url: "https://moonscan.io",
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 609002,
    },
  },
  testnet: false,
});

/**
 * Moonriver Network Configuration (Kusama parachain)
 */
export const moonriver = defineChain({
  id: 1285,
  name: "Moonriver",
  network: "moonriver",
  nativeCurrency: {
    decimals: 18,
    name: "MOVR",
    symbol: "MOVR",
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_MOONRIVER_RPC_URL ??
          "https://rpc.api.moonriver.moonbeam.network",
      ],
      webSocket: ["wss://wss.api.moonriver.moonbeam.network"],
    },
    public: {
      http: ["https://rpc.api.moonriver.moonbeam.network"],
      webSocket: ["wss://wss.api.moonriver.moonbeam.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Moonscan",
      url: "https://moonriver.moonscan.io",
    },
  },
  testnet: false,
});

/**
 * Moonbase Alpha Network Configuration
 * Moonbeam testnet for development and testing
 */
export const moonbaseAlpha = defineChain({
  id: 1287,
  name: "Moonbase Alpha",
  network: "moonbase-alpha",
  nativeCurrency: {
    decimals: 18,
    name: "DEV",
    symbol: "DEV",
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_MOONBASE_ALPHA_RPC_URL ??
          "https://rpc.api.moonbase.moonbeam.network",
      ],
      webSocket: ["wss://wss.api.moonbase.moonbeam.network"],
    },
    public: {
      http: ["https://rpc.api.moonbase.moonbeam.network"],
      webSocket: ["wss://wss.api.moonbase.moonbeam.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Moonscan",
      url: "https://moonbase.moonscan.io",
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 1850686,
    },
  },
  testnet: true,
});

/**
 * PolkaVM Local Network Configuration
 * For PolkaVM local development and testing
 */
export const polkavm = defineChain({
  id: 420420420,
  name: "PolkaVM Local",
  network: "polkavm",
  nativeCurrency: {
    decimals: 18,
    name: "PolkaVM Token",
    symbol: "PVM",
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
    },
    public: {
      http: ["http://127.0.0.1:8545"],
    },
  },
  testnet: true,
});

/**
 * Hardhat Local Network Configuration
 * For local development and testing
 */
export const hardhat = defineChain({
  id: 31337,
  name: "Hardhat Local",
  network: "hardhat",
  nativeCurrency: {
    decimals: 18,
    name: "DOT",
    symbol: "DOT",
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
    },
    public: {
      http: ["http://127.0.0.1:8545"],
    },
  },
  testnet: true,
});

/**
 * Supported chains for the application
 */
export const supportedChains = [
  moonbaseAlpha,
  moonbeam,
  moonriver,
  polkavm,
  hardhat,
] as const;

/**
 * Get chain configuration by chain ID
 */
export function getChainById(chainId: number) {
  switch (chainId) {
    case 1287:
      return moonbaseAlpha;
    case 1284:
      return moonbeam;
    case 1285:
      return moonriver;
    case 420420420:
      return polkavm;
    case 31337:
      return hardhat;
    default:
      console.warn(
        `Unsupported chain ID: ${chainId}, falling back to Moonbase Alpha`,
      );
      return moonbaseAlpha;
  }
}
