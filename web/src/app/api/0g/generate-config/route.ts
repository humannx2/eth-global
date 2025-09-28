// 0G API Route - Generate exercise configurations using 0G Compute Network
import { NextRequest, NextResponse } from 'next/server'
import { createZGComputeNetworkBroker } from '@0glabs/0g-serving-broker'
import { ethers } from 'ethers'

// 0G Network Configuration
const OG_CONFIG = {
  TESTNET_RPC: 'https://evmrpc-testnet.0g.ai',
  MIN_BALANCE: '0.05',
  FUNDING_AMOUNT: '0.1'
}

// 0G Services
const OG_SERVICES = {
  LLAMA_3_70B: '0xf07240Efa67755B5311bc75784a061eDB47165Dd'
}

// Transform 0G AI response to match ExerciseConfig structure
function transformToExerciseConfig(rawConfig: {
  name: string
  initialDirection: 'up' | 'down'
  minPeakDistance: number
  angles?: Array<{
    name: string
    pointA: number
    pointB: number
    pointC: number
    weight?: number
    targetLowAngle?: number
    targetHighAngle?: number
  }>
  anglePoints?: Array<{
    name: string
    points: [number, number, number]
    weight?: number
    targetLowAngle?: number
    targetHighAngle?: number
  }>
}): {
  name: string
  initialDirection: 'up' | 'down'
  minPeakDistance: number
  anglePoints: Array<{
    name: string
    points: [number, number, number]
    weight: number
    targetLowAngle?: number
    targetHighAngle?: number
  }>
} {
  // Handle both 'angles' (from 0G AI) and 'anglePoints' (expected format)
  const angles = rawConfig.angles || rawConfig.anglePoints || []
  
  return {
    name: rawConfig.name,
    initialDirection: rawConfig.initialDirection,
    minPeakDistance: rawConfig.minPeakDistance,
    anglePoints: angles.map((angle) => {
      // Handle both formats: angles (pointA,B,C) and anglePoints (points array)
      const points: [number, number, number] = 'points' in angle 
        ? angle.points 
        : [angle.pointA, angle.pointB, angle.pointC]
      
      return {
        name: angle.name,
        points,
        weight: angle.weight || 1.0,
        targetLowAngle: angle.targetLowAngle,
        targetHighAngle: angle.targetHighAngle
      }
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { exerciseName, exerciseDescription } = await req.json()
    
    if (!exerciseName) {
      return NextResponse.json({ error: 'Exercise name is required' }, { status: 400 })
    }

    console.log('🏋️ Generating exercise config with 0G AI for:', exerciseName)

    // Check if we have a private key for 0G operations
    if (!process.env.OG_PRIVATE_KEY) {
      console.warn('⚠️ No 0G private key found, using fallback')
      return getFallbackResponse(exerciseName, exerciseDescription)
    }

    try {
      // Initialize 0G Compute Network
      const provider = new ethers.JsonRpcProvider(OG_CONFIG.TESTNET_RPC)
      
      // Sanitize private key - remove quotes and ensure proper format
      let privateKey = process.env.OG_PRIVATE_KEY!.trim()
      
      // Remove surrounding quotes if present
      if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || 
          (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
        privateKey = privateKey.slice(1, -1)
      }
      
      // Ensure it starts with 0x
      if (!privateKey.startsWith('0x')) {
        privateKey = '0x' + privateKey
      }
      
      // Validate private key format (64 hex chars after 0x)
      if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
        throw new Error('Invalid private key format. Expected 64 hex characters after 0x prefix.')
      }
      
      const wallet = new ethers.Wallet(privateKey, provider)
      const broker = await createZGComputeNetworkBroker(wallet)
      
      // Check and fund account if needed
      const account = await broker.ledger.getLedger()
      const currentBalance = ethers.formatEther(account.totalBalance || '0')
      if (parseFloat(currentBalance) < parseFloat(OG_CONFIG.MIN_BALANCE)) {
        console.log('💰 Funding 0G Compute account...')
        await broker.ledger.addLedger(parseFloat(OG_CONFIG.FUNDING_AMOUNT))
      }

      // Acknowledge the Llama 3 70B provider
      await broker.inference.acknowledgeProviderSigner(OG_SERVICES.LLAMA_3_70B)
      
      // Get service metadata and generate auth headers
      const { endpoint, model } = await broker.inference.getServiceMetadata(OG_SERVICES.LLAMA_3_70B)
      
      const prompt = buildExercisePrompt(exerciseName, exerciseDescription)
      const headers = await broker.inference.getRequestHeaders(OG_SERVICES.LLAMA_3_70B, prompt)
      
      // Make inference request to 0G Compute Network
      const response = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          model: model,
          temperature: 0.1,
          max_tokens: 1000
        })
      })

      if (!response.ok) {
        throw new Error(`0G Compute request failed: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content
        
        // Verify response with 0G network
        await broker.inference.processResponse(
          OG_SERVICES.LLAMA_3_70B,
          content,
          data.id
        )
        
        // Extract and parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const rawConfig = JSON.parse(jsonMatch[0])
          
          // Transform 0G AI response to match expected ExerciseConfig structure
          const config = transformToExerciseConfig(rawConfig)
          
          console.log('✅ Generated config with 0G AI:', config.name)
          
          return NextResponse.json({
            success: true,
            config: config,
            generatedCode: convertToMediaPipeFormat(config),
            provider: '0g-compute-network',
            model: 'llama-3-70b'
          })
        }
      }

      // If AI response doesn't contain valid JSON, use fallback
      console.warn('⚠️ 0G AI response invalid, using fallback')
      return getFallbackResponse(exerciseName, exerciseDescription)

    } catch (ogError) {
      console.error('❌ 0G Compute Network error:', ogError)
      return getFallbackResponse(exerciseName, exerciseDescription)
    }

  } catch (error) {
    console.error('❌ API route error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate exercise configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function buildExercisePrompt(exerciseName: string, description?: string): string {
  return `Generate a MediaPipe-compatible exercise configuration for "${exerciseName}".

${description ? `User request: ${description}` : ''}

Return ONLY valid JSON with this exact structure:
{
  "name": "${exerciseName}",
  "initialDirection": "up" or "down",
  "minPeakDistance": number,
  "angles": [
    {
      "name": "joint_name",
      "pointA": number,
      "pointB": number, 
      "pointC": number,
      "weight": decimal_0_to_1,
      "targetLowAngle": degrees,
      "targetHighAngle": degrees
    }
  ]
}

MediaPipe pose landmark indices (33 total):
0=nose, 11=left_shoulder, 12=right_shoulder, 13=left_elbow, 14=right_elbow,
15=left_wrist, 16=right_wrist, 23=left_hip, 24=right_hip, 25=left_knee,
26=right_knee, 27=left_ankle, 28=right_ankle

Focus on primary movement joints and realistic angle ranges for proper form.`
}

function convertToMediaPipeFormat(config: {
  name: string
  initialDirection: 'up' | 'down'
  minPeakDistance: number
  anglePoints: Array<{
    name: string
    points: [number, number, number]
    weight: number
    targetLowAngle?: number
    targetHighAngle?: number
  }>
}): string {
  return `export const ${config.name.replace(/\s+/g, '')}Config = ${JSON.stringify(config, null, 2)};`
}

function getFallbackResponse(exerciseName: string, _description?: string) {
  const rawFallbackConfig = {
    name: exerciseName.toLowerCase().replace(/\s+/g, '_'),
    initialDirection: 'up' as const,
    minPeakDistance: 10,
    angles: [
      {
        name: 'left_knee',
        pointA: 23, // left hip
        pointB: 25, // left knee  
        pointC: 27, // left ankle
        weight: 0.5,
        targetLowAngle: 90,
        targetHighAngle: 170
      },
      {
        name: 'right_knee',
        pointA: 24, // right hip
        pointB: 26, // right knee
        pointC: 28, // right ankle
        weight: 0.5,
        targetLowAngle: 90,
        targetHighAngle: 170
      }
    ]
  }

  // Transform fallback config to match expected structure
  const fallbackConfig = transformToExerciseConfig(rawFallbackConfig)

  return NextResponse.json({
    success: true,
    config: fallbackConfig,
    generatedCode: convertToMediaPipeFormat(fallbackConfig),
    provider: 'fallback',
    warning: '0G Compute Network unavailable, using fallback configuration'
  })
}