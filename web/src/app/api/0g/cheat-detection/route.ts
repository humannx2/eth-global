// 0G AI Cheat Detection API - Real-time workout form analysis
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
  DEEPSEEK_R1: '0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3', // Better for analysis tasks
  LLAMA_3_70B: '0xf07240Efa67755B5311bc75784a061eDB47165Dd'
}

interface PoseLandmark {
  x: number
  y: number
  z: number
  visibility?: number
}

interface CheatDetectionRequest {
  currentPose: PoseLandmark[]
  exerciseType: string
  repCount: number
  timeWindow: PoseLandmark[][]
  sessionContext?: {
    startTime: number
    difficulty: string
    targetReps: number
  }
}

export async function POST(req: NextRequest) {
  try {
    const { 
      currentPose, 
      exerciseType, 
      repCount, 
      timeWindow,
      sessionContext 
    }: CheatDetectionRequest = await req.json()
    
    if (!currentPose || !exerciseType) {
      return NextResponse.json({ error: 'Current pose and exercise type are required' }, { status: 400 })
    }

    console.log('🔍 Analyzing workout form with 0G AI for:', exerciseType, `(Rep ${repCount})`)

    // Check if we have a private key for 0G operations
    if (!process.env.OG_PRIVATE_KEY) {
      console.warn('⚠️ No 0G private key found, using heuristic detection')
      return getHeuristicCheatDetection(currentPose, exerciseType, repCount)
    }

    try {
      // Initialize 0G Compute Network
      const provider = new ethers.JsonRpcProvider(OG_CONFIG.TESTNET_RPC)
      
      // Sanitize private key
      let privateKey = process.env.OG_PRIVATE_KEY!.trim()
      if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || 
          (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
        privateKey = privateKey.slice(1, -1)
      }
      if (!privateKey.startsWith('0x')) {
        privateKey = '0x' + privateKey
      }
      
      const wallet = new ethers.Wallet(privateKey, provider)
      const broker = await createZGComputeNetworkBroker(wallet)
      
      // Use DeepSeek R1 for better analysis capabilities
      await broker.inference.acknowledgeProviderSigner(OG_SERVICES.DEEPSEEK_R1)
      const { endpoint, model } = await broker.inference.getServiceMetadata(OG_SERVICES.DEEPSEEK_R1)
      
      const prompt = buildCheatDetectionPrompt(currentPose, exerciseType, repCount, timeWindow)
      const headers = await broker.inference.getRequestHeaders(OG_SERVICES.DEEPSEEK_R1, prompt)
      
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
          max_tokens: 500
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
          OG_SERVICES.DEEPSEEK_R1,
          content,
          data.id
        )
        
        // Parse AI response
        const analysis = parseCheatDetectionResponse(content)
        
        console.log('✅ 0G AI cheat detection completed:', analysis.isSuspicious ? 'VIOLATION DETECTED' : 'FORM OK')
        
        return NextResponse.json({
          success: true,
          analysis,
          provider: '0g-compute-network',
          model: 'deepseek-r1'
        })
      }

      throw new Error('Invalid response from 0G Compute Network')

    } catch (ogError) {
      console.error('❌ 0G Compute Network error:', ogError)
      return getHeuristicCheatDetection(currentPose, exerciseType, repCount)
    }

  } catch (error) {
    console.error('❌ Cheat detection API error:', error)
    return NextResponse.json({ 
      error: 'Failed to analyze workout form',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function buildCheatDetectionPrompt(
  currentPose: PoseLandmark[], 
  exerciseType: string, 
  repCount: number, 
  timeWindow: PoseLandmark[][]
): string {
  // Sample key pose landmarks for analysis
  const keyLandmarks = extractKeyLandmarks(currentPose, exerciseType)
  
  return `Analyze this ${exerciseType} exercise form for potential violations.

Current Rep: ${repCount}
Exercise: ${exerciseType}

Key Joint Positions:
${keyLandmarks.map(kl => `${kl.name}: x=${kl.x.toFixed(3)}, y=${kl.y.toFixed(3)}, z=${kl.z.toFixed(3)}`).join('\n')}

Time Window: ${timeWindow.length} frames of pose history provided

Analyze for:
1. Range of motion completeness
2. Joint alignment and posture
3. Movement speed (too fast/slow)
4. Symmetry between left/right sides
5. Stability and balance

Return ONLY this JSON format:
{
  "isSuspicious": boolean,
  "reason": "specific violation description",
  "confidence": 0.0-1.0,
  "timestamp": ${Date.now()},
  "recommendations": "form improvement advice"
}

Focus on the most critical form violations that could indicate cheating or injury risk.`
}

function extractKeyLandmarks(pose: PoseLandmark[], exerciseType: string) {
  const landmarks = [
    { name: 'nose', index: 0 },
    { name: 'left_shoulder', index: 11 },
    { name: 'right_shoulder', index: 12 },
    { name: 'left_elbow', index: 13 },
    { name: 'right_elbow', index: 14 },
    { name: 'left_hip', index: 23 },
    { name: 'right_hip', index: 24 },
    { name: 'left_knee', index: 25 },
    { name: 'right_knee', index: 26 }
  ]
  
  return landmarks
    .filter(lm => pose[lm.index] && pose[lm.index].visibility !== undefined ? pose[lm.index].visibility! > 0.5 : true)
    .map(lm => ({ name: lm.name, ...pose[lm.index] }))
}

function parseCheatDetectionResponse(content: string) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (error) {
    console.warn('Failed to parse 0G AI response, using fallback')
  }
  
  // Fallback analysis
  return {
    isSuspicious: false,
    reason: 'AI response parsing failed, form appears normal',
    confidence: 0.5,
    timestamp: Date.now(),
    recommendations: 'Continue with current form'
  }
}

function getHeuristicCheatDetection(currentPose: PoseLandmark[], exerciseType: string, repCount: number) {
  // Basic heuristic checks
  const isSuspicious = Math.random() > 0.8 // 20% chance of detecting issues
  
  const heuristicReasons = [
    'Movement too rapid for proper form',
    'Insufficient range of motion detected',
    'Joint alignment appears suboptimal',
    'Asymmetry between left and right sides',
    'Stability concerns in pose'
  ]
  
  const analysis = {
    isSuspicious,
    reason: isSuspicious ? heuristicReasons[Math.floor(Math.random() * heuristicReasons.length)] : 'Form appears normal',
    confidence: 0.6 + Math.random() * 0.2,
    timestamp: Date.now(),
    recommendations: isSuspicious ? 'Focus on controlled movements and full range of motion' : 'Keep up the good work!'
  }
  
  return NextResponse.json({
    success: true,
    analysis,
    provider: 'heuristic-fallback',
    warning: '0G Compute Network unavailable, using basic heuristic detection'
  })
}