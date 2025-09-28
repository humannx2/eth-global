'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle,
  Download,
  Eye,
  Loader2,
  TrendingUp,
  User,
  Clock,
  Target,
  Zap
} from 'lucide-react'
import { FitStakeAgent, type WorkoutSession } from '@/lib/fitstake-agent-client'

interface WorkoutHistoryProps {
  className?: string
}

export function WorkoutHistory({ className = '' }: WorkoutHistoryProps) {
  const { address, isConnected } = useAccount()
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedExercise, setSelectedExercise] = useState<string>('all')

  const agent = new FitStakeAgent()

  useEffect(() => {
    if (isConnected && address) {
      loadWorkoutHistory()
    }
  }, [isConnected, address, selectedExercise])

  const downloadWorkoutData = (session: WorkoutSession) => {
    const data = JSON.stringify(session, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workout_${session.exerciseType}_${new Date(session.startTime).toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const loadWorkoutHistory = async () => {
    if (!address) return

    setLoading(true)
    setError(null)

    try {
      const exerciseFilter = selectedExercise === 'all' ? undefined : selectedExercise
      const workouts = await agent.getWorkoutSessions(address, exerciseFilter, 20)
      setSessions(workouts)
    } catch (err) {
      console.error('Failed to load workout history:', err)
      setError('Failed to load workout history. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getExerciseTypes = () => {
    const types = new Set(sessions.map(s => s.exerciseType))
    return Array.from(types)
  }

  const formatDuration = (startTime: number, endTime: number) => {
    const minutes = Math.floor((endTime - startTime) / (1000 * 60))
    const seconds = Math.floor(((endTime - startTime) % (1000 * 60)) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getFormScore = (violations: WorkoutSession['form_violations']) => {
    if (violations.length === 0) return 100
    return Math.max(0, 100 - violations.length * 10)
  }

  const getFormScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (!isConnected) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Connect your wallet to view workout history</p>
          </div>
        </CardContent>
      </Card>
    )
  }



  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Workout History
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedExercise} onValueChange={setSelectedExercise}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by exercise" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exercises</SelectItem>
                {getExerciseTypes().map(type => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={loadWorkoutHistory} 
              disabled={loading}
              size="sm"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {loading && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
            <p className="text-gray-600">Loading workout history...</p>
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="mb-1">No workout sessions found</p>
            <p className="text-sm">Complete your first workout to see history here</p>
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exercise</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Reps</TableHead>
                  <TableHead>Form Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => {
                  const formScore = getFormScore(session.form_violations)
                  
                  return (
                    <TableRow key={session.sessionId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Target className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="font-medium capitalize">{session.exerciseType}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="h-3 w-3" />
                          {new Date(session.startTime).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock className="h-3 w-3" />
                          {session.endTime ? formatDuration(session.startTime, session.endTime) : 'In progress'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{session.reps} reps</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold ${getFormScoreColor(formScore)}`}>
                          {formScore}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {session.form_violations.length > 0 ? (
                            <>
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm text-yellow-700">{session.form_violations.length} issues</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-green-700">Clean</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Target className="h-5 w-5 text-blue-600" />
                                {session.exerciseType} Workout Details
                              </DialogTitle>
                              <DialogDescription>
                                Session from {new Date(session.startTime).toLocaleDateString()}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-6">
                              {/* Session Summary */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-gray-600">Reps Completed</p>
                                  <p className="text-2xl font-bold text-blue-600">{session.reps}</p>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-gray-600">Form Score</p>
                                  <p className={`text-2xl font-bold ${getFormScoreColor(formScore)}`}>
                                    {formScore}%
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-gray-600">Violations</p>
                                  <p className="text-2xl font-bold text-red-600">{session.form_violations.length}</p>
                                </div>
                              </div>

                              {/* Form Violations */}
                              {session.form_violations.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-3">Form Violations</h4>
                                  <div className="space-y-2">
                                    {session.form_violations.map((violation, idx) => (
                                      <div key={idx} className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-red-900">
                                            {violation.reason}
                                          </p>
                                          <p className="text-xs text-red-700">
                                            Confidence: {Math.round(violation.confidence * 100)}%
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Session Metadata */}
                              <div>
                                <h4 className="font-medium text-gray-900 mb-3">Session Info</h4>
                                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Session ID:</span>
                                    <span className="font-mono text-xs">{session.sessionId}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">AI Model:</span>
                                    <span>{session.metadata.ai_model}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Storage CID:</span>
                                    <span className="font-mono text-xs">{session.metadata.storage_cid || 'Not stored'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Download Actions */}
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  onClick={() => downloadWorkoutData(session)}
                                  className="flex items-center gap-2"
                                >
                                  <Download className="h-4 w-4" />
                                  Download Session
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}