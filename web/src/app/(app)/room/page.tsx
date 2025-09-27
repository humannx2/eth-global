'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAccount, useReadContract } from 'wagmi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Plus, Users, Clock, Trophy, Zap } from 'lucide-react'
import { roomFactoryAbi } from '@/lib/wagmi-generated'
import { formatEther } from 'viem'

// TODO: Get this from deployed contract address
const ROOM_FACTORY_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'

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
  const [rooms, setRooms] = useState<RoomInfo[]>([])

  const { data: activeRoomIds } = useReadContract({
    address: ROOM_FACTORY_ADDRESS,
    abi: roomFactoryAbi,
    functionName: 'getAllActiveRooms',
  })

  const { data: nextRoomId } = useReadContract({
    address: ROOM_FACTORY_ADDRESS,
    abi: roomFactoryAbi,
    functionName: 'nextRoomId',
  })

  // Fetch room details for each active room
  useEffect(() => {
    const fetchRoomDetails = async () => {
      if (!activeRoomIds || activeRoomIds.length === 0) {
        setRooms([])
        return
      }

      // For now, we'll just show the room count since fetching all details
      // would require multiple contract calls
      // In a production app, you'd use a subgraph or backend indexer
      console.log('Active rooms:', activeRoomIds)
    }

    fetchRoomDetails()
  }, [activeRoomIds])

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

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Fitness Competitions</h1>
            <p className="text-muted-foreground">
              Join active competitions or create your own fitness challenge.
            </p>
          </div>
          <Link href="/room/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Room
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
        
        {!activeRoomIds || activeRoomIds.length === 0 ? (
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
            {activeRoomIds.map((roomId) => (
              <Card key={roomId.toString()} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Room #{roomId.toString()}</CardTitle>
                    <Badge>Active</Badge>
                  </div>
                  <CardDescription>
                    Created by {address === '0x...' ? 'You' : '0x...'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Exercise</span>
                      <Badge variant="outline">Loading...</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Stake</span>
                      <span className="font-medium">... ETH</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Participants</span>
                      <span className="font-medium">... / ∞</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Time Left</span>
                      <Badge variant="secondary">
                        <Clock className="mr-1 h-3 w-3" />
                        Loading...
                      </Badge>
                    </div>
                    
                    <Separator />
                    
                    <Link href={`/room/${roomId}`}>
                      <Button className="w-full">
                        View Details
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