'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Camera, 
  StopCircle, 
  Target, 
  Zap, 
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { 
  processExerciseReps, 
  type Pose, 
  type ExerciseConfig,
  type RepSegment,
  getExerciseConfig 
} from '@/lib/mediapipe-utils'

// For now, we'll simulate MediaPipe since the model files need to be hosted
// In a real deployment, you'd host the MediaPipe model files and use the actual MediaPipe library
let PoseLandmarker: any = null
let FilesetResolver: any = null

// Try to import MediaPipe, but handle gracefully if not available
try {
  const mediapipe = require('@mediapipe/tasks-vision')
  PoseLandmarker = mediapipe.PoseLandmarker
  FilesetResolver = mediapipe.FilesetResolver
} catch (error) {
  console.log('MediaPipe not available, using simulation mode')
}

interface MediaPipeWorkoutProps {
  exerciseType: string
  onWorkoutComplete: (data: {
    repCount: number
    formScore: number
    sessionData: string
    repSegments: RepSegment[]
  }) => void
  onWorkoutStart?: () => void
  onWorkoutStop?: () => void
}

interface MediaPipeLandmark {
  x: number
  y: number
  z: number
  visibility?: number
}

export function MediaPipeWorkout({ 
  exerciseType, 
  onWorkoutComplete, 
  onWorkoutStart,
  onWorkoutStop 
}: MediaPipeWorkoutProps) {
  // Refs for video and canvas elements
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // MediaPipe state
  const [poseLandmarker, setPoseLandmarker] = useState<any>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [isSimulationMode, setIsSimulationMode] = useState(false)
  
  // Workout state
  const [isWorkoutActive, setIsWorkoutActive] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null)
  
  // Exercise tracking
  const [repCount, setRepCount] = useState(0)
  const [poseHistory, setPoseHistory] = useState<Pose[]>([])
  const [lastProcessedRepCount, setLastProcessedRepCount] = useState(0)
  const [repSegments, setRepSegments] = useState<RepSegment[]>([])
  const [exerciseConfig, setExerciseConfig] = useState<ExerciseConfig | null>(null)
  
  // Form analysis
  const [formScore, setFormScore] = useState(0)
  const [feedback, setFeedback] = useState<string>('')
  
  // Simulation state
  const [simulationTimer, setSimulationTimer] = useState<NodeJS.Timeout | null>(null)
  
  // Initialize MediaPipe or simulation mode
  useEffect(() => {
    let mounted = true
    
    async function initializeMediaPipe() {
      try {
        // Check if MediaPipe is available and model files are accessible
        if (PoseLandmarker && FilesetResolver) {
          const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
          )
          
          if (!mounted) return
          
          const landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: '/mediapipe/pose_landmarker_heavy.task',
              delegate: 'GPU'
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5
          })
          
          if (!mounted) return
          
          setPoseLandmarker(landmarker)
          setIsInitialized(true)
          setInitError(null)
        } else {
          // Fall back to simulation mode
          if (mounted) {
            setIsSimulationMode(true)
            setIsInitialized(true)
            setInitError(null)
          }
        }
      } catch (error) {
        console.error('Failed to initialize MediaPipe, falling back to simulation:', error)
        if (mounted) {
          setIsSimulationMode(true)
          setIsInitialized(true)
          setInitError(null)
        }
      }
    }
    
    initializeMediaPipe()
    
    return () => {
      mounted = false
    }
  }, [])
  
  // Generate simulated pose data for demonstration
  const generateSimulatedPose = (frameIndex: number): Pose => {
    const config = getExerciseConfig(exerciseType)
    if (!config) return []
    
    // Create a basic pose structure with 33 landmarks
    const basePose: Pose = Array(33).fill(null).map((_, i) => ({
      x: 0.5 + Math.sin(frameIndex * 0.1) * 0.1 * Math.random(),
      y: 0.5 + Math.cos(frameIndex * 0.1) * 0.1 * Math.random(),
      z: 0,
      visibility: 0.9
    }))
    
    // Simulate realistic movement for the specific exercise
    const time = frameIndex * 0.1
    if (exerciseType.includes('pushup') || exerciseType.includes('push')) {
      // Simulate push-up elbow movement
      const elbowAngle = 90 + 60 * Math.sin(time * 0.8) // Elbow flexion/extension
      const shoulderY = 0.4
      const elbowY = shoulderY + 0.15
      const wristY = elbowY + 0.15
      
      // Left arm
      basePose[11] = { x: 0.35, y: shoulderY, z: 0, visibility: 0.9 } // Left shoulder
      basePose[13] = { x: 0.25, y: elbowY, z: 0, visibility: 0.9 }   // Left elbow
      basePose[15] = { x: 0.15, y: wristY, z: 0, visibility: 0.9 }   // Left wrist
      
      // Right arm
      basePose[12] = { x: 0.65, y: shoulderY, z: 0, visibility: 0.9 } // Right shoulder
      basePose[14] = { x: 0.75, y: elbowY, z: 0, visibility: 0.9 }   // Right elbow
      basePose[16] = { x: 0.85, y: wristY, z: 0, visibility: 0.9 }   // Right wrist
    } else if (exerciseType.includes('squat')) {
      // Simulate squat knee movement
      const kneeAngle = 160 - 70 * Math.abs(Math.sin(time * 0.6)) // Knee flexion
      const hipY = 0.5
      const kneeY = hipY + 0.25
      const ankleY = kneeY + 0.25
      
      // Left leg
      basePose[23] = { x: 0.45, y: hipY, z: 0, visibility: 0.9 }    // Left hip
      basePose[25] = { x: 0.45, y: kneeY, z: 0, visibility: 0.9 }   // Left knee
      basePose[27] = { x: 0.45, y: ankleY, z: 0, visibility: 0.9 }  // Left ankle
      
      // Right leg
      basePose[24] = { x: 0.55, y: hipY, z: 0, visibility: 0.9 }    // Right hip
      basePose[26] = { x: 0.55, y: kneeY, z: 0, visibility: 0.9 }   // Right knee
      basePose[28] = { x: 0.55, y: ankleY, z: 0, visibility: 0.9 }  // Right ankle
    }
    
    return basePose
  }
  
  // Process video frame for pose detection
  const processFrame = useCallback(() => {
    if (!canvasRef.current || !isDetecting) {
      return
    }
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      requestAnimationFrame(processFrame)
      return
    }
    
    try {
      // Clear canvas
      ctx.save()
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      if (isSimulationMode) {
        // Simulation mode - generate fake pose data
        const frameIndex = poseHistory.length
        const pose = generateSimulatedPose(frameIndex)
        
        // Add to pose history
        setPoseHistory(prev => {
          const newHistory = [...prev, pose]
          return newHistory.slice(-300) // Keep last 300 frames
        })
        
        // Draw simulated video background
        ctx.fillStyle = '#1a1a1a'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        // Draw "SIMULATION MODE" text
        ctx.fillStyle = '#ffffff'
        ctx.font = '20px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('SIMULATION MODE', canvas.width / 2, 30)
        ctx.font = '14px Arial'
        ctx.fillText('Demo: Simulated pose tracking for ' + exerciseType, canvas.width / 2, 55)
        
        // Draw pose connections and landmarks
        drawPoseConnections(ctx, pose, canvas.width, canvas.height)
        drawPoseLandmarks(ctx, pose, canvas.width, canvas.height)
        
      } else if (poseLandmarker && videoRef.current && videoRef.current.videoWidth > 0) {
        // Real MediaPipe mode
        const result = poseLandmarker.detectForVideo(videoRef.current, performance.now())
        
        // Draw the video frame
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
        
        // Draw pose landmarks if detected
        if (result.landmarks && result.landmarks.length > 0) {
          const landmarks = result.landmarks[0]
          
          // Convert to our pose format
          const pose: Pose = landmarks.map((landmark: MediaPipeLandmark) => ({
            x: landmark.x,
            y: landmark.y,
            z: landmark.z,
            visibility: landmark.visibility || 1
          }))
          
          // Add to pose history
          setPoseHistory(prev => {
            const newHistory = [...prev, pose]
            return newHistory.slice(-300)
          })
          
          // Draw pose connections and landmarks
          drawPoseConnections(ctx, pose, canvas.width, canvas.height)
          drawPoseLandmarks(ctx, pose, canvas.width, canvas.height)
        }
      }
      
      ctx.restore()
      
      if (isDetecting) {
        requestAnimationFrame(processFrame)
      }
    } catch (error) {
      console.error('Error processing frame:', error)
    }
  }, [poseLandmarker, isDetecting, isSimulationMode, exerciseType, poseHistory.length])
  
  // Process pose history for rep counting
  useEffect(() => {
    if (!isWorkoutActive || poseHistory.length < 20) return
    
    async function analyzeReps() {
      try {
        const result = await processExerciseReps(
          poseHistory,
          exerciseType,
          lastProcessedRepCount
        )
        
        if (result.repCount > repCount) {
          setRepCount(result.repCount)
          setRepSegments(prev => [...prev, ...result.newRepSegments])
          setLastProcessedRepCount(result.repCount)
          
          // Calculate form score based on rep segments
          if (result.newRepSegments.length > 0) {
            const latestSegment = result.newRepSegments[result.newRepSegments.length - 1]
            const formAnalysis = analyzeRepForm(latestSegment, result.configUsed)
            setFormScore(Math.round((formScore * (repCount - 1) + formAnalysis.score) / repCount))
            setFeedback(formAnalysis.feedback)
          }
        }
        
        setExerciseConfig(result.configUsed)
      } catch (error) {
        console.error('Error analyzing reps:', error)
      }
    }
    
    // Debounce the analysis to avoid excessive calls
    const timeoutId = setTimeout(analyzeReps, 100)
    return () => clearTimeout(timeoutId)
  }, [poseHistory, exerciseType, isWorkoutActive, repCount, lastProcessedRepCount, formScore])
  
  const analyzeRepForm = (repSegment: RepSegment, config: ExerciseConfig | null) => {
    if (!repSegment.angles.length || !config) {
      return { score: 70, feedback: 'Form analysis unavailable' }
    }
    
    const angles = repSegment.angles.map(a => a.angle)
    const minAngle = Math.min(...angles)
    const maxAngle = Math.max(...angles)
    const rangeOfMotion = maxAngle - minAngle
    
    // Simple scoring based on range of motion
    let score = 70 // Base score
    
    // Check if rep achieved good range of motion
    if (rangeOfMotion > 60) {
      score += 20
    } else if (rangeOfMotion > 40) {
      score += 10
    }
    
    // Check rep duration (should be controlled, not too fast)
    if (repSegment.duration > 800 && repSegment.duration < 3000) {
      score += 10
    }
    
    score = Math.min(100, score)
    
    const feedback = score >= 85 ? 'Excellent form!' : 
                    score >= 75 ? 'Good rep, maintain control' : 
                    'Focus on full range of motion'
    
    return { score, feedback }
  }
  
  const drawPoseConnections = (ctx: CanvasRenderingContext2D, pose: Pose, width: number, height: number) => {
    const connections = [
      // Torso
      [11, 12], [11, 23], [12, 24], [23, 24],
      // Left arm
      [11, 13], [13, 15],
      // Right arm  
      [12, 14], [14, 16],
      // Left leg
      [23, 25], [25, 27],
      // Right leg
      [24, 26], [26, 28]
    ]
    
    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 2
    
    connections.forEach(([start, end]) => {
      const startPoint = pose[start]
      const endPoint = pose[end]
      
      if (startPoint && endPoint && 
          startPoint.visibility && startPoint.visibility > 0.5 &&
          endPoint.visibility && endPoint.visibility > 0.5) {
        ctx.beginPath()
        ctx.moveTo(startPoint.x * width, startPoint.y * height)
        ctx.lineTo(endPoint.x * width, endPoint.y * height)
        ctx.stroke()
      }
    })
  }
  
  const drawPoseLandmarks = (ctx: CanvasRenderingContext2D, pose: Pose, width: number, height: number) => {
    ctx.fillStyle = '#ff0000'
    
    pose.forEach((landmark, index) => {
      if (landmark && landmark.visibility && landmark.visibility > 0.5) {
        ctx.beginPath()
        ctx.arc(
          landmark.x * width,
          landmark.y * height,
          3,
          0,
          2 * Math.PI
        )
        ctx.fill()
      }
    })
  }
  
  const startWorkout = async () => {
    try {
      if (!isInitialized) {
        throw new Error('Pose detection not initialized')
      }
      
      if (canvasRef.current) {
        const canvas = canvasRef.current
        canvas.width = 640
        canvas.height = 480
        
        if (!isSimulationMode) {
          // Try to get camera stream for real MediaPipe mode
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
              }
            })
            
            if (videoRef.current) {
              videoRef.current.srcObject = stream
              await videoRef.current.play()
              
              canvas.width = videoRef.current.videoWidth || 640
              canvas.height = videoRef.current.videoHeight || 480
            }
            
            setCurrentStream(stream)
          } catch (cameraError) {
            console.log('Camera not available, continuing in simulation mode')
            setIsSimulationMode(true)
          }
        }
        
        setIsWorkoutActive(true)
        setIsDetecting(true)
        
        // Reset state
        setRepCount(0)
        setPoseHistory([])
        setLastProcessedRepCount(0)
        setRepSegments([])
        setFormScore(0)
        setFeedback('')
        
        onWorkoutStart?.()
        
        // Start processing frames
        setTimeout(() => {
          processFrame()
        }, 100)
      }
    } catch (error) {
      console.error('Error starting workout:', error)
      alert('Failed to start workout. Please try again.')
    }
  }
  
  const stopWorkout = () => {
    setIsDetecting(false)
    setIsWorkoutActive(false)
    
    // Clear simulation timer if it exists
    if (simulationTimer) {
      clearTimeout(simulationTimer)
      setSimulationTimer(null)
    }
    
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop())
      setCurrentStream(null)
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    onWorkoutStop?.()
    
    // Complete the workout
    if (repCount > 0) {
      const sessionData = JSON.stringify({
        repSegments: repSegments,
        exerciseConfig: exerciseConfig,
        totalPoses: poseHistory.length,
        timestamp: Date.now(),
        exerciseType: exerciseType,
        simulationMode: isSimulationMode
      })
      
      onWorkoutComplete({
        repCount,
        formScore,
        sessionData,
        repSegments
      })
    }
  }
  
  if (!isInitialized) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          {initError ? (
            <>
              <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Initialization Failed</h3>
              <p className="text-muted-foreground mb-4">{initError}</p>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </>
          ) : (
            <>
              <Loader2 className="mx-auto h-12 w-12 animate-spin mb-4" />
              <h3 className="text-lg font-semibold mb-2">Loading AI Pose Detection</h3>
              <p className="text-muted-foreground">
                Initializing MediaPipe models...
              </p>
            </>
          )}
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Video Feed */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              AI Pose Analysis
              {isSimulationMode && (
                <Badge variant="outline" className="ml-2">
                  Demo Mode
                </Badge>
              )}
            </CardTitle>
            {isWorkoutActive && (
              <Badge variant="secondary" className="animate-pulse">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                {isSimulationMode ? 'Simulating' : 'Recording'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <video
              ref={videoRef}
              className="hidden"
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="w-full max-w-2xl mx-auto bg-black rounded-lg"
              width={640}
              height={480}
            />
            
            {!isWorkoutActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                <div className="text-center text-white">
                  <Target className="mx-auto h-16 w-16 mb-4" />
                  <p className="text-lg font-semibold mb-2">Ready to Start</p>
                  <p className="text-sm opacity-75">
                    {isSimulationMode 
                      ? 'Demo mode will simulate pose tracking'
                      : 'Position yourself in front of the camera'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {isSimulationMode && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Demo Mode:</strong> This is a simulation for demonstration purposes. 
                In production, real MediaPipe pose detection would analyze your actual movements.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Workout Controls & Stats */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Workout Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isWorkoutActive ? (
              <Button onClick={startWorkout} size="lg" className="w-full">
                <Camera className="mr-2 h-4 w-4" />
                Start {exerciseType} {isSimulationMode ? 'Demo' : 'Analysis'}
              </Button>
            ) : (
              <Button 
                onClick={stopWorkout} 
                size="lg" 
                variant="destructive" 
                className="w-full"
              >
                <StopCircle className="mr-2 h-4 w-4" />
                Complete Workout
              </Button>
            )}
            
            {isWorkoutActive && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Perform your {exerciseType} reps in front of the camera
                </p>
                <Progress value={Math.min(100, (repCount / 10) * 100)} />
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Real-time Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {repCount}
                </div>
                <div className="text-sm text-muted-foreground">Reps</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {formScore}%
                </div>
                <div className="text-sm text-muted-foreground">Form Score</div>
              </div>
            </div>
            
            {feedback && isWorkoutActive && (
              <Alert className="mt-4">
                <Zap className="h-4 w-4" />
                <AlertDescription>{feedback}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}