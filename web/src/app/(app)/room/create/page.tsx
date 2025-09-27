'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Timer, Users } from 'lucide-react'
import { roomFactoryAbi } from '@/lib/wagmi-generated'

// TODO: Get this from deployed contract address
const ROOM_FACTORY_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'

export default function CreateRoomPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const [exerciseType, setExerciseType] = useState('')
  const [stakeAmount, setStakeAmount] = useState('')
  const [duration, setDuration] = useState('')
  const [exerciseConfig, setExerciseConfig] = useState('')

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

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

    // Default exercise config for pushups if not provided
    const defaultConfig = JSON.stringify({
      exerciseType: 'pushups',
      minElbowAngle: 30,
      maxElbowAngle: 170,
      minHipAngle: 160,
      minRepSpeed: 0.5, // seconds per rep minimum
      maxRepSpeed: 3.0, // seconds per rep maximum
      landmarks: [
        'left_shoulder', 'right_shoulder',
        'left_elbow', 'right_elbow', 
        'left_wrist', 'right_wrist',
        'left_hip', 'right_hip'
      ]
    })

    try {
      writeContract({
        address: ROOM_FACTORY_ADDRESS,
        abi: roomFactoryAbi,
        functionName: 'createRoom',
        args: [
          exerciseType,
          stakeAmountWei,
          BigInt(durationInSeconds),
          exerciseConfig || defaultConfig
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
                <p className="text-sm text-muted-foreground">
                  Amount each participant must stake to join the competition
                </p>
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

              <div className="space-y-2">
                <Label htmlFor="exercise-config">Exercise Configuration (Optional)</Label>
                <Textarea
                  id="exercise-config"
                  placeholder='{"minElbowAngle": 30, "maxElbowAngle": 170, ...}'
                  value={exerciseConfig}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setExerciseConfig(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  Custom JSON configuration for pose detection parameters
                </p>
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