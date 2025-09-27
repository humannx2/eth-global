import { cookieStorage, createConfig, createStorage, http } from "wagmi";
import { mainnet, sepolia, hardhat } from "wagmi/chains";
import { coinbaseWallet, injected, metaMask } from "wagmi/connectors";

// Flow testnet chain configuration
export const flowTestnet = {
  id: 545,
  name: 'Flow Testnet',
  network: 'flow-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Flow',
    symbol: 'FLOW',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.evm.nodes.onflow.org'],
    },
    public: {
      http: ['https://testnet.evm.nodes.onflow.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Flow Testnet Explorer',
      url: 'https://evm-testnet.flowscan.io',
    },
  },
  testnet: true,
} as const;

export function getConfig() {
  return createConfig({
    chains: [mainnet, sepolia, hardhat, flowTestnet],
    connectors: [injected(), coinbaseWallet(), metaMask()],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [mainnet.id]: http(),
      [sepolia.id]: http(),
      [hardhat.id]: http(),
      [flowTestnet.id]: http(),
    },
  });
}

declare module "wagmi" {
  interface Register {
    config: ReturnType<typeof getConfig>;
  }
}