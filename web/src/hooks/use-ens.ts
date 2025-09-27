'use client'

import { useState, useEffect } from 'react'
import { createPublicClient, http, isAddress, namehash } from 'viem'
import { mainnet } from 'viem/chains'
import { normalize } from 'viem/ens'

// Create a public client for ENS resolution (always use mainnet for ENS)
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
})

export function useEnsName(address: `0x${string}` | undefined) {
  const [ensName, setEnsName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!address || !isAddress(address)) {
      setEnsName(null)
      return
    }

    setLoading(true)
    
    publicClient
      .getEnsName({ address })
      .then((name) => setEnsName(name))
      .catch(() => setEnsName(null))
      .finally(() => setLoading(false))
  }, [address])

  return { ensName, loading }
}

export function useEnsAddress(name: string | undefined) {
  const [address, setAddress] = useState<`0x${string}` | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!name || !name.includes('.eth')) {
      setAddress(null)
      return
    }

    setLoading(true)
    
    try {
      const normalizedName = normalize(name)
      publicClient
        .getEnsAddress({ name: normalizedName })
        .then((addr) => setAddress(addr))
        .catch(() => setAddress(null))
        .finally(() => setLoading(false))
    } catch {
      setAddress(null)
      setLoading(false)
    }
  }, [name])

  return { address, loading }
}

// Generate room ENS subname
export function generateRoomEnsName(roomId: string, exerciseType: string): string {
  const sanitized = exerciseType.toLowerCase().replace(/[^a-z0-9]/g, '')
  const timestamp = Date.now().toString(36).slice(-4) // Last 4 chars for uniqueness
  return `${sanitized}-${roomId}-${timestamp}.fitstake.eth`
}

// Check if a room ENS name is available
export function useEnsAvailability(name: string | undefined) {
  const [available, setAvailable] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!name || !name.includes('.fitstake.eth')) {
      setAvailable(null)
      return
    }

    setLoading(true)
    
    publicClient
      .getEnsAddress({ name: normalize(name) })
      .then((addr) => setAvailable(!addr)) // Available if no address is set
      .catch(() => setAvailable(true)) // Available if resolution fails
      .finally(() => setLoading(false))
  }, [name])

  return { available, loading }
}

// Helper function to format address with ENS name
export function formatAddressWithEns(address: `0x${string}` | undefined, ensName: string | null): string {
  if (!address) return '0x...'
  if (ensName) return ensName
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}