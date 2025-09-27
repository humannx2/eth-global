'use client'

import { useAccount, useSwitchChain, useChainId } from 'wagmi'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from '@/components/ui/badge'
import { Loader2, Network, CheckCircle } from 'lucide-react'
import { contractAddresses } from '@/lib/contracts'
import { sepolia } from 'wagmi/chains'
import { flowTestnet } from '@/lib/wagmi'

// Get chains where we have deployed contracts
const getSupportedChains = () => {
  return Object.keys(contractAddresses).map(chainId => {
    const id = parseInt(chainId)
    
    if (id === sepolia.id) {
      return { 
        id, 
        name: 'Sepolia', 
        label: 'Sepolia Testnet',
        icon: '🔷',
        color: 'bg-blue-100 text-blue-800'
      }
    }
    
    if (id === flowTestnet.id) {
      return { 
        id, 
        name: 'Flow', 
        label: 'Flow Testnet',
        icon: '🌊',
        color: 'bg-cyan-100 text-cyan-800'
      }
    }
    
    return null
  }).filter(Boolean)
}

export function NetworkSwitcher() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending } = useSwitchChain()
  
  const supportedChains = getSupportedChains()
  const currentChain = supportedChains.find(chain => chain?.id === chainId)

  if (!isConnected) {
    return null
  }

  const handleChainSwitch = (newChainId: string) => {
    const chainId = parseInt(newChainId)
    if (chainId !== currentChain?.id) {
      switchChain({ chainId: chainId as 1 | 545 | 11155111 | 31337 })
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Network className="h-3 w-3" />
        Network
      </div>
      
      <Select 
        value={currentChain?.id?.toString() || ''} 
        onValueChange={handleChainSwitch}
        disabled={isPending}
      >
        <SelectTrigger className="w-full h-9 text-sm">
          <SelectValue>
            <div className="flex items-center gap-2">
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <span>{currentChain?.icon || '❓'}</span>
              )}
              <span className="truncate">
                {isPending ? 'Switching...' : (currentChain?.name || 'Unknown')}
              </span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {supportedChains.map((chain) => (
            <SelectItem key={chain?.id} value={chain?.id.toString() || ''}>
              <div className="flex items-center gap-2 w-full">
                <span>{chain?.icon}</span>
                <span className="flex-1">{chain?.label}</span>
                {chainId === chain?.id && (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {currentChain && (
        <Badge 
          variant="outline" 
          className={`w-full justify-center text-xs ${currentChain.color || 'bg-gray-100 text-gray-800'}`}
        >
          Contracts Deployed
        </Badge>
      )}
    </div>
  )
}