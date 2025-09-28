'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAccount, useReadContract, useChainId, usePublicClient, useSwitchChain } from 'wagmi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Users, Clock, Trophy, Zap, AlertTriangle } from 'lucide-react'
import { roomFactoryAbi } from '@/lib/wagmi-generated'
import { getContractAddress, isContractDeployed } from '@/lib/contracts'
import { formatEther } from 'viem'
import { sepolia } from 'wagmi/chains'

interface RoomInfo {
  roomAddress: string
  creator: string
  exerciseType: string
  stakeAmount: bigint
  duration: bigint
  createdAt: bigint
  active: boolean
}

export default function RoomsPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { switchChain } = useSwitchChain()
  const [rooms, setRooms] = useState<RoomInfo[]>([])
  const [loading, setLoading] = useState(false)

  // Check if contracts are deployed on current chain
  const isSupported = isContractDeployed(chainId, 'RoomFactory')

  const { data: activeRoomIds } = useReadContract({
    address: isSupported ? getContractAddress(chainId, 'RoomFactory') : undefined,
    abi: roomFactoryAbi,
    functionName: 'getAllActiveRooms',
    query: {
      enabled: isSupported && isConnected,
    }
  })

  const { data: nextRoomId } = useReadContract({
    address: isSupported ? getContractAddress(chainId, 'RoomFactory') : undefined,
    abi: roomFactoryAbi,
    functionName: 'nextRoomId',
    query: {
      enabled: isSupported && isConnected,
    }
  })

  // Fetch room details for each active room
  useEffect(() => {
    const fetchRoomDetails = async () => {
      if (!activeRoomIds || activeRoomIds.length === 0 || !publicClient || !isSupported) {
        setRooms([])
        return
      }

      try {
        setLoading(true)
        console.log('Fetching details for room IDs:', activeRoomIds)

        // Fetch room info for each active room ID
        const roomPromises = activeRoomIds.map(async (roomId: bigint) => {
          try {
            const roomInfo = await publicClient.readContract({
              address: getContractAddress(chainId, 'RoomFactory'),
              abi: roomFactoryAbi,
              functionName: 'getRoomInfo',
              args: [roomId],
            }) as RoomInfo

            return { ...roomInfo, roomId }
          } catch (error) {
            console.error(`Error fetching room ${roomId}:`, error)
            return null
          }
        })

        const roomDetails = await Promise.all(roomPromises)
        const validRooms = roomDetails.filter((room): room is RoomInfo & { roomId: bigint } => room !== null)
        
        setRooms(validRooms)
        console.log('Fetched room details:', validRooms)
      } catch (error) {
        console.error('Error fetching room details:', error)
        setRooms([])
      } finally {
        setLoading(false)
      }
    }

    fetchRoomDetails()
  }, [activeRoomIds, publicClient, chainId, isSupported])

  const formatTimeRemaining = (createdAt: bigint, duration: bigint) => {
    const endTime = Number(createdAt) + Number(duration)
    const now = Math.floor(Date.now() / 1000)
    const remaining = endTime - now

    if (remaining <= 0) return 'Expired'
    
    const hours = Math.floor(remaining / 3600)
    const minutes = Math.floor((remaining % 3600) / 60)
    
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>
              Please connect your wallet to view fitness competition rooms.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!isSupported) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Unsupported Network
            </CardTitle>
            <CardDescription>
              StakeFit is currently only deployed on Sepolia testnet. Please switch networks to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Current network: {chainId === 1 ? 'Ethereum Mainnet' : `Chain ${chainId}`}
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => switchChain({ chainId: sepolia.id })}
              className="w-full"
            >
              Switch to Sepolia Testnet
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              You can get Sepolia ETH from faucets like{' '}
              <a href="https://sepoliafaucet.com/" target="_blank" rel="noopener noreferrer" className="underline">
                sepoliafaucet.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Fitness Competitions</h1>
            <p className="text-muted-foreground">
              💪 Compete, perform, earn! Win up to 50% of the prize pool for 1st place.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              🏆 Top 3 winners share rewards: 50% • 30% • 20%
            </p>
          </div>
          <Link href="/room/create">
            <Button size="lg" className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
              <Plus className="mr-2 h-4 w-4" />
              Create Competition
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-sm font-medium leading-none">Total Rooms</p>
                  <p className="text-2xl font-bold">{Number(nextRoomId || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-sm font-medium leading-none">Active</p>
                  <p className="text-2xl font-bold">{activeRoomIds?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-sm font-medium leading-none">Participants</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-sm font-medium leading-none">Total Stakes</p>
                  <p className="text-2xl font-bold">0 ETH</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Active Competitions</h2>
        
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading competitions...</p>
            </CardContent>
          </Card>
        ) : !activeRoomIds || activeRoomIds.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Competitions</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to create a fitness competition and challenge others to compete!
              </p>
              <Link href="/room/create">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Room
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room, index) => (
              <Card key={`room-${index}`} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{room.exerciseType}</CardTitle>
                    <Badge>Active</Badge>
                  </div>
                  <CardDescription>
                    Created by {room.creator === address ? 'You' : `${room.creator.slice(0, 6)}...${room.creator.slice(-4)}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Pool</span>
                      <span className="font-medium">{formatEther(room.stakeAmount)} ETH</span>
                    </div>
                    
                    {/* Prize Breakdown */}
                    <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-3 rounded-lg border">
                      <div className="text-xs font-medium text-gray-700 mb-1">💰 Win up to:</div>
                      <div className="flex justify-between text-xs">
                        <span>🥇 {formatEther(room.stakeAmount * BigInt(50) / BigInt(100))} ETH</span>
                        <span>🥈 {formatEther(room.stakeAmount * BigInt(30) / BigInt(100))} ETH</span>
                        <span>🥉 {formatEther(room.stakeAmount * BigInt(20) / BigInt(100))} ETH</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Duration</span>
                      <span className="font-medium">{Number(room.duration) / 3600}h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Time Left</span>
                      <Badge variant="secondary">
                        <Clock className="mr-1 h-3 w-3" />
                        {formatTimeRemaining(room.createdAt, room.duration)}
                      </Badge>
                    </div>
                    
                    <Separator />
                    
                    <Link href={`/room/${(room as { roomId?: number | string }).roomId || index}`}>
                      <Button className="w-full">
                        🏆 Join Competition
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}