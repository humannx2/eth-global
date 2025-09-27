'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useWalletClient, useChainId } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { roomFactoryAbi, roomAbi } from '@/lib/wagmi-generated'
import { MediaPipeWorkout } from '@/components/MediaPipeWorkout'
import { AddressDisplay } from '@/components/AddressDisplay'
import { getContractAddress, isContractDeployed } from '@/lib/contracts'
import { sepolia } from 'wagmi/chains'
import { flowTestnet } from '@/lib/wagmi'
import { generateRoomEnsName } from '@/hooks/use-ens'
import type { RepSegment } from '@/lib/mediapipe-utils'

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
  const id = params.id as string
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const { data: walletClient } = useWalletClient()
  const [showWorkoutInterface, setShowWorkoutInterface] = useState(false)
  const [workoutData, setWorkoutData] = useState({
    repCount: 0,
    formScore: 0,
    sessionData: '{}',
    repSegments: [] as RepSegment[]
  })

  const roomId = params.id as string
  
  // Check if contracts are deployed on current chain
  const isSupported = isContractDeployed(chainId, 'RoomFactory')

  // Get room info from factory
  const { data: roomInfo } = useReadContract({
    address: isSupported ? getContractAddress(chainId, 'RoomFactory') : undefined,
    abi: roomFactoryAbi,
    functionName: 'getRoomInfo',
    args: [BigInt(roomId)],
    query: {
      enabled: isSupported && isConnected,
    }
  }) as { data: RoomInfo | undefined }

  // Get exercise config from the room contract
  const { data: contractExerciseConfig } = useReadContract({
    address: roomInfo?.roomAddress as `0x${string}`,
    abi: roomAbi,
    functionName: 'exerciseConfig',
    query: {
      enabled: !!roomInfo?.roomAddress,
    },
  }) as { data: string | undefined }

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

  const handleWorkoutComplete = (data: {
    repCount: number
    formScore: number
    sessionData: string
    repSegments: RepSegment[]
  }) => {
    setWorkoutData(data)
  }

  const handleSubmitWorkout = async () => {
    if (!roomInfo || !address) return

    try {
      // Generate signature from workout session data
      const message = JSON.stringify({
        roomId: id,
        address,
        repCount: workoutData.repCount,
        formScore: workoutData.formScore,
        timestamp: Date.now()
      })
      
      // Sign the message using the connected wallet
      const signature = await walletClient?.signMessage({ message })
      
      if (!signature) {
        throw new Error('Failed to sign workout data')
      }
      
      writeContract({
        address: roomInfo.roomAddress as `0x${string}`,
        abi: roomAbi,
        functionName: 'submitWorkout',
        args: [
          BigInt(workoutData.repCount),
          BigInt(workoutData.formScore),
          signature,
          workoutData.sessionData
        ],
        value: roomInfo.stakeAmount,
      })
    } catch (error) {
      console.error('Error submitting workout:', error)
      alert('Error submitting workout. Please try again.')
    }
  }

  const handleFinalizeRoom = async () => {
    if (!roomInfo || !address || !isCreator) {
      alert('Only the room creator can finalize the competition')
      return
    }

    if (!isExpired) {
      alert('Competition is still active. Wait for it to expire before finalizing.')
      return
    }

    try {
      writeContract({
        address: roomInfo.roomAddress as `0x${string}`,
        abi: roomAbi,
        functionName: 'finalizeRoom',
      })
      
    } catch (error) {
      console.error('Error finalizing room:', error)
      alert('Error finalizing room. Please try again.')
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

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>
              Please connect your wallet to view this fitness competition room.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!isSupported) {
    const getNetworkInfo = () => {
      if (chainId === sepolia.id) return { name: 'Sepolia Testnet', supported: true }
      if (chainId === flowTestnet.id) return { name: 'Flow Testnet', supported: true }
      if (chainId === 1) return { name: 'Ethereum Mainnet', supported: false }
      return { name: `Chain ${chainId}`, supported: false }
    }

    const networkInfo = getNetworkInfo()
    
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Unsupported Network
            </CardTitle>
            <CardDescription>
              FitStake is available on Sepolia and Flow testnets. Please switch networks to view rooms.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Current network: {networkInfo.name}
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Button 
                onClick={() => switchChain({ chainId: sepolia.id })}
                className="w-full"
                variant="outline"
              >
                Switch to Sepolia Testnet
              </Button>
              <Button 
                onClick={() => switchChain({ chainId: flowTestnet.id })}
                className="w-full"
                variant="outline"
              >
                🌊 Switch to Flow Testnet
              </Button>
            </div>
          </CardContent>
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
  const proposedEnsName = generateRoomEnsName(roomId, roomInfo.exerciseType)

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
              <div className="mt-2">
                <Badge variant="outline" className="font-mono text-xs">
                  🏷️ {proposedEnsName}
                </Badge>
              </div>
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
                    <p className="text-sm text-muted-foreground">Creator</p>
                    <AddressDisplay 
                      address={roomInfo.creator as `0x${string}`}
                      className="font-semibold"
                      showBadge
                    />
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
                  <div className="text-2xl font-bold mb-2">
                    {formatEther(roomStatus?.[2] || BigInt(0))} ETH
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">🥇 1st Place:</span>
                      <span className="font-semibold text-yellow-600">
                        {formatEther((roomStatus?.[2] || BigInt(0)) * BigInt(50) / BigInt(100))} ETH (50%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">🥈 2nd Place:</span>
                      <span className="font-semibold text-gray-600">
                        {formatEther((roomStatus?.[2] || BigInt(0)) * BigInt(30) / BigInt(100))} ETH (30%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">🥉 3rd Place:</span>
                      <span className="font-semibold text-amber-600">
                        {formatEther((roomStatus?.[2] || BigInt(0)) * BigInt(20) / BigInt(100))} ETH (20%)
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    💪 Performance = Reps × Form Score
                  </p>
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
                        Click start to begin your workout. AI will analyze your form and count reps.
                      </p>
                      <Button onClick={() => setShowWorkoutInterface(true)} size="lg">
                        <Camera className="mr-2 h-4 w-4" />
                        Start Workout
                      </Button>
                    </div>
                  ) : (
                    <>
                      {workoutData.repCount === 0 ? (
                        <MediaPipeWorkout
                          exerciseType={roomInfo.exerciseType}
                          exerciseConfig={contractExerciseConfig}
                          onWorkoutComplete={handleWorkoutComplete}
                          onWorkoutStart={() => console.log('Workout started')}
                          onWorkoutStop={() => console.log('Workout stopped')}
                        />
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
                    </>
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
                              <AddressDisplay 
                                address={session.participant as `0x${string}`}
                                className="font-medium"
                                truncate={session.participant !== address}
                              />
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
                    End the competition and distribute rewards to winners
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isSuccess && hash ? (
                    <div className="text-center py-4">
                      <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                      <p className="text-sm text-green-600 font-medium">
                        Competition finalized! Rewards distributed.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Transaction: {hash.slice(0, 10)}...
                      </p>
                    </div>
                  ) : (
                    <Button 
                      className="w-full" 
                      onClick={handleFinalizeRoom}
                      disabled={isPending || isConfirming}
                    >
                      {isPending || isConfirming ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {isPending ? 'Finalizing...' : 'Confirming...'}
                        </>
                      ) : (
                        <>
                          <Trophy className="mr-2 h-4 w-4" />
                          Finalize & Distribute Rewards
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}