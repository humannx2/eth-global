import { cookieStorage, createConfig, createStorage, http } from "wagmi";
import { mainnet, sepolia, hardhat } from "wagmi/chains";
import { coinbaseWallet, injected, metaMask } from "wagmi/connectors";

export function getConfig() {
  return createConfig({
    chains: [mainnet, sepolia, hardhat],
    connectors: [injected(), coinbaseWallet(), metaMask()],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [mainnet.id]: http(),
      [sepolia.id]: http(),
      [hardhat.id]: http(),
    },
  });
}

declare module "wagmi" {
  interface Register {
    config: ReturnType<typeof getConfig>;
  }
}