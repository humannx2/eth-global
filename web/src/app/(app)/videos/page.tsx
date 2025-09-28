'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Video, 
  Play, 
  Pause, 
  RefreshCw, 
  Calendar, 
  Clock, 
  Target,
  AlertTriangle,
  Download
} from 'lucide-react'
import { FitStakeAgent, WorkoutSession } from '@/lib/fitstake-agent-client'

function VideoPlayer({ session }: { session: WorkoutSession }) {
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying && currentFrame < session.pose_data.length - 1) {
      interval = setInterval(() => {
        setCurrentFrame(prev => prev + 1)
      }, 100) // 10 FPS playback
    } else if (currentFrame >= session.pose_data.length - 1) {
      setIsPlaying(false)
    }
    return () => clearInterval(interval)
  }, [isPlaying, currentFrame, session.pose_data.length])

  const togglePlay = () => {
    if (currentFrame >= session.pose_data.length - 1) {
      setCurrentFrame(0)
    }
    setIsPlaying(!isPlaying)
  }

  const duration = ((session.endTime || Date.now()) - session.startTime) / 1000

  return (
    <div className="space-y-4">
      <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
        <canvas 
          width="640" 
          height="480" 
          className="w-full h-full object-contain"
          ref={(canvas) => {
            if (canvas && session.pose_data[currentFrame]) {
              const ctx = canvas.getContext('2d')
              if (ctx) {
                // Clear canvas
                ctx.fillStyle = '#000'
                ctx.fillRect(0, 0, 640, 480)
                
                // Draw pose landmarks
                const landmarks = session.pose_data[currentFrame]
                if (landmarks && Array.isArray(landmarks)) {
                  ctx.strokeStyle = '#00ff00'
                  ctx.lineWidth = 2
                  ctx.fillStyle = '#ff0000'
                  
                  // Draw pose connections as dots
                  landmarks.forEach((landmark, index) => {
                    const x = landmark.x * 640
                    const y = landmark.y * 480
                    ctx.beginPath()
                    ctx.arc(x, y, 3, 0, 2 * Math.PI)
                    ctx.fill()
                  })
                }
              }
            }
          }}
        />
        <div className="absolute bottom-4 left-4 right-4 flex items-center space-x-2">
          <Button size="sm" onClick={togglePlay} variant="secondary">
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <div className="flex-1 text-xs text-white bg-black/50 rounded px-2 py-1">
            Frame {currentFrame + 1} / {session.pose_data.length}
          </div>
          <div className="text-xs text-white bg-black/50 rounded px-2 py-1">
            {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <div><strong>Exercise:</strong> {session.exerciseType}</div>
          <div><strong>Reps:</strong> {session.reps}</div>
          <div><strong>Difficulty:</strong> {session.metadata.difficulty}</div>
        </div>
        <div className="space-y-2">
          <div><strong>Duration:</strong> {Math.floor(duration / 60)}m {duration % 60}s</div>
          <div><strong>Date:</strong> {new Date(session.startTime).toLocaleDateString()}</div>
          <div><strong>AI Model:</strong> {session.metadata.ai_model}</div>
        </div>
      </div>

      {session.form_violations.length > 0 && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
              Form Violations ({session.form_violations.length})
            </h4>
            <div className="space-y-2">
              {session.form_violations.map((violation, index) => (
                <div key={index} className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                  <div className="font-medium">{violation.reason}</div>
                  <div className="text-muted-foreground">
                    Confidence: {(violation.confidence * 100).toFixed(1)}% | 
                    Time: {new Date(violation.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function VideosPage() {
  const { address } = useAccount()
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    if (address) {
      loadVideos()
    }
  }, [address])

  const loadVideos = async () => {
    if (!address) return
    
    setLoading(true)
    try {
      const agent = new FitStakeAgent()
      const history = await agent.getWorkoutSessions(address)
      // Only show sessions that have pose data (videos)
      const sessionsWithVideos = history.filter(session => 
        session.pose_data && session.pose_data.length > 0
      )
      setSessions(sessionsWithVideos)
    } catch (error) {
      console.error('Failed to load workout videos:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSessions = sessions.filter(session => {
    if (filter === 'all') return true
    return session.exerciseType === filter
  })

  const exercises = [...new Set(sessions.map(s => s.exerciseType))]

  if (!address) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Video className="h-6 w-6 mr-2" />
              My Workout Videos
            </CardTitle>
            <CardDescription>
              View and analyze your recorded workout sessions
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Please connect your wallet to view your workout videos
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Video className="h-6 w-6 mr-2" />
                My Workout Videos
              </CardTitle>
              <CardDescription>
                View and analyze your recorded workout sessions
              </CardDescription>
            </div>
            <Button onClick={loadVideos} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All Videos ({sessions.length})
            </Button>
            {exercises.map(exercise => {
              const count = sessions.filter(s => s.exerciseType === exercise).length
              return (
                <Button
                  key={exercise}
                  variant={filter === exercise ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(exercise)}
                >
                  {exercise} ({count})
                </Button>
              )
            })}
          </div>

          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your workout videos...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-8">
              <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No workout videos found</h3>
              <p className="text-muted-foreground">
                {filter === 'all' 
                  ? "Start a workout session to record your first video!"
                  : `No ${filter} workout videos found. Try a different filter.`
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSessions.map((session) => (
                <Card key={session.sessionId} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg capitalize">
                        {session.exerciseType}
                      </CardTitle>
                      <Badge variant={session.form_violations.length > 0 ? 'destructive' : 'default'}>
                        {session.form_violations.length > 0 
                          ? `${session.form_violations.length} issues`
                          : 'Clean form'
                        }
                      </Badge>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(session.startTime).toLocaleDateString()}
                      <Clock className="h-4 w-4 ml-3 mr-1" />
                      {Math.floor(((session.endTime || Date.now()) - session.startTime) / 60000)}m
                      <Target className="h-4 w-4 ml-3 mr-1" />
                      {session.reps} reps
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <Play className="h-4 w-4 mr-2" />
                          Watch Video ({session.pose_data.length} frames)
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            Workout Video - {session.exerciseType}
                          </DialogTitle>
                        </DialogHeader>
                        <VideoPlayer session={session} />
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}