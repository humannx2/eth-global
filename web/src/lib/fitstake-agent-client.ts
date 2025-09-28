// FitStake Agent - Client-side wrapper for 0G-powered fitness AI
// This makes HTTP requests to server-side 0G API routes

export interface ExerciseConfig {
  name: string
  initialDirection: 'up' | 'down'
  minPeakDistance: number
  angles: Array<{
    name: string
    pointA: number
    pointB: number
    pointC: number
    weight: number
    targetLowAngle: number
    targetHighAngle: number
  }>
}

export interface CheatDetectionResult {
  isSuspicious: boolean
  reason: string
  confidence: number
  timestamp: number
}

export interface PoseLandmark {
  x: number
  y: number
  z: number
  visibility?: number
}

export interface WorkoutSession {
  sessionId: string
  exerciseType: string
  startTime: number
  endTime?: number
  reps: number
  form_violations: CheatDetectionResult[]
  pose_data: PoseLandmark[][]
  metadata: {
    user: string
    difficulty: string
    ai_model: string
    storage_cid: string
  }
}

export class FitStakeAgent {
  private baseUrl: string

  constructor(baseUrl: string = '/api/0g') {
    this.baseUrl = baseUrl
  }

  /**
   * Generate exercise configuration using 0G AI (via server-side API)
   */
  async generateExerciseConfig(exerciseType: string, userPrompt: string = ''): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/generate-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exerciseName: exerciseType,
          exerciseDescription: userPrompt
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && data.generatedCode) {
        console.log(`✅ Generated config via ${data.provider}:`, data.config.name)
        if (data.warning) {
          console.warn('⚠️', data.warning)
        }
        return data.generatedCode
      }

      throw new Error('Invalid response from config generation API')

    } catch (error) {
      console.error('❌ Config generation failed:', error)
      
      // Client-side fallback
      return this.getFallbackConfig(exerciseType)
    }
  }

  /**
   * Detect real-time form violations (server-side 0G AI analysis)
   */
  async detectRealTimeAnomalies(
    currentPose: PoseLandmark[],
    exerciseType: string,
    repCount: number = 0,
    timeWindow: PoseLandmark[][] = []
  ): Promise<CheatDetectionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/cheat-detection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPose,
          exerciseType,
          repCount,
          timeWindow,
          sessionContext: {
            startTime: Date.now(),
            difficulty: 'medium',
            targetReps: 20
          }
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && data.analysis) {
        console.log(`✅ Form analysis via ${data.provider}:`, data.analysis.isSuspicious ? 'VIOLATION' : 'OK')
        return data.analysis
      }

      throw new Error('Invalid response from cheat detection API')

    } catch (error) {
      console.error('❌ Cheat detection failed:', error)
      return this.getBasicCheatDetection(currentPose, exerciseType, repCount)
    }
  }

  /**
   * Store workout session (via server-side 0G Storage API)
   */
  async storeWorkoutSession(
    userAddress: string,
    exerciseType: string,
    startTime: number,
    endTime: number,
    reps: number,
    violations: CheatDetectionResult[],
    poseData: PoseLandmark[][],
    difficulty: string = 'medium'
  ): Promise<string | null> {
    try {
      const sessionId = this.generateSessionId(userAddress, exerciseType)
      
      const session: WorkoutSession = {
        sessionId,
        exerciseType,
        startTime,
        endTime,
        reps,
        form_violations: violations,
        pose_data: poseData,
        metadata: {
          user: userAddress,
          difficulty,
          ai_model: '0g-deepseek-r1',
          storage_cid: ''
        }
      }

      const response = await fetch(`${this.baseUrl}/storage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(session)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        console.log(`✅ Workout stored via ${data.provider}:`, data.storageCid)
        return sessionId
      }

      throw new Error('Failed to store workout session')

    } catch (error) {
      console.error('❌ Failed to store workout session:', error)
      return null
    }
  }

  /**
   * Retrieve workout sessions for a user
   */
  async getWorkoutSessions(
    userAddress: string,
    exerciseType?: string,
    limit: number = 10
  ): Promise<WorkoutSession[]> {
    try {
      const params = new URLSearchParams({
        user: userAddress,
        limit: limit.toString()
      })
      
      if (exerciseType) {
        params.append('exercise', exerciseType)
      }

      const response = await fetch(`${this.baseUrl}/storage?${params}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        console.log(`✅ Retrieved ${data.sessions.length} workout sessions`)
        return data.sessions
      }

      throw new Error('Failed to retrieve workout sessions')

    } catch (error) {
      console.error('❌ Failed to retrieve workout sessions:', error)
      return []
    }
  }

  /**
   * Check if 0G services are available (via server health check)
   */
  async getNetworkStatus(): Promise<{ compute: boolean, storage: boolean }> {
    try {
      // TODO: Add server-side status endpoint
      return { compute: true, storage: true }
    } catch (error) {
      return { compute: false, storage: false }
    }
  }

  /**
   * Client-side fallback configuration
   */
  private getFallbackConfig(exerciseType: string): string {
    const normalizedType = exerciseType.toLowerCase()
    
    let config: ExerciseConfig
    
    if (normalizedType.includes('squat')) {
      config = {
        name: 'squats',
        initialDirection: 'up',
        minPeakDistance: 10,
        angles: [
          { name: 'left_knee', pointA: 23, pointB: 25, pointC: 27, weight: 0.5, targetLowAngle: 90, targetHighAngle: 170 },
          { name: 'right_knee', pointA: 24, pointB: 26, pointC: 28, weight: 0.5, targetLowAngle: 90, targetHighAngle: 170 }
        ]
      }
    } else if (normalizedType.includes('pushup') || normalizedType.includes('push-up')) {
      config = {
        name: 'pushups',
        initialDirection: 'down',
        minPeakDistance: 8,
        angles: [
          { name: 'left_elbow', pointA: 11, pointB: 13, pointC: 15, weight: 0.5, targetLowAngle: 70, targetHighAngle: 160 },
          { name: 'right_elbow', pointA: 12, pointB: 14, pointC: 16, weight: 0.5, targetLowAngle: 70, targetHighAngle: 160 }
        ]
      }
    } else {
      // Default to squat-like exercise
      config = {
        name: exerciseType.toLowerCase().replace(/\s+/g, '_'),
        initialDirection: 'up',
        minPeakDistance: 10,
        angles: [
          { name: 'left_knee', pointA: 23, pointB: 25, pointC: 27, weight: 0.5, targetLowAngle: 90, targetHighAngle: 170 },
          { name: 'right_knee', pointA: 24, pointB: 26, pointC: 28, weight: 0.5, targetLowAngle: 90, targetHighAngle: 170 }
        ]
      }
    }

    return `export const ${config.name}Config = ${JSON.stringify(config, null, 2)};`
  }

  /**
   * Basic client-side cheat detection
   */
  private getBasicCheatDetection(
    pose: PoseLandmark[], 
    exerciseType: string,
    repCount: number = 0
  ): CheatDetectionResult {
    // Calculate average visibility across all landmarks
    const avgVisibility = pose.reduce((acc, landmark) => 
      acc + (landmark.visibility || 1), 0
    ) / pose.length

    let isSuspicious = false
    let reason = 'Form looks acceptable'
    let confidence = avgVisibility

    if (avgVisibility < 0.5) {
      isSuspicious = true
      reason = 'Poor pose visibility - check lighting and camera position'
      confidence = 1 - avgVisibility
    } else if (avgVisibility < 0.7) {
      isSuspicious = true
      reason = 'Moderate pose detection issues - some joints may be occluded'
      confidence = 0.6
    }

    // Exercise-specific checks
    if (exerciseType.toLowerCase().includes('squat')) {
      const leftKnee = pose[25] // MediaPipe left knee index
      const rightKnee = pose[26] // MediaPipe right knee index
      
      if (leftKnee && rightKnee) {
        const kneeAlignment = Math.abs(leftKnee.y - rightKnee.y)
        if (kneeAlignment > 0.1) {
          isSuspicious = true
          reason = 'Uneven knee alignment detected'
          confidence = Math.min(confidence + 0.3, 1.0)
        }
      }
    }

    return {
      isSuspicious,
      reason,
      confidence,
      timestamp: Date.now()
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(userAddress: string, exerciseType: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `${userAddress.slice(0, 8)}-${exerciseType.toLowerCase().replace(/\s+/g, '')}-${timestamp}-${random}`
  }

  /**
   * Check basic functionality
   */
  isBasicOperational(): boolean {
    return true // Client-side agent is always operational
  }

  /**
   * Static factory methods
   */
  static forBrowser(): FitStakeAgent {
    return new FitStakeAgent()
  }
}

// Export singleton instance for browser use
export const fitStakeAgent = FitStakeAgent.forBrowser()

// Re-export types for backward compatibility
export type { 
  ExerciseConfig as ExerciseConfigType,
  CheatDetectionResult as CheatDetectionResultType,
  WorkoutSession as WorkoutSessionType,
  PoseLandmark as PoseLandmarkType
}