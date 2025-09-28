import { mainnet, sepolia, hardhat } from 'wagmi/chains'
import { flowTestnet } from './wagmi'

export interface ContractAddresses {
  RoomFactory: `0x${string}`
}

export const contractAddresses: Record<number, ContractAddresses> = {
  // Mainnet
  [mainnet.id]: {
    RoomFactory: '0x0000000000000000000000000000000000000000', // Not deployed
  },
  // Sepolia
  [sepolia.id]: {
    RoomFactory: '0x9839385033B11C2678BE017fA774BC05970775bA',
  },
  // Hardhat local
  [hardhat.id]: {
    RoomFactory: '0x0000000000000000000000000000000000000000', // Deploy locally
  },
  // Flow Testnet
  [flowTestnet.id]: {
    RoomFactory: '0x9dd8fbDDEE26E7DdFE19D0cc8BDf01A1144c8340',
  },
}

export function getContractAddress(chainId: number, contractName: keyof ContractAddresses): `0x${string}` {
  const addresses = contractAddresses[chainId]
  if (!addresses) {
    throw new Error(`Unsupported chain ID: ${chainId}`)
  }
  
  const address = addresses[contractName]
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    throw new Error(`Contract ${contractName} not deployed on chain ${chainId}`)
  }
  
  return address
}

export function isContractDeployed(chainId: number, contractName: keyof ContractAddresses): boolean {
  try {
    getContractAddress(chainId, contractName)
    return true
  } catch {
    return false
  }
}