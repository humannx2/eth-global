"use client"

import { useAccount, useConnect } from 'wagmi'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Wallet, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface WalletConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  redirectTo?: string
  title?: string
  description?: string
}

export function WalletConnectionDialog({
  open,
  onOpenChange,
  redirectTo,
  title = "Connect Wallet Required",
  description = "Please connect your wallet to access this feature."
}: WalletConnectionDialogProps) {
  const { isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const router = useRouter()

  // Auto-redirect when wallet gets connected
  useEffect(() => {
    if (isConnected && redirectTo) {
      onOpenChange(false)
      router.push(redirectTo)
    }
  }, [isConnected, redirectTo, router, onOpenChange])

  // Close dialog when wallet gets connected (even without redirect)
  useEffect(() => {
    if (isConnected) {
      onOpenChange(false)
    }
  }, [isConnected, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 text-sm">
              <Wallet className="h-4 w-4" />
              <span className="font-medium">Wallet Required</span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              StakeFit requires a connected wallet to participate in fitness competitions and stake crypto rewards.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Choose a wallet to connect:</p>
            {connectors.map((connector) => (
              <Button
                key={connector.uid}
                onClick={() => connect({ connector })}
                disabled={isPending}
                variant="outline"
                className="w-full justify-start"
              >
                <Wallet className="h-4 w-4 mr-2" />
                {connector.name}
                {isPending && <span className="ml-auto text-xs">Connecting...</span>}
              </Button>
            ))}
          </div>

          <div className="text-xs text-muted-foreground text-center">
            <p>
              Don&apos;t have a wallet? Try&nbsp;
              <a 
                href="https://metamask.io/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="underline hover:text-foreground"
              >
                MetaMask
              </a>
              {' '}or{' '}
              <a 
                href="https://walletconnect.com/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="underline hover:text-foreground"
              >
                WalletConnect
              </a>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
