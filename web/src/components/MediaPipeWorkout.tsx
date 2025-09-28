'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Camera, 
  StopCircle, 
  Target, 
  Zap, 
  AlertCircle,
  Loader2,
  Video
} from 'lucide-react'
import { 
  processExerciseReps, 
  type Pose, 
  type ExerciseConfig,
  type RepSegment,
  getExerciseConfig 
} from '@/lib/mediapipe-utils'
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision'
import { FitStakeAgent } from '@/lib/fitstake-agent-client'



interface MediaPipeWorkoutProps {
  exerciseType: string
  exerciseConfig?: ExerciseConfig | string
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
  exerciseConfig: providedConfig,
  onWorkoutComplete, 
  onWorkoutStart,
  onWorkoutStop 
}: MediaPipeWorkoutProps) {
  // Refs for video and canvas elements
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingUtilsRef = useRef<DrawingUtils | null>(null)
  
  // MediaPipe state
  const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  
  // Workout state
  const [isWorkoutActive, setIsWorkoutActive] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null)
  
  // Exercise tracking
  const [repCount, setRepCount] = useState(0)
  const [poseHistory, setPoseHistory] = useState<Pose[]>([])
  const [exerciseConfig, setExerciseConfig] = useState<ExerciseConfig | null>(null)
  
  // Form analysis
  const [formScore, setFormScore] = useState(0)
  const [feedback, setFeedback] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastProcessedRepCount, setLastProcessedRepCount] = useState(0)
  const [repSegments, setRepSegments] = useState<RepSegment[]>([])
  
  // AI Agent for cheat detection and storage
  const [agent] = useState(() => new FitStakeAgent());
  const [aiAlert, setAiAlert] = useState<{ message: string; level: 'warning' | 'error' } | null>(null);
  const [workoutViolations, setWorkoutViolations] = useState<Array<{
    isSuspicious: boolean
    reason: string
    confidence: number
    timestamp: number
  }>>([]);
  const [workoutStartTime, setWorkoutStartTime] = useState<number>(0);
  const [lastDetectionTime, setLastDetectionTime] = useState<number>(0)
  const mediapipeTimestampRef = useRef<number>(0)
  const DETECTION_INTERVAL_MS = 100 // 10 FPS (1000ms / 10 = 100ms)

  // Camera selection state
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const [isCameraListLoading, setIsCameraListLoading] = useState(false)

  // Initialize MediaPipe
  useEffect(() => {
    const initializeMediaPipe = async () => {
      try {
        setIsLoading(true)
        setInitError(null)

        console.log('Initializing MediaPipe...')
        
        // Initialize FilesetResolver - try CDN first, fallback to local
        let vision
        try {
          vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
          )
        } catch (error) {
          console.warn('CDN failed, trying local files:', error)
          vision = await FilesetResolver.forVisionTasks('/mediapipe')
        }
        

        // Try to load the heavier full model for better accuracy
        let modelAssetPath = '/pose_landmarker_full.task';
        let landmarker: PoseLandmarker | null = null;
        try {
          // Try to fetch the full model to check if it exists
          await fetch(modelAssetPath, { method: 'HEAD' });
          console.log('Using full pose model:', modelAssetPath);
        } catch {
          // Fallback to the default lightweight model
          modelAssetPath = '/pose_landmarker.task';
          console.log('Full model not found, using lightweight model:', modelAssetPath);
        }
        landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath,
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numPoses: 1
        });

        setPoseLandmarker(landmarker)
        setIsInitialized(true)
        console.log('MediaPipe initialized successfully!')

        // Initialize drawing utils
        if (canvasRef.current) {
          const canvasCtx = canvasRef.current.getContext('2d')
          if (canvasCtx) {
            drawingUtilsRef.current = new DrawingUtils(canvasCtx)
            console.log('Drawing utils initialized')
          }
        }
        
        setIsLoading(false)
        
        // If camera is already active, start detection
        if (isCameraActive) {
          console.log('Camera already active, starting detection...')
          setIsDetecting(true)
        }
        
      } catch (error) {
        console.error('Failed to initialize MediaPipe:', error)
        setInitError(`Failed to initialize pose detection: ${error}`)
      } finally {
        setIsLoading(false)
      }
    }

    initializeMediaPipe()
  }, [])

  // Setup exercise config
  useEffect(() => {
    let config: ExerciseConfig | null = null
    
    if (providedConfig) {
      // Use provided config (from contract)
      if (typeof providedConfig === 'string') {
        try {
          config = JSON.parse(providedConfig)
          console.log('Using contract exercise config:', config)
        } catch (error) {
          console.error('Failed to parse exercise config from contract:', error)
          console.error('Config string:', providedConfig)
          // Fall back to predefined config
          config = getExerciseConfig(exerciseType)
        }
      } else {
        config = providedConfig
        console.log('Using provided exercise config object:', config)
      }
    } else {
      // Use predefined config
      config = getExerciseConfig(exerciseType)
      console.log('Using predefined exercise config for:', exerciseType)
    }
    
    if (!config) {
      console.error('No exercise configuration available for:', exerciseType)
      setInitError('No exercise configuration found. Please try a different exercise type.')
      return
    }
    
    setExerciseConfig(config)
  }, [providedConfig, exerciseType])

  // Enumerate available cameras
  const enumerateCameras = async () => {
    try {
      setIsCameraListLoading(true)
      
      // Request permission first to get device labels
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true })
      tempStream.getTracks().forEach(track => track.stop())
      
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      
      console.log('Available cameras:', videoDevices)
      setAvailableCameras(videoDevices)
      
      // Set default to first available camera if none selected
      if (!selectedCameraId && videoDevices.length > 0) {
        setSelectedCameraId(videoDevices[0].deviceId)
      }
      
    } catch (error) {
      console.error('Failed to enumerate cameras:', error)
      setError('Failed to access camera devices')
    } finally {
      setIsCameraListLoading(false)
    }
  }

  // Load available cameras on component mount
  useEffect(() => {
    enumerateCameras()
  }, [])

  // Start camera
  const startCamera = async () => {
    try {
      setError('')
      console.log('Starting camera...', { selectedCameraId })
      
      // Build video constraints
      const videoConstraints: MediaTrackConstraints = {
        width: 640, 
        height: 480,
      }
      
      // Use specific camera if selected, otherwise default to user-facing
      if (selectedCameraId) {
        videoConstraints.deviceId = { exact: selectedCameraId }
      } else {
        videoConstraints.facingMode = 'user'
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: videoConstraints
      })
      
      setCurrentStream(stream)
      
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          
          // Set up video event listeners
          videoRef.current.onloadedmetadata = () => {
            if (canvasRef.current && videoRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth
              canvasRef.current.height = videoRef.current.videoHeight
              console.log('Canvas dimensions updated on metadata load:', {
                width: canvasRef.current.width,
                height: canvasRef.current.height
              })
            }
          }
          
          await videoRef.current.play()
          setIsCameraActive(true)
          console.log('Camera started successfully')
          
          // Set canvas dimensions to match video
          if (canvasRef.current && videoRef.current.videoWidth > 0) {
            canvasRef.current.width = videoRef.current.videoWidth
            canvasRef.current.height = videoRef.current.videoHeight
            console.log('Canvas dimensions set:', {
              width: canvasRef.current.width,
              height: canvasRef.current.height
            })
          }
          
          // Start detection automatically if MediaPipe is ready
          if (poseLandmarker) {
            console.log('MediaPipe ready, will start detection via useEffect...')
          } else {
            console.log('MediaPipe not ready yet, waiting...')
          }
        }      return stream
    } catch (error) {
      console.error('Failed to start camera:', error)
      setError('Camera access denied or unavailable')
      throw error
    }
  }

  // Switch camera while active
  const switchCamera = async (cameraId: string) => {
    if (!isCameraActive) return
    
    try {
      // Stop current camera
      await stopCamera()
      
      // Update selected camera
      setSelectedCameraId(cameraId)
      
      // Start with new camera
      await startCamera()
      
    } catch (error) {
      console.error('Failed to switch camera:', error)
      setError('Failed to switch camera')
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop())
      setCurrentStream(null)
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    setIsCameraActive(false)
  }

  // Analyze form and provide real-time feedback
  const analyzeForm = useCallback((currentPose: Pose) => {
    if (!exerciseConfig) return

    // Calculate key angles based on exercise type
    const targetFeedback: string[] = []
    
    // Example: For push-ups, check elbow and body alignment
    if (exerciseType === 'pushups' || exerciseType === 'pushup') {
      // Calculate elbow angle using MediaPipe landmark indices
      const leftShoulder = currentPose[11]  // LEFT_SHOULDER
      const leftElbow = currentPose[13]     // LEFT_ELBOW
      const rightShoulder = currentPose[12] // RIGHT_SHOULDER
      const rightElbow = currentPose[14]    // RIGHT_ELBOW
      
      if (leftShoulder && leftElbow && rightShoulder && rightElbow) {
        // Simplified form analysis based on elbow position relative to shoulders
        const avgElbowY = (leftElbow.y + rightElbow.y) / 2
        const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2
        
        if (avgElbowY > avgShoulderY + 0.1) {
          targetFeedback.push("Keep elbows closer to body")
        }
      }
    }

    // For squats, check knee and hip alignment
    if (exerciseType === 'squats' || exerciseType === 'squat') {
      const leftHip = currentPose[23]    // LEFT_HIP
      const leftKnee = currentPose[25]   // LEFT_KNEE
      const rightHip = currentPose[24]   // RIGHT_HIP
      const rightKnee = currentPose[26]  // RIGHT_KNEE
      
      if (leftHip && leftKnee && rightHip && rightKnee) {
        const avgKneeY = (leftKnee.y + rightKnee.y) / 2
        const avgHipY = (leftHip.y + rightHip.y) / 2
        
        // Check squat depth
        if (avgKneeY < avgHipY - 0.05) {
          targetFeedback.push("Good squat depth!")
        } else if (avgKneeY > avgHipY + 0.1) {
          targetFeedback.push("Squat deeper for better form")
        }
      }
    }

    if (targetFeedback.length > 0) {
      setFeedback(targetFeedback[0])
    } else {
      setFeedback("Good form!")
    }
  }, [exerciseConfig, exerciseType])

  // Process pose detection
  const processPoseDetection = useCallback(() => {
    if (!poseLandmarker || !videoRef.current || !isDetecting) {
      return
    }

    // Frame rate limiting - only detect every 100ms (10 FPS) to prevent performance issues
    const now = Date.now()
    if (now - lastDetectionTime < DETECTION_INTERVAL_MS) {
      return // Skip this frame
    }
    setLastDetectionTime(now)

    const video = videoRef.current
    // Prevent detection if video is not ready or has zero dimensions
    if (
      video.readyState < 2 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      // Video not ready, skip this frame (but don't spam console)
      return
    }

    try {
      // Use monotonically increasing timestamp for MediaPipe
      // MediaPipe requires timestamps in microseconds and strictly increasing
      // Use performance.now() converted to microseconds for unique timestamps
      const timestamp = Math.floor(performance.now() * 1000) // Convert ms to microseconds
      
      // Ensure timestamp is always increasing by using max with previous timestamp
      const safeTimestamp = Math.max(timestamp, mediapipeTimestampRef.current + 1)
      mediapipeTimestampRef.current = safeTimestamp
      
      const result = poseLandmarker.detectForVideo(video, safeTimestamp)
      
      // Only log detection results occasionally to avoid spam
      if (Math.random() < 0.1) { // Log ~10% of detections
        console.log('Pose detection result:', {
          landmarksCount: result.landmarks?.length || 0,
          hasLandmarks: !!(result.landmarks && result.landmarks.length > 0),
          fps: '10 FPS (limited)',
          timestamp: safeTimestamp,
          rawTimestamp: timestamp
        })
      }
      
      if (result.landmarks && result.landmarks.length > 0) {
        const landmarks = result.landmarks[0]
        
        // Convert to our Pose format
        const pose: Pose = landmarks.map((landmark: MediaPipeLandmark, index: number) => ({
          x: landmark.x,
          y: landmark.y,
          z: landmark.z || 0,
          visibility: landmark.visibility || 1
        }))

        // Add to pose history
        setPoseHistory(prev => {
          const newHistory = [...prev, pose]
          console.log('Pose history length:', newHistory.length)
          return newHistory
        })

        // Draw pose on canvas
        drawPose(result)

        // Analyze form and provide feedback
        analyzeForm(pose)
      } else {
        console.log('No pose landmarks detected')
      }
    } catch (error) {
      console.error('Pose detection error:', error)
    }
  }, [poseLandmarker, isDetecting, analyzeForm])

  // Draw pose on canvas
  const drawPose = (result: { landmarks: MediaPipeLandmark[][]; worldLandmarks: MediaPipeLandmark[][] }) => {
    if (!canvasRef.current || !drawingUtilsRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw pose landmarks and connections
    if (result.landmarks && result.landmarks.length > 0) {
      // Convert MediaPipeLandmark to NormalizedLandmark by ensuring visibility is always a number
      const normalizedLandmarks = result.landmarks[0].map(landmark => ({
        ...landmark,
        visibility: landmark.visibility ?? 1
      }))
      
      drawingUtilsRef.current.drawLandmarks(normalizedLandmarks)
      drawingUtilsRef.current.drawConnectors(normalizedLandmarks, PoseLandmarker.POSE_CONNECTIONS)
    }
  }

  // Process reps from pose history
  useEffect(() => {
    if (!exerciseConfig || poseHistory.length < 10) return

    const processReps = async () => {
      try {
        const result = await processExerciseReps(
          poseHistory, 
          exerciseType, 
          lastProcessedRepCount,
          {},
          exerciseConfig
        )
        
        if (result.repCount > lastProcessedRepCount) {
          setRepCount(result.repCount)
          setLastProcessedRepCount(result.repCount)
          setRepSegments(result.newRepSegments)
          
          // Calculate form score
          if (result.newRepSegments.length > 0) {
            const avgScore = result.newRepSegments.reduce((sum: number, seg: RepSegment) => sum + seg.formScore, 0) / result.newRepSegments.length
            setFormScore(Math.round(avgScore))
          }
        }
      } catch (error) {
        console.error('Error processing reps:', error)
      }
    }

    processReps()
  }, [poseHistory, exerciseConfig, lastProcessedRepCount, exerciseType])

  // Animation loop for pose detection
  useEffect(() => {
    let animationId: number

    const animate = () => {
      processPoseDetection()
      animationId = requestAnimationFrame(animate)
    }

    if (isDetecting) {
      animationId = requestAnimationFrame(animate)
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [processPoseDetection, isDetecting])

  // Start workout
  const startWorkout = async () => {
    try {
      await startCamera()
      setIsWorkoutActive(true)
      
      // Initialize workout session state
      setWorkoutStartTime(Date.now())
      setPoseHistory([])
      setRepCount(0)
      setLastProcessedRepCount(0)
      setRepSegments([])
      setFormScore(0)
      setFeedback('')
      setWorkoutViolations([])
      setAiAlert(null)
      
      // Reset MediaPipe timestamp for clean state
      mediapipeTimestampRef.current = 0
      
      console.log('🏋️ Workout started with 0G AI monitoring')
      onWorkoutStart?.()
    } catch (error) {
      console.error('Failed to start workout:', error)
      setInitError('Failed to start camera. Please check permissions.')
    }
  }

  // Synchronize detection start: only enable detection when both camera and poseLandmarker are ready
  useEffect(() => {
    console.log('Detection sync check:', {
      isWorkoutActive,
      isCameraActive,
      poseLandmarkerReady: !!poseLandmarker,
      exerciseConfigReady: !!exerciseConfig
    })
    
    if (isWorkoutActive && isCameraActive && poseLandmarker) {
      console.log('Starting detection...')
      setIsDetecting(true)
    } else {
      if (isDetecting) {
        console.log('Stopping detection...')
      }
      setIsDetecting(false)
    }
  }, [isWorkoutActive, isCameraActive, poseLandmarker, isDetecting])

  // Stop workout and store session
  const stopWorkout = async () => {
    const endTime = Date.now()
    
    setIsDetecting(false)
    setIsWorkoutActive(false)
    stopCamera()
    
    // Generate session data before resetting state
    const sessionData = JSON.stringify({
      exerciseType,
      repCount,
      formScore,
      duration: poseHistory.length > 0 ? 
        (poseHistory.length * 33) / 1000 : 0, // Assuming ~30fps = 33ms per frame
      poseCount: poseHistory.length,
      segments: repSegments,
      violations: workoutViolations.length
    })

    // Store workout session if connected to wallet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          console.log('💾 Storing workout session...')
          const storedSessionId = await agent.storeWorkoutSession(
            accounts[0], // userAddress
            exerciseType,
            workoutStartTime,
            endTime,
            repCount,
            workoutViolations,
            poseHistory, // pose data
            'medium' // difficulty
          )
          
          if (storedSessionId) {
            console.log('✅ Workout session stored:', storedSessionId)
          }
        }
      } catch (error) {
        console.warn('Failed to store workout session:', error)
      }
    }
    
    // Reset all workout state for a clean restart
    setPoseHistory([])
    setRepCount(0)
    setLastProcessedRepCount(0)
    setRepSegments([])
    setFormScore(0)
    setFeedback('')
    setWorkoutViolations([])
    setWorkoutStartTime(0)
    
    // Reset MediaPipe timestamp for next session
    mediapipeTimestampRef.current = 0

    onWorkoutComplete({
      repCount,
      formScore,
      sessionData,
      repSegments
    })

    onWorkoutStop?.()
  }

  const analyzeWithAI = useCallback(async (poseHistory: Pose[]) => {
    if (poseHistory.length % 10 !== 0) return; // Analyze every 10 frames
    if (poseHistory.length === 0) return; // No poses to analyze

    // Get the most recent pose for analysis
    const currentPose = poseHistory[poseHistory.length - 1];
    
    // Convert pose history to the format expected by the agent (last 20 poses)
    const timeWindow = poseHistory.slice(-20);
    
    try {
      const analysis = await agent.detectRealTimeAnomalies(
        currentPose, // This is already Landmark[] (same as PoseLandmark[])
        exerciseType,
        repCount,
        timeWindow // This is already Landmark[][] (same as PoseLandmark[][])
      );
      
      if (analysis.isSuspicious) {
        // Record the violation for the workout session
        setWorkoutViolations(prev => [...prev, {
          isSuspicious: true,
          reason: analysis.reason,
          confidence: analysis.confidence,
          timestamp: analysis.timestamp
        }]);
        
        setAiAlert({
          message: `AI Alert: ${analysis.reason} (Confidence: ${Math.round(analysis.confidence * 100)}%)`,
          level: analysis.confidence > 0.9 ? 'error' : 'warning'
        });
      } else {
        setAiAlert(null);
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
    }
  }, [agent, exerciseType, repCount]);

  useEffect(() => {
    if (isWorkoutActive && poseHistory.length > 0) {
      analyzeWithAI(poseHistory);
    }
  }, [poseHistory, isWorkoutActive, analyzeWithAI]);

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto">
      {/* Workout Statistics Cards - Above video when active */}
      {isWorkoutActive && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Rep Count</h3>
                  <p className="text-4xl font-bold text-blue-600">{repCount}</p>
                  <p className="text-sm text-gray-600 mt-1">Completed Reps</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Target className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Form Score</h3>
                  <p className="text-4xl font-bold text-green-600">{formScore}%</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {formScore >= 80 ? 'Excellent Form' : formScore >= 60 ? 'Good Form' : 'Needs Improvement'}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Zap className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Video Card */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="h-5 w-5" />
            <span>Live Workout Session</span>
            {exerciseConfig && (
              <Badge variant="outline" className="ml-auto">{exerciseConfig.name}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Camera Feed and Pose Visualization */}
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
              />
              
              {!isCameraActive && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <div className="text-center text-gray-400">
                    <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Camera not active</p>
                    <p className="text-sm opacity-75">Start camera to begin workout</p>
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <div className="text-center text-blue-400">
                    <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin" />
                    <p className="text-lg">Initializing MediaPipe...</p>
                    <p className="text-sm opacity-75">Loading pose detection models</p>
                  </div>
                </div>
              )}
              
              {/* Status and Camera Switch overlay */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className="flex items-center space-x-2 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-white">
                  <div className={`w-2 h-2 rounded-full ${isDetecting ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-sm font-medium">
                    {isDetecting ? 'Detecting' : 'Standby'}
                  </span>
                </div>
                
                {/* Camera Switch Button - only show when camera is active and multiple cameras available */}
                {isCameraActive && availableCameras.length > 1 && (
                  <Select
                    value={selectedCameraId}
                    onValueChange={switchCamera}
                  >
                    <SelectTrigger className="w-auto bg-black/70 backdrop-blur-sm border-gray-600 text-white">
                      <Video className="h-4 w-4" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCameras.map((camera, index) => (
                        <SelectItem key={camera.deviceId} value={camera.deviceId}>
                          <div className="flex items-center gap-2">
                            <Video className="h-4 w-4" />
                            <span>
                              {camera.label || `Camera ${index + 1}`}
                              {camera.label?.toLowerCase().includes('front') && ' 📱'}
                              {camera.label?.toLowerCase().includes('back') && ' 📷'}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Real-time feedback overlay */}
              {feedback && isWorkoutActive && (
                <div className="absolute bottom-4 left-4">
                  <div className="bg-blue-600/90 backdrop-blur-sm rounded-lg px-4 py-2 text-white">
                    <div className="font-medium">{feedback}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Exercise Selection */}
            {!isWorkoutActive && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
                  <div className="font-medium text-lg">Exercise: {exerciseType}</div>
                  <div className="text-sm mt-1">Get ready to perform {exerciseType}s with proper form</div>
                </div>

                {/* Camera Selection */}
                {!isCameraActive && availableCameras.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        Select Camera
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={enumerateCameras}
                        disabled={isCameraListLoading}
                      >
                        {isCameraListLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Video className="h-4 w-4" />
                        )}
                        <span className="ml-1">Refresh</span>
                      </Button>
                    </div>
                    <Select
                      value={selectedCameraId}
                      onValueChange={setSelectedCameraId}
                      disabled={isCameraListLoading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose camera..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCameras.map((camera, index) => (
                          <SelectItem key={camera.deviceId} value={camera.deviceId}>
                            <div className="flex items-center gap-2">
                              <Video className="h-4 w-4" />
                              <span>
                                {camera.label || `Camera ${index + 1}`}
                                {camera.label?.toLowerCase().includes('front') && ' 📱'}
                                {camera.label?.toLowerCase().includes('back') && ' 📷'}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {!isCameraActive ? (
                  <Button
                    onClick={startCamera}
                    disabled={isLoading}
                    className="w-full h-12 text-lg"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Loading MediaPipe...
                      </>
                    ) : (
                      <>
                        <Camera className="mr-2 h-5 w-5" />
                        Start Camera
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={startWorkout}
                    disabled={!poseLandmarker || !exerciseConfig}
                    className="w-full h-12 text-lg"
                    size="lg"
                  >
                    {!poseLandmarker ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Loading MediaPipe...
                      </>
                    ) : !exerciseConfig ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Loading Exercise Config...
                      </>
                    ) : (
                      <>
                        <Target className="mr-2 h-5 w-5" />
                        Start Workout
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Workout Controls */}
            {isWorkoutActive && (
              <div className="flex space-x-4">
                <Button
                  onClick={stopWorkout}
                  variant="destructive"
                  className="flex-1 h-12 text-lg"
                  size="lg"
                >
                  <StopCircle className="mr-2 h-5 w-5" />
                  Stop Workout
                </Button>
              </div>
            )}

            {/* Error Display */}
            {(error || initError) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-base">
                  {error || initError}
                </AlertDescription>
              </Alert>
            )}

            {/* AI-generated Alerts */}
            {aiAlert && (
              <Alert variant={aiAlert.level === 'error' ? 'destructive' : 'default'} className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {aiAlert.message}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default MediaPipeWorkout