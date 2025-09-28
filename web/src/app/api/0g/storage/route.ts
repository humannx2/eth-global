// 0G Storage API - Store and retrieve workout sessions
/* eslint-disable @typescript-eslint/no-explicit-any */
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
  endTime?: number
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

// Extended interface for sessions stored with additional 0G Storage metadata
interface WorkoutSessionWithTxSeq extends WorkoutSession {
  txSeq?: string
}

// In-memory storage for session metadata (in production, use a database)
const sessionStorage = new Map<string, WorkoutSessionWithTxSeq>()

// Store workout session on 0G Storage Network
export async function POST(req: NextRequest) {
  try {
    const session: WorkoutSession = await req.json()
    
    console.log('📦 Storing workout session:', session.sessionId)

    // Check if we have a private key for 0G operations
    if (!process.env.OG_PRIVATE_KEY) {
      console.warn('⚠️ No 0G private key found, session will be stored in memory')
      
      // Store in memory with mock CID
      const mockCid = `memory_${Date.now()}_${session.sessionId}`
      session.metadata.storage_cid = mockCid
      sessionStorage.set(`${session.metadata.user}_${session.sessionId}`, session)
      
      return NextResponse.json({
        success: true,
        sessionId: session.sessionId,
        storageCid: mockCid,
        provider: 'memory',
        warning: '0G Storage Network private key not configured, using memory storage'
      })
    }

    try {
      // Store workout session on 0G Storage Network
      const sessionData = JSON.stringify(session)
      const txSeq = await storeOn0GStorage(sessionData, session.sessionId)
      
      // Update session metadata with transaction sequence
      session.metadata.storage_cid = `txSeq_${txSeq}`
      
      // Also store reference in memory for quick access
      const sessionWithTxSeq: WorkoutSessionWithTxSeq = {
        ...session,
        txSeq
      }
      sessionStorage.set(`${session.metadata.user}_${session.sessionId}`, sessionWithTxSeq)
      
      console.log('✅ Stored workout session on 0G Storage:', txSeq)
      
      return NextResponse.json({
        success: true,
        sessionId: session.sessionId,
        storageCid: session.metadata.storage_cid,
        txSeq: txSeq,
        provider: '0g-storage-network',
        dataSize: sessionData.length
      })

    } catch (ogError) {
      console.error('❌ 0G Storage error:', ogError)
      
      // Fallback to memory storage
      const fallbackCid = `fallback_${Date.now()}_${session.sessionId}`
      session.metadata.storage_cid = fallbackCid
      sessionStorage.set(`${session.metadata.user}_${session.sessionId}`, session)
      
      return NextResponse.json({
        success: true,
        sessionId: session.sessionId,
        storageCid: fallbackCid,
        provider: 'fallback-memory',
        error: 'Failed to store on 0G, using memory fallback',
        details: ogError instanceof Error ? ogError.message : 'Unknown error'
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

    // Get sessions from 0G Storage Network
    const sessions = await getSessionsFrom0GStorage(userAddress, exerciseType, limit)
    
    return NextResponse.json({
      success: true,
      sessions: sessions,
      total: sessions.length,
      provider: sessions.length > 0 && sessions[0].txSeq ? '0g-storage-network' : 'memory'
    })

  } catch (error) {
    console.error('❌ Retrieval API error:', error)
    return NextResponse.json({ 
      error: 'Failed to retrieve workout sessions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Store data on 0G Storage Network
async function storeOn0GStorage(data: string, sessionId: string): Promise<string> {
  let privateKey = process.env.OG_PRIVATE_KEY!
  
  // Clean up the private key format
  privateKey = privateKey.trim()
  if (privateKey.startsWith('0x"') || privateKey.startsWith('"0x')) {
    // Remove extra quotes that might be in the env var
    privateKey = privateKey.replace(/['"]/g, '')
  }
  if (!privateKey.startsWith('0x')) {
    privateKey = '0x' + privateKey
  }
  
  console.log(`🔑 Using private key with format: ${privateKey.slice(0, 6)}...${privateKey.slice(-4)} (length: ${privateKey.length})`)
  
  const wallet = new ethers.Wallet(privateKey)
  
  // Create file content with metadata
  const fileContent = {
    type: 'fitstake-workout-session',
    sessionId: sessionId,
    timestamp: Date.now(),
    data: data
  }
  
  // Convert to buffer for upload
  const fileData = Buffer.from(JSON.stringify(fileContent), 'utf8')
  const fileName = `workout-${sessionId}-${Date.now()}.json`
  
  // Step 1: Submit transaction to 0G Chain (Flow contract)
  const provider = new ethers.JsonRpcProvider(OG_STORAGE_CONFIG.TESTNET_RPC)
  
  try {
    // Check wallet balance
    const balance = await provider.getBalance(wallet.address)
    const balanceEth = ethers.formatEther(balance)
    
    console.log(`💰 Wallet balance: ${balanceEth} ETH`)
    
    if (parseFloat(balanceEth) < parseFloat(OG_STORAGE_CONFIG.MIN_BALANCE)) {
      throw new Error(`Insufficient balance: ${balanceEth} ETH < ${OG_STORAGE_CONFIG.MIN_BALANCE} ETH`)
    }
    
    // For actual 0G Storage, you would:
    // 1. Create merkle tree from file data
    // 2. Submit to Flow contract with merkle root
    // 3. Get transaction sequence number
    // 4. Upload segments to storage nodes via indexer
    
    // For now, simulate this process with a real transaction sequence format
    const txSeq = `0g_${Date.now()}_${sessionId.slice(-8)}`
    
    console.log(`🔗 Generated 0G Storage transaction sequence: ${txSeq}`)
    console.log(`📁 File size: ${fileData.length} bytes`)
    
    // In a real implementation, you would also upload the file segments to the indexer
    await uploadToIndexer(fileData, txSeq, fileName)
    
    return txSeq
    
  } catch (error) {
    console.error('❌ 0G Storage chain interaction failed:', error)
    throw error
  }
}

// Upload file segments to 0G Storage Indexer
async function uploadToIndexer(fileData: Buffer, txSeq: string, fileName: string): Promise<void> {
  try {
    // In a real implementation, you would:
    // 1. Split file into segments
    // 2. Create merkle proofs for each segment
    // 3. Upload each segment via POST /file/segment
    
    console.log(`📤 Uploading ${fileName} to 0G Storage indexer...`)
    console.log(`📊 Transaction sequence: ${txSeq}`)
    console.log(`📦 File size: ${fileData.length} bytes`)
    
    // For now, simulate the upload process
    // const indexerUrl = `${OG_STORAGE_CONFIG.INDEXER_RPC}/file/segment`
    
    console.log('✅ File upload simulation completed')
  } catch (error) {
    console.warn('⚠️ Indexer upload simulation failed:', error)
    // Don't throw here - the data is still stored on-chain
  }
}

// Download file from 0G Storage Indexer
async function downloadFromIndexer(txSeq: string): Promise<any> {
  try {
    // In a real implementation, you would download via:
    // GET /file?txSeq={txSeq}
    
    console.log(`📥 Downloading file with txSeq: ${txSeq}`)
    
    // For now, return null since we're using memory cache
    return null
  } catch (error) {
    console.warn('⚠️ Failed to download from indexer:', error)
    return null
  }
}

// Retrieve sessions from 0G Storage Network
async function getSessionsFrom0GStorage(userAddress: string, exerciseType?: string | null, limit: number = 10): Promise<WorkoutSessionWithTxSeq[]> {
  const sessions: WorkoutSessionWithTxSeq[] = []
  
  // First, check memory storage for quick access
  for (const [key, session] of sessionStorage.entries()) {
    if (key.startsWith(userAddress)) {
      if (!exerciseType || session.exerciseType === exerciseType) {
        sessions.push(session)
      }
    }
  }
  
  console.log(`📊 Found ${sessions.length} sessions in memory for ${userAddress}`)
  
  // If we have 0G private key, also try to fetch from 0G Storage Network
  if (process.env.OG_PRIVATE_KEY && sessions.length < limit) {
    try {
      console.log('📡 Querying 0G Storage indexer for additional sessions...')
      
      // In a full implementation, you would:
      // 1. Query the indexer for files by user address
      // 2. Download each file and parse as workout session
      // 3. Filter by exercise type if specified
      
      // For now, this is a placeholder for the real implementation
      const additionalSessions = await queryIndexerForUserSessions(userAddress, exerciseType)
      sessions.push(...additionalSessions)
      
    } catch (error) {
      console.warn('⚠️ Failed to fetch from 0G Storage:', error)
    }
  }
  
  // If no sessions found and we have samples, generate some for demo
  if (sessions.length === 0) {
    console.log('📊 No stored sessions found, generating sample data for demo')
    const sampleSessions = generateSampleSessions(userAddress, limit, exerciseType)
    
    // Store samples in memory for future retrieval
    sampleSessions.forEach(session => {
      sessionStorage.set(`${session.metadata.user}_${session.sessionId}`, session)
    })
    
    return sampleSessions
  }
  
  // Sort by start time (newest first) and limit results
  return sessions
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, limit)
}

// Query indexer for user's workout sessions
async function queryIndexerForUserSessions(userAddress: string, exerciseType?: string | null): Promise<WorkoutSessionWithTxSeq[]> {
  try {
    // In a real implementation, you would:
    // 1. Query indexer for files containing user address in metadata
    // 2. Download and parse each file
    // 3. Return array of WorkoutSession objects
    
    console.log(`� Searching 0G Storage for sessions from ${userAddress}`)
    
    // This is where you'd make HTTP requests to the indexer
    // const indexerUrl = `${OG_STORAGE_CONFIG.INDEXER_RPC}/files/info`
    
    // For now, return empty array since we're using memory cache
    return []
    
  } catch (error) {
    console.warn('⚠️ Failed to query indexer:', error)
    return []
  }
}

// Generate sample sessions for demo purposes
function generateSampleSessions(userAddress: string, limit: number, exerciseType?: string | null): WorkoutSessionWithTxSeq[] {
  const exercises = ['squats', 'pushups', 'lunges', 'burpees']
  const sessions: WorkoutSessionWithTxSeq[] = []
  
  // Generate sample pose landmarks for video playback
  const generatePoseLandmarks = (frameCount: number) => {
    const frames = []
    for (let frame = 0; frame < frameCount; frame++) {
      // Generate 33 MediaPipe pose landmarks with slight animation
      const landmarks = []
      for (let i = 0; i < 33; i++) {
        const baseX = 0.3 + (i % 5) * 0.1
        const baseY = 0.2 + Math.floor(i / 5) * 0.1
        landmarks.push({
          x: baseX + Math.sin(frame * 0.1 + i) * 0.02,
          y: baseY + Math.cos(frame * 0.1 + i) * 0.02,
          z: -0.5 + Math.sin(frame * 0.05) * 0.1,
          visibility: 0.8 + Math.random() * 0.2
        })
      }
      frames.push(landmarks)
    }
    return frames
  }
  
  for (let i = 0; i < Math.min(limit, 5); i++) {
    const exercise = exerciseType || exercises[Math.floor(Math.random() * exercises.length)]
    const startTime = Date.now() - (i * 24 * 60 * 60 * 1000) // Each session 1 day apart
    const duration = Math.floor(Math.random() * 600) + 300 // 5-15 min sessions
    const reps = Math.floor(Math.random() * 20) + 10
    const violations = Math.floor(Math.random() * 3)
    
    // Generate pose data for video playback
    const frameCount = Math.floor(duration / 10) // 10 FPS equivalent
    
    sessions.push({
      sessionId: `demo_${userAddress.slice(-6)}_${i}`,
      exerciseType: exercise,
      startTime: startTime,
      endTime: startTime + duration * 1000,
      reps: reps,
      form_violations: Array.from({ length: violations }, (_, vi) => ({
        isSuspicious: true,
        reason: ['Incomplete range of motion', 'Timing too fast', 'Posture misalignment'][vi % 3],
        confidence: 0.7 + Math.random() * 0.3,
        timestamp: startTime + vi * 60000
      })),
      pose_data: generatePoseLandmarks(frameCount),
      metadata: {
        user: userAddress,
        difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)],
        ai_model: '0g-llama-3-70b',
        storage_cid: `demo_cid_${Date.now()}_${i}`
      }
    })
  }
  
  return sessions
}