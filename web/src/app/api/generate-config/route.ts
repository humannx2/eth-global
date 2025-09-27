import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { createWorkersAI } from 'workers-ai-provider'
import { z } from 'zod'
import { LANDMARK_INDICES } from '@/lib/mediapipe-utils'

// Exercise config schema for validation
const ExerciseConfigSchema = z.object({
  name: z.string(),
  initialDirection: z.enum(['up', 'down']),
  minPeakDistance: z.number().min(5).max(20),
  inverted: z.boolean(),
  anglePoints: z.array(z.object({
    name: z.string(),
    points: z.tuple([z.number(), z.number(), z.number()]),
    weight: z.number().optional(),
    targetLowAngle: z.number().optional(),
    targetHighAngle: z.number().optional(),
  })).min(1)
})

export async function POST(req: NextRequest) {
  try {
    const { exerciseName, exerciseDescription } = await req.json()
    
    if (!exerciseName) {
      return NextResponse.json({ error: 'Exercise name is required' }, { status: 400 })
    }

    console.log('Generating exercise config with AI for:', exerciseName)

    // Check if Cloudflare credentials are available
    if (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) {
      try {
        // Create Cloudflare Workers AI client
        const workersai = createWorkersAI({
          apiKey: process.env.CLOUDFLARE_API_TOKEN!,
          accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
        })

        const systemPrompt = `You are an expert in biomechanics and exercise analysis. Generate MediaPipe pose tracking configurations for exercises.

AVAILABLE LANDMARK INDICES:
${Object.entries(LANDMARK_INDICES).map(([name, index]) => `${name}: ${index}`).join('\n')}

GUIDELINES:
1. Use joint angles for tracking: [shoulder, elbow, wrist] for arms, [hip, knee, ankle] for legs
2. Set realistic target ranges: Push-up elbow 60°-160°, Squat knee 90°-170°, Bicep curl 45°-150°
3. Use inverted=true when smaller angles = exercise "up" position
4. Include both left and right sides when possible
5. Set appropriate minPeakDistance: 5-8 for fast, 8-12 for moderate, 12-20 for slow exercises

Respond with a valid JSON object that matches the schema exactly.`

        const userPrompt = `Exercise: ${exerciseName}
${exerciseDescription ? `Description: ${exerciseDescription}` : ''}

Generate a complete MediaPipe pose tracking configuration for this exercise. Focus on the key joints that move during the exercise and set appropriate angle ranges for form analysis.`

        const result = await generateObject({
          model: workersai('@cf/meta/llama-3.3-70b-instruct-fp8-fast'),
          schema: ExerciseConfigSchema,
          prompt: userPrompt,
          system: systemPrompt,
          temperature: 0.3,
        })

        console.log('AI generated config successfully:', result.object)

        return NextResponse.json({ 
          success: true, 
          config: result.object,
          exerciseName,
          exerciseDescription 
        })

      } catch (aiError) {
        console.error('AI generation failed:', aiError)
        // Fall through to fallback
      }
    } else {
      console.log('Cloudflare credentials not configured, using fallback')
    }

    // Fallback config for demo purposes
    console.log('Using fallback config for:', exerciseName)
    
    const fallbackConfig = {
      name: exerciseName.toLowerCase().replace(/\s+/g, '_'),
      initialDirection: 'up' as const,
      inverted: true,
      minPeakDistance: 10,
      anglePoints: [
        {
          name: 'left_elbow',
          points: [11, 13, 15] as [number, number, number],
          weight: 1.0,
          targetLowAngle: 60,
          targetHighAngle: 160
        },
        {
          name: 'right_elbow',
          points: [12, 14, 16] as [number, number, number],
          weight: 1.0,
          targetLowAngle: 60,
          targetHighAngle: 160
        }
      ]
    }

    return NextResponse.json({ 
      success: true, 
      config: fallbackConfig,
      exerciseName,
      exerciseDescription,
      fallback: true,
      message: 'Using fallback config - AI generation failed or not configured'
    })

  } catch (error) {
    console.error('Error in generate-config route:', error)
    
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}