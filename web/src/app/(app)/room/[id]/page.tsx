'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users, 
  Clock, 
  Trophy, 
  Zap, 
  Camera, 
  Target,
  ArrowLeft,
  Loader2,
  CheckCircle
} from 'lucide-react'
import { roomFactoryAbi, roomAbi } from '@/lib/wagmi-generated'

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

export default function RoomDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const [showWorkoutInterface, setShowWorkoutInterface] = useState(false)
  const [workoutData, setWorkoutData] = useState({
    repCount: 0,
    formScore: 0,
    sessionData: '{}'
  })

  const roomId = params.id as string

  // Get room info from factory
  const { data: roomInfo } = useReadContract({
    address: ROOM_FACTORY_ADDRESS,
    abi: roomFactoryAbi,
    functionName: 'getRoomInfo',
    args: [BigInt(roomId)],
  }) as { data: RoomInfo | undefined }

  // Get room status from the room contract
  const { data: roomStatus } = useReadContract({
    address: roomInfo?.roomAddress as `0x${string}`,
    abi: roomAbi,
    functionName: 'getRoomStatus',
    query: {
      enabled: !!roomInfo?.roomAddress,
    },
  })

  // Get sessions from room
  const { data: sessions } = useReadContract({
    address: roomInfo?.roomAddress as `0x${string}`,
    abi: roomAbi,
    functionName: 'getSessions',
    query: {
      enabled: !!roomInfo?.roomAddress,
    },
  })

  // Check if user has submitted
  const { data: hasSubmitted } = useReadContract({
    address: roomInfo?.roomAddress as `0x${string}`,
    abi: roomAbi,
    functionName: 'hasSubmitted',
    args: address ? [address] : undefined,
    query: {
      enabled: !!roomInfo?.roomAddress && !!address,
    },
  })

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

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

  const handleStartWorkout = () => {
    setShowWorkoutInterface(true)
    // TODO: Initialize MediaPipe pose detection here
    // For now, simulate workout data
    setTimeout(() => {
      setWorkoutData({
        repCount: Math.floor(Math.random() * 20) + 10, // Random 10-30 reps
        formScore: Math.floor(Math.random() * 30) + 70, // Random 70-100 score
        sessionData: JSON.stringify({
          poses: [],
          timestamp: Date.now(),
          exerciseType: roomInfo?.exerciseType
        })
      })
    }, 3000) // Simulate 3 second workout
  }

  const handleSubmitWorkout = async () => {
    if (!roomInfo || !address) return

    try {
      // TODO: Generate proper signature from session data
      const mockSignature = '0x1234'
      
      writeContract({
        address: roomInfo.roomAddress as `0x${string}`,
        abi: roomAbi,
        functionName: 'submitWorkout',
        args: [
          BigInt(workoutData.repCount),
          BigInt(workoutData.formScore),
          mockSignature,
          workoutData.sessionData
        ],
        value: roomInfo.stakeAmount,
      })
    } catch (error) {
      console.error('Error submitting workout:', error)
      alert('Error submitting workout. Please try again.')
    }
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>
              Please connect your wallet to view this competition room.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!roomInfo) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4" />
            <p>Loading room details...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const timeRemaining = formatTimeRemaining(roomInfo.createdAt, roomInfo.duration)
  const isExpired = timeRemaining === 'Expired'
  const isCreator = address === roomInfo.creator

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/room')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Rooms
          </Button>
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Room #{roomId}
              </h1>
              <p className="text-muted-foreground">
                {roomInfo.exerciseType.charAt(0).toUpperCase() + roomInfo.exerciseType.slice(1)} Competition
              </p>
            </div>
            <Badge variant={isExpired ? 'secondary' : 'default'}>
              {isExpired ? 'Expired' : 'Active'}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Room Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Competition Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Exercise Type</p>
                    <p className="font-semibold capitalize">{roomInfo.exerciseType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Stake Amount</p>
                    <p className="font-semibold">{formatEther(roomInfo.stakeAmount)} ETH</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time Remaining</p>
                    <Badge variant={isExpired ? 'secondary' : 'default'}>
                      <Clock className="mr-1 h-3 w-3" />
                      {timeRemaining}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Participants</p>
                    <p className="font-semibold">{Number(roomStatus?.[1] || 0)}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Total Prize Pool</p>
                  <div className="text-2xl font-bold">
                    {formatEther(roomStatus?.[2] || BigInt(0))} ETH
                  </div>
                  <p className="text-sm text-muted-foreground">Winner takes all</p>
                </div>
              </CardContent>
            </Card>

            {/* Workout Interface */}
            {!hasSubmitted && !isExpired && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Submit Your Workout
                  </CardTitle>
                  <CardDescription>
                    Complete your {roomInfo.exerciseType} and submit your performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!showWorkoutInterface ? (
                    <div className="text-center py-8">
                      <Zap className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Ready to Compete?</h3>
                      <p className="text-muted-foreground mb-6">
                        Click start to begin your workout. Your camera will analyze your form and count reps.
                      </p>
                      <Button onClick={handleStartWorkout} size="lg">
                        <Camera className="mr-2 h-4 w-4" />
                        Start Workout
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {workoutData.repCount === 0 ? (
                        <div className="text-center py-8">
                          <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Workout in Progress...</h3>
                          <p className="text-muted-foreground">
                            Perform your {roomInfo.exerciseType} while the AI analyzes your form
                          </p>
                          <Progress value={33} className="mt-4" />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>
                              Workout completed! Review your results below.
                            </AlertDescription>
                          </Alert>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-4 border rounded-lg">
                              <div className="text-2xl font-bold">{workoutData.repCount}</div>
                              <div className="text-sm text-muted-foreground">Reps Completed</div>
                            </div>
                            <div className="text-center p-4 border rounded-lg">
                              <div className="text-2xl font-bold">{workoutData.formScore}%</div>
                              <div className="text-sm text-muted-foreground">Form Score</div>
                            </div>
                          </div>
                          
                          <Button 
                            onClick={handleSubmitWorkout} 
                            className="w-full" 
                            size="lg"
                            disabled={isPending || isConfirming}
                          >
                            {isPending || isConfirming ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {isPending ? 'Submitting...' : 'Confirming...'}
                              </>
                            ) : (
                              'Submit & Stake'
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {hasSubmitted && (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Workout Submitted!</h3>
                  <p className="text-muted-foreground">
                    Your performance has been recorded. Results will be available after the competition ends.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Leaderboard */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Leaderboard
                </CardTitle>
                <CardDescription>
                  Current standings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!sessions || sessions.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="mx-auto h-8 w-8 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No submissions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessions
                      .map((session, index) => ({
                        ...session,
                        score: Number(session.repCount) * Number(session.formScore)
                      }))
                      .sort((a, b) => b.score - a.score)
                      .map((session, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant={index === 0 ? 'default' : 'secondary'}>
                              #{index + 1}
                            </Badge>
                            <div>
                              <p className="font-medium">
                                {session.participant === address ? 'You' : `${session.participant.slice(0, 6)}...`}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {Number(session.repCount)} reps, {Number(session.formScore)}% form
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{session.score}</div>
                            <div className="text-xs text-muted-foreground">score</div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {isCreator && isExpired && (
              <Card>
                <CardHeader>
                  <CardTitle>Finalize Competition</CardTitle>
                  <CardDescription>
                    End the competition and distribute rewards
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">
                    Finalize & Distribute Rewards
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}