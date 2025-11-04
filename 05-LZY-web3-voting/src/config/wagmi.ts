import { cookieStorage, createConfig, createStorage, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { moonbaseAlpha, moonbeam, moonriver, polkavm, hardhat } from "./chains";

/**
 * Create HTTP transport with retry and timeout configuration
 * This helps prevent "circuit breaker is open" errors
 */
const createHttpTransport = (url?: string) => {
  return http(url, {
    retryCount: 3, // Retry up to 3 times
    retryDelay: 1000, // Wait 1 second between retries
    timeout: 30000, // 30 second timeout
    fetchOptions: {
      cache: "no-store", // Prevent caching issues
    },
  });
};

// Get WalletConnect project ID from environment - only on client side
const projectId =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
    : undefined;

// Only show warning on client side
if (typeof window !== "undefined" && !projectId) {
  console.warn(
    "⚠️  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. Get one at https://cloud.walletconnect.com",
  );
}

/**
 * Create wagmi configuration with proper SSR handling
 * This function ensures WalletConnect is only initialized on the client side
 */
function createWagmiConfig() {
  const connectors = [
    // Injected connector for browser wallets (MetaMask, etc.)
    injected({
      target: "metaMask",
    }),
  ];

  // Temporarily disable WalletConnect to prevent SSR issues
  // TODO: Re-enable WalletConnect with proper SSR handling
  // if (typeof window !== "undefined" && projectId) {
  //   connectors.push(walletConnect({ ... }));
  // }

  return createConfig({
    chains: [moonbaseAlpha, moonbeam, moonriver, polkavm, hardhat],
    connectors,
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    multiInjectedProviderDiscovery: false, // Prevent multiple provider detection
    transports: {
      [moonbaseAlpha.id]: createHttpTransport(
        process.env.NEXT_PUBLIC_MOONBASE_ALPHA_RPC_URL ??
          "https://rpc.api.moonbase.moonbeam.network",
      ),
      [moonbeam.id]: createHttpTransport(
        process.env.NEXT_PUBLIC_MOONBEAM_RPC_URL ??
          "https://rpc.api.moonbeam.network",
      ),
      [moonriver.id]: createHttpTransport(
        process.env.NEXT_PUBLIC_MOONRIVER_RPC_URL ??
          "https://rpc.api.moonriver.moonbeam.network",
      ),
      [polkavm.id]: createHttpTransport("http://127.0.0.1:8545"),
      [hardhat.id]: createHttpTransport("http://127.0.0.1:8545"),
    },
  });
}

/**
 * Wagmi configuration for EVM chains (Moonbeam, Moonriver)
 * This config is a singleton - created once and reused across the app
 * to prevent WalletConnect from being initialized multiple times
 */
export const wagmiConfig = createWagmiConfig();
