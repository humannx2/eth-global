'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Sparkles, 
  Loader2, 
  Copy, 
  CheckCircle, 
  AlertTriangle,
  Zap
} from 'lucide-react'
import type { ExerciseConfig } from '@/lib/mediapipe-utils'

interface ExerciseConfigGeneratorProps {
  onConfigGenerated?: (config: ExerciseConfig) => void
}

export function ExerciseConfigGenerator({ onConfigGenerated }: ExerciseConfigGeneratorProps) {
  const [exerciseName, setExerciseName] = useState('')
  const [exerciseDescription, setExerciseDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedConfig, setGeneratedConfig] = useState<ExerciseConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isFallback, setIsFallback] = useState(false)
  const [copied, setCopied] = useState(false)

  const generateConfig = async () => {
    if (!exerciseName.trim()) {
      setError('Exercise name is required')
      return
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedConfig(null)
    setIsFallback(false)

    try {
      const response = await fetch('/api/generate-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exerciseName: exerciseName.trim(),
          exerciseDescription: exerciseDescription.trim() || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate configuration')
      }

      if (data.success) {
        setGeneratedConfig(data.config)
        setIsFallback(!!data.fallback)
        onConfigGenerated?.(data.config)
      } else {
        throw new Error(data.error || 'Failed to generate configuration')
      }

    } catch (error) {
      console.error('Error generating config:', error)
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyConfig = async () => {
    if (!generatedConfig) return
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(generatedConfig, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy config:', error)
    }
  }

  const clearConfig = () => {
    setGeneratedConfig(null)
    setError(null)
    setIsFallback(false)
    setCopied(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Exercise Config Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Form */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="exercise-name">Exercise Name *</Label>
            <Input
              id="exercise-name"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              placeholder="e.g., shoulder press, jumping jacks, burpees"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="exercise-description">Description (Optional)</Label>
            <Textarea
              id="exercise-description"
              value={exerciseDescription}
              onChange={(e) => setExerciseDescription(e.target.value)}
              placeholder="Describe how the exercise is performed for better AI analysis..."
              className="mt-1 resize-none"
              rows={3}
            />
          </div>

          <Button 
            onClick={generateConfig}
            disabled={isGenerating || !exerciseName.trim()}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating with AI...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Generate MediaPipe Config
              </>
            )}
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Generated Configuration */}
        {generatedConfig && (
          <div className="space-y-4">
            <Separator />
            
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Generated Configuration</h3>
              <div className="flex items-center gap-2">
                {isFallback && (
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Fallback
                  </Badge>
                )}
                <Button
                  onClick={copyConfig}
                  variant="outline"
                  size="sm"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="mr-2 h-3 w-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-3 w-3" />
                      Copy JSON
                    </>
                  )}
                </Button>
                <Button
                  onClick={clearConfig}
                  variant="ghost"
                  size="sm"
                >
                  Clear
                </Button>
              </div>
            </div>

            {isFallback && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Fallback Configuration:</strong> AI generation failed or isn't configured. 
                  This is a generic push-up configuration. Set CLOUDFLARE_API_TOKEN and 
                  CLOUDFLARE_ACCOUNT_ID environment variables to enable AI generation.
                </AlertDescription>
              </Alert>
            )}

            {/* Configuration Preview */}
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">{generatedConfig.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Initial Direction</Label>
                    <p className="font-medium">{generatedConfig.initialDirection}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Inverted</Label>
                    <p className="font-medium">{generatedConfig.inverted ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Min Peak Distance</Label>
                    <p className="font-medium">{generatedConfig.minPeakDistance} frames</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Angle Points</Label>
                    <p className="font-medium">{generatedConfig.anglePoints.length} joints</p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Tracked Joints</Label>
                  <div className="mt-2 space-y-2">
                    {generatedConfig.anglePoints.map((point, index) => (
                      <div key={index} className="text-sm bg-background rounded p-2">
                        <div className="font-medium">{point.name}</div>
                        <div className="text-muted-foreground">
                          Landmarks: [{point.points.join(', ')}]
                          {point.targetLowAngle && point.targetHighAngle && (
                            <span className="ml-2">
                              Range: {point.targetLowAngle}°-{point.targetHighAngle}°
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* JSON Preview */}
            <details>
              <summary className="cursor-pointer text-sm font-medium">
                View Raw JSON Configuration
              </summary>
              <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-x-auto">
                {JSON.stringify(generatedConfig, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  )
}