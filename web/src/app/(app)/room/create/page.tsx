'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { parseEther } from 'viem'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Plus, Timer, Users, AlertTriangle } from 'lucide-react'
import { roomFactoryAbi } from '@/lib/wagmi-generated'
import { ExerciseConfigGenerator } from '@/components/ExerciseConfigGenerator'
import { getContractAddress, isContractDeployed } from '@/lib/contracts'
import { useChainId } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import type { ExerciseConfig } from '@/lib/mediapipe-utils'

export default function CreateRoomPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const [exerciseType, setExerciseType] = useState('')
  const [stakeAmount, setStakeAmount] = useState('')
  const [duration, setDuration] = useState('')
  const [generatedConfig, setGeneratedConfig] = useState<ExerciseConfig | null>(null)

  // Check if contracts are deployed on current chain
  const isSupported = isContractDeployed(chainId, 'RoomFactory')

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const handleConfigGenerated = (config: ExerciseConfig) => {
    setGeneratedConfig(config)
    // Auto-fill exercise type if it matches the config name
    if (config.name && !exerciseType) {
      setExerciseType(config.name.replace(/_/g, ' '))
    }
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isConnected || !address) {
      alert('Please connect your wallet first')
      return
    }

    if (!exerciseType || !stakeAmount || !duration) {
      alert('Please fill in all required fields')
      return
    }

    const durationInSeconds = parseInt(duration) * 60 // Convert minutes to seconds
    const stakeAmountWei = parseEther(stakeAmount)

    // Use generated config or default config for pushups if not provided
    const configToUse = generatedConfig ? JSON.stringify(generatedConfig) : JSON.stringify({
      name: 'pushup',
      initialDirection: 'up',
      inverted: true,
      minPeakDistance: 10,
      anglePoints: [
        {
          name: 'left_elbow',
          points: [11, 13, 15],
          weight: 1.0,
          targetLowAngle: 60,
          targetHighAngle: 160
        },
        {
          name: 'right_elbow',
          points: [12, 14, 16],
          weight: 1.0,
          targetLowAngle: 60,
          targetHighAngle: 160
        }
      ]
    })

    try {
      writeContract({
        address: getContractAddress(chainId, 'RoomFactory'),
        abi: roomFactoryAbi,
        functionName: 'createRoom',
        args: [
          exerciseType,
          stakeAmountWei,
          BigInt(durationInSeconds),
          configToUse
        ],
        value: stakeAmountWei,
      })
    } catch (error) {
      console.error('Error creating room:', error)
      alert('Error creating room. Please try again.')
    }
  }

  // Redirect to room page after successful creation
  if (isSuccess && hash) {
    // In a real app, you'd parse the transaction receipt to get the room ID
    // For now, we'll redirect to rooms list
    router.push('/room')
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>
              Please connect your wallet to create a fitness competition room.
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
              FitStake is currently only deployed on Sepolia testnet. Please switch networks to create a room.
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
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Competition Room</h1>
          <p className="text-muted-foreground">
            Set up a new fitness competition and invite participants to stake and compete.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Room Configuration
            </CardTitle>
            <CardDescription>
              Configure your fitness competition parameters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateRoom} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="exercise-type">Exercise Type</Label>
                <Select value={exerciseType} onValueChange={setExerciseType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select exercise type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pushups">Push-ups</SelectItem>
                    <SelectItem value="squats">Squats</SelectItem>
                    <SelectItem value="pullups">Pull-ups</SelectItem>
                    <SelectItem value="burpees">Burpees</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stake-amount">Stake Amount (ETH)</Label>
                <Input
                  id="stake-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.1"
                  value={stakeAmount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStakeAmount(e.target.value)}
                  required
                />
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Amount each participant must stake to join the competition
                  </p>
                  {stakeAmount && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
                      <div className="text-sm font-medium text-green-800 mb-2">💰 Prize Distribution (per participant):</div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <div className="font-semibold text-yellow-600">🥇 1st</div>
                          <div>{(parseFloat(stakeAmount || '0') * 0.5).toFixed(3)} ETH</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-gray-600">🥈 2nd</div>
                          <div>{(parseFloat(stakeAmount || '0') * 0.3).toFixed(3)} ETH</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-amber-600">🥉 3rd</div>
                          <div>{(parseFloat(stakeAmount || '0') * 0.2).toFixed(3)} ETH</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="5"
                  max="1440"
                  placeholder="60"
                  value={duration}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDuration(e.target.value)}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  How long participants have to submit their workouts
                </p>
              </div>

              {/* AI Exercise Configuration Generator */}
              <div className="space-y-4">
                <ExerciseConfigGenerator onConfigGenerated={handleConfigGenerated} />
                
                {generatedConfig && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                      <Plus className="h-4 w-4" />
                      AI Configuration Generated
                    </div>
                    <p className="text-sm text-green-700">
                      Generated MediaPipe configuration for &quot;{generatedConfig.name}&quot; will be used for pose tracking.
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Room Summary</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      <Users className="h-3 w-3 mr-1" />
                      Exercise: {exerciseType || 'Not selected'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      <Timer className="h-3 w-3 mr-1" />
                      Duration: {duration || '0'} minutes
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Stake: {stakeAmount || '0'} ETH per participant
                  </div>
                  {generatedConfig && (
                    <div className="text-sm text-green-600">
                      ✓ AI-generated pose configuration ready
                    </div>
                  )}
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isPending || isConfirming || !exerciseType || !stakeAmount || !duration}
              >
                {isPending || isConfirming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isPending ? 'Creating Room...' : 'Confirming...'}
                  </>
                ) : (
                  'Create Room & Stake'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}