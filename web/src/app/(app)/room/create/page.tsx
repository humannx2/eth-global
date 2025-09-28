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
import { Loader2, Plus, Timer, Users, AlertTriangle, Target } from 'lucide-react'
import { roomFactoryAbi } from '@/lib/wagmi-generated'
import { ExerciseConfigGenerator } from '@/components/ExerciseConfigGenerator'
import { getContractAddress, isContractDeployed } from '@/lib/contracts'
import { useChainId } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { flowTestnet } from '@/lib/wagmi'
import { generateRoomEnsName, useEnsAvailability } from '@/hooks/use-ens'
import type { ExerciseConfig } from '@/lib/mediapipe-utils'

// Optimized exercise configurations for demo
function getOptimizedExerciseConfig(exerciseType: string): ExerciseConfig {
  const normalizedType = exerciseType.toLowerCase()
  
  if (normalizedType.includes('pushup') || normalizedType.includes('push-up') || normalizedType.includes('push up')) {
    return {
      name: 'pushup',
      initialDirection: 'up', // Start with arms extended
      minPeakDistance: 8, // Reasonable distance for push-up tempo
      anglePoints: [
        {
          name: 'left_elbow',
          points: [11, 13, 15], // LEFT_SHOULDER, LEFT_ELBOW, LEFT_WRIST
          weight: 1.0,
          targetLowAngle: 45,   // Deep push-up (arms very bent)
          targetHighAngle: 160  // Arms extended
        },
        {
          name: 'right_elbow',
          points: [12, 14, 16], // RIGHT_SHOULDER, RIGHT_ELBOW, RIGHT_WRIST
          weight: 1.0,
          targetLowAngle: 45,
          targetHighAngle: 160
        }
      ]
    }
  }
  
  if (normalizedType.includes('squat')) {
    return {
      name: 'squat',
      initialDirection: 'up',
      minPeakDistance: 10,
      anglePoints: [
        {
          name: 'left_knee',
          points: [23, 25, 27], // LEFT_HIP, LEFT_KNEE, LEFT_ANKLE
          weight: 1.0,
          targetLowAngle: 90,
          targetHighAngle: 170
        },
        {
          name: 'right_knee',
          points: [24, 26, 28], // RIGHT_HIP, RIGHT_KNEE, RIGHT_ANKLE
          weight: 1.0,
          targetLowAngle: 90,
          targetHighAngle: 170
        }
      ]
    }
  }
  
  // Default to push-up config
  return getOptimizedExerciseConfig('pushups')
}

export default function CreateRoomPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const [exerciseType, setExerciseType] = useState('')
  const [stakeAmount, setStakeAmount] = useState('')
  const [duration, setDuration] = useState('')
  const [customEnsName, setCustomEnsName] = useState('')
  const [generatedConfig, setGeneratedConfig] = useState<ExerciseConfig | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)

  // Generate proposed ENS name based on exercise type
  const proposedEnsName = exerciseType ? generateRoomEnsName('new', exerciseType) : null

  // Check if contracts are deployed on current chain
  const isSupported = isContractDeployed(chainId, 'RoomFactory')

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const handleConfigGenerated = (config: ExerciseConfig) => {
    setGeneratedConfig(config)
    setConfigError(null)
    // Auto-fill exercise type if it matches the config name
    if (config.name && !exerciseType) {
      setExerciseType(config.name.replace(/_/g, ' '))
    }
  }

  const handleConfigError = (error: string) => {
    setConfigError(error)
    setGeneratedConfig(null)
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

    // Use generated config if available, otherwise use optimized hardcoded config
    const configToUse = generatedConfig ? JSON.stringify(generatedConfig) : JSON.stringify(getOptimizedExerciseConfig(exerciseType))

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
              StakeFit is deployed on Sepolia and Flow testnets. Please switch networks to create a room.
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
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>
                Get Sepolia ETH: <a href="https://sepoliafaucet.com/" target="_blank" rel="noopener noreferrer" className="underline">sepoliafaucet.com</a>
              </p>
              <p>
                Get Flow testnet tokens: <a href="https://faucet.flow.com/fund-account" target="_blank" rel="noopener noreferrer" className="underline">faucet.flow.com</a>
              </p>
            </div>
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
                {proposedEnsName && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="text-blue-600 dark:text-blue-400 font-medium">🏷️ Room ENS Name:</div>
                      <code className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded text-blue-800 dark:text-blue-200 font-mono text-xs">
                        {proposedEnsName}
                      </code>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Share this name for easy room access (requires fitstake.eth domain)
                    </p>
                  </div>
                )}
              </div>

              {/* Custom ENS Name Field */}
              <div className="space-y-2">
                <Label htmlFor="custom-ens-name">Custom Room Name (Optional)</Label>
                <Input
                  id="custom-ens-name"
                  type="text"
                  placeholder="my-epic-fitness-room"
                  value={customEnsName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomEnsName(e.target.value)}
                  className="font-mono"
                />
                {customEnsName && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="text-emerald-600 dark:text-emerald-400 font-medium">🎯 Custom ENS Name:</div>
                      <code className="bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded text-emerald-800 dark:text-emerald-200 font-mono text-xs">
                        {customEnsName}.fitstake.eth
                      </code>
                    </div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                      Custom name for easy sharing and branding
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  ENS names make rooms easy to share and join. Leave blank to use auto-generated name.
                </p>
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
                      <div className="text-sm font-medium text-green-800 mb-2">💰 Prize Distribution:</div>
                      <div className="text-center">
                        <div className="font-semibold text-yellow-600">🏆 Winner Takes All</div>
                        <div className="text-lg font-bold">{stakeAmount} ETH per participant</div>
                        <div className="text-xs text-green-600 mt-1">100% to the champion!</div>
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

              {/* AI Exercise Configuration Generator - OPTIONAL */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-medium">Exercise Configuration</Label>
                  <Badge variant="secondary" className="text-xs">OPTIONAL</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Generate a custom AI-powered MediaPipe configuration, or use our optimized defaults for common exercises.
                </p>
                
                <ExerciseConfigGenerator 
                  onConfigGenerated={handleConfigGenerated}
                  onError={handleConfigError}
                />
                
                {configError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {configError}
                    </AlertDescription>
                  </Alert>
                )}
                
                {generatedConfig ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                      <Plus className="h-4 w-4" />
                      AI Configuration Generated ✓
                    </div>
                    <p className="text-sm text-green-700 mb-2">
                      Generated MediaPipe configuration for &quot;{generatedConfig.name}&quot; with {generatedConfig.anglePoints?.length || 0} tracking points.
                    </p>
                    <div className="text-xs text-green-600 space-y-1">
                      <div>• Initial Direction: {generatedConfig.initialDirection}</div>
                      <div>• Peak Distance: {generatedConfig.minPeakDistance} frames</div>
                      <div>• Tracking Points: {generatedConfig.anglePoints?.length || 0}</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
                      <Target className="h-4 w-4" />
                      Using Optimized Default Configuration
                    </div>
                    <p className="text-sm text-blue-700">
                      Will use our pre-optimized MediaPipe configuration for &quot;{exerciseType || 'selected exercise'}&quot; with proven accuracy.
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
                  {(customEnsName || proposedEnsName) && (
                    <div className="text-sm text-muted-foreground">
                      ENS Name: <code className="bg-muted-foreground/10 px-1 py-0.5 rounded text-xs">
                        {customEnsName ? `${customEnsName}.fitstake.eth` : proposedEnsName}
                      </code>
                      {customEnsName && <span className="text-emerald-600 ml-1">(Custom)</span>}
                    </div>
                  )}
                  {generatedConfig ? (
                    <div className="text-sm text-green-600">
                      ✓ Using AI-generated pose configuration
                    </div>
                  ) : (
                    <div className="text-sm text-blue-600">
                      ✓ Using optimized default configuration
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