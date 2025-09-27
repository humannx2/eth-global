'use client'

import { useEnsName, formatAddressWithEns } from '@/hooks/use-ens'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface AddressDisplayProps {
  address: `0x${string}` | undefined
  className?: string
  showBadge?: boolean
  truncate?: boolean
}

export function AddressDisplay({ 
  address, 
  className = '', 
  showBadge = false,
  truncate = true 
}: AddressDisplayProps) {
  const { ensName, loading } = useEnsName(address)

  if (!address) {
    return <span className={className}>--</span>
  }

  if (loading) {
    return <Skeleton className={`h-4 w-20 ${className}`} />
  }

  const displayText = ensName || (truncate 
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address)

  if (showBadge) {
    return (
      <Badge variant={ensName ? "default" : "secondary"} className={className}>
        {displayText}
      </Badge>
    )
  }

  return (
    <span className={className} title={address}>
      {displayText}
    </span>
  )
}