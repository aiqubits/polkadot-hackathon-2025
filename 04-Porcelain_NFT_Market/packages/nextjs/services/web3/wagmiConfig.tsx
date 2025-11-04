import { wagmiConnectors } from "./wagmiConnectors";
import { Chain, createClient, http } from "viem";
import { hardhat } from "viem/chains";
import { createConfig } from "wagmi";
import scaffoldConfig from "~~/scaffold.config";

const { targetNetworks } = scaffoldConfig;

// Only use target networks for testnet-only setup
export const enabledChains = targetNetworks;

export const wagmiConfig = createConfig({
  chains: enabledChains,
  connectors: wagmiConnectors,
  ssr: true,
  client({ chain }) {
    // 为不同链使用不同的 RPC 端点，包含备用端点
    let transport;
    if (chain.id === 1287) {
      // Moonbase Alpha - 使用官方 RPC 和备用端点
      transport = http("https://rpc.api.moonbase.moonbeam.network", {
        retryCount: 3,
        retryDelay: 1000,
      });
    } else if (chain.id === 420420422) {
      // Polkadot Hub Testnet - 使用官方 RPC，增加重试机制
      transport = http("https://testnet-passet-hub-eth-rpc.polkadot.io", {
        retryCount: 5,
        retryDelay: 2000,
        timeout: 30000, // 30秒超时
      });
    } else {
      // 其他链使用默认 RPC
      transport = http(chain.rpcUrls.default.http[0], {
        retryCount: 3,
        retryDelay: 1000,
      });
    }

    return createClient({
      chain,
      transport,
      ...(chain.id !== (hardhat as Chain).id
        ? {
            pollingInterval: scaffoldConfig.pollingInterval,
          }
        : {}),
    });
  },
});
