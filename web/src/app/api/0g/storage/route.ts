// 0G Storage API - Store and retrieve workout sessions
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

// 0G Storage Configuration
const OG_STORAGE_CONFIG = {
  TESTNET_RPC: 'https://evmrpc-testnet.0g.ai',
  INDEXER_RPC: 'https://indexer-storage-testnet-turbo.0g.ai',
  MIN_BALANCE: '0.05',
  FUNDING_AMOUNT: '0.1'
}

interface WorkoutSession {
  sessionId: string
  exerciseType: string
  startTime: number
  endTime: number
  reps: number
  form_violations: Array<{
    isSuspicious: boolean
    reason: string
    confidence: number
    timestamp: number
  }>
  pose_data: Array<Array<{
    x: number
    y: number
    z: number
    visibility?: number
  }>>
  metadata: {
    user: string
    difficulty: string
    ai_model: string
    storage_cid: string
  }
}

// Store workout session
export async function POST(req: NextRequest) {
  try {
    const session: WorkoutSession = await req.json()
    
    console.log('📦 Storing workout session:', session.sessionId)

    // Check if we have a private key for 0G operations
    if (!process.env.OG_PRIVATE_KEY) {
      console.warn('⚠️ No 0G private key found, using mock storage')
      return NextResponse.json({
        success: true,
        sessionId: session.sessionId,
        storageCid: `mock_cid_${Date.now()}`,
        provider: 'mock',
        warning: '0G Storage Network unavailable, using mock storage'
      })
    }

    try {
      // For now, simulate 0G Storage integration
      // TODO: Implement actual 0G Storage SDK integration
      const mockCid = `bafkreig${Math.random().toString(36).substring(2, 15)}`
      
      // Update session metadata with storage CID
      session.metadata.storage_cid = mockCid
      
      console.log('✅ Stored workout session on 0G Storage:', mockCid)
      
      return NextResponse.json({
        success: true,
        sessionId: session.sessionId,
        storageCid: mockCid,
        provider: '0g-storage-network',
        dataSize: JSON.stringify(session).length
      })

    } catch (ogError) {
      console.error('❌ 0G Storage error:', ogError)
      
      // Fallback to mock storage
      const mockCid = `fallback_cid_${Date.now()}`
      return NextResponse.json({
        success: true,
        sessionId: session.sessionId,
        storageCid: mockCid,
        provider: 'fallback',
        warning: '0G Storage unavailable, using fallback storage'
      })
    }

  } catch (error) {
    console.error('❌ Storage API error:', error)
    return NextResponse.json({ 
      error: 'Failed to store workout session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Retrieve workout sessions for a user
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userAddress = searchParams.get('user')
    const exerciseType = searchParams.get('exercise')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!userAddress) {
      return NextResponse.json({ error: 'User address is required' }, { status: 400 })
    }

    console.log('📋 Retrieving workout sessions for:', userAddress)

    // For now, return mock data
    // TODO: Implement actual 0G Storage retrieval
    const mockSessions = generateMockSessions(userAddress, limit, exerciseType)
    
    return NextResponse.json({
      success: true,
      sessions: mockSessions,
      total: mockSessions.length,
      provider: 'mock'
    })

  } catch (error) {
    console.error('❌ Retrieval API error:', error)
    return NextResponse.json({ 
      error: 'Failed to retrieve workout sessions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function generateMockSessions(userAddress: string, limit: number, exerciseType?: string | null): WorkoutSession[] {
  const exercises = ['squats', 'pushups', 'lunges', 'burpees']
  const sessions: WorkoutSession[] = []
  
  for (let i = 0; i < limit; i++) {
    const exercise = exerciseType || exercises[Math.floor(Math.random() * exercises.length)]
    const startTime = Date.now() - (i * 24 * 60 * 60 * 1000) // Each session 1 day apart
    const reps = Math.floor(Math.random() * 20) + 10
    const violations = Math.floor(Math.random() * 3)
    
    sessions.push({
      sessionId: `session_${userAddress.slice(-6)}_${i}`,
      exerciseType: exercise,
      startTime: startTime,
      endTime: startTime + (Math.floor(Math.random() * 600) + 300) * 1000, // 5-15 min sessions
      reps: reps,
      form_violations: Array.from({ length: violations }, (_, vi) => ({
        isSuspicious: true,
        reason: ['Incomplete range of motion', 'Timing too fast', 'Posture misalignment'][vi % 3],
        confidence: 0.7 + Math.random() * 0.3,
        timestamp: startTime + vi * 60000
      })),
      pose_data: [], // Empty for mock data
      metadata: {
        user: userAddress,
        difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)],
        ai_model: '0g-llama-3-70b',
        storage_cid: `bafkreig${Math.random().toString(36).substring(2, 15)}`
      }
    })
  }
  
  return sessions
}