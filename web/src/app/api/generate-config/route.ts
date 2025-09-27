import { NextRequest, NextResponse } from 'next/server'
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

    const systemPrompt = `You are an expert in biomechanics and exercise analysis. Your task is to generate MediaPipe pose tracking configurations for exercises based on ANGLE MEASUREMENTS ONLY.

AVAILABLE LANDMARK INDICES:
${Object.entries(LANDMARK_INDICES).map(([name, index]) => `${name}: ${index}`).join('\n')}

EXERCISE ANALYSIS GUIDELINES:

1. **Angle-Based Tracking**: All exercises are tracked using joint angles, not individual joint positions
   - Focus on the joints that flex/extend during the exercise
   - Common patterns:
     - Elbow angles: [shoulder, elbow, wrist] (indices like [11, 13, 15])
     - Knee angles: [hip, knee, ankle] (indices like [23, 25, 27])
     - Shoulder angles: [hip, shoulder, elbow] for overhead movements

2. **Target Angle Ranges**: Set realistic biomechanical ranges
   - Push-up elbow: targetLowAngle=60°, targetHighAngle=160°
   - Squat knee: targetLowAngle=90°, targetHighAngle=170° 
   - Bicep curl elbow: targetLowAngle=45°, targetHighAngle=150°

3. **Signal Inversion**:
   - Set inverted=true when LOWER angles represent the exercise "up" position
   - Examples: Most exercises need inverted=true since flexion (smaller angles) is usually the "working" position

4. **Initial Direction**:
   - 'up': Exercise starts in the extended/top position
   - 'down': Exercise starts in the flexed/bottom position

5. **Min Peak Distance**: 
   - Faster exercises: 5-8 frames
   - Moderate exercises: 8-12 frames
   - Slower exercises: 12-20 frames

6. **Bilateral Tracking**: Include both left and right sides when possible for balanced analysis.

Respond with a valid JSON object matching this exact schema:
{
  "name": "string",
  "initialDirection": "up" | "down",
  "minPeakDistance": number (5-20),
  "inverted": boolean,
  "anglePoints": [
    {
      "name": "string",
      "points": [number, number, number],
      "weight": number (optional),
      "targetLowAngle": number (optional),
      "targetHighAngle": number (optional)
    }
  ]
}`

    const userPrompt = `Exercise: ${exerciseName}
${exerciseDescription ? `Description: ${exerciseDescription}` : ''}

Analyze this exercise and generate a MediaPipe pose tracking configuration. Consider the biomechanics, primary movement patterns, and which joints would provide the most reliable tracking data for rep counting and form analysis.

Return ONLY a valid JSON object, no additional text or explanation.`

    console.log('Generating exercise config with AI...')

    // Use Cloudflare Workers AI REST API directly
    if (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) {
      try {
        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [
                {
                  role: 'system',
                  content: systemPrompt
                },
                {
                  role: 'user',
                  content: userPrompt
                }
              ],
              max_tokens: 1000,
              temperature: 0.3
            })
          }
        )

        if (!response.ok) {
          throw new Error(`Cloudflare API error: ${response.status}`)
        }

        const result = await response.json()
        const aiResponse = result.result?.response || result.response

        console.log('Raw AI response:', aiResponse)

        // Try to parse the JSON from the AI response
        let config
        try {
          // Extract JSON from response if it's wrapped in text
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
          const jsonText = jsonMatch ? jsonMatch[0] : aiResponse
          config = JSON.parse(jsonText)
        } catch (parseError) {
          console.error('Failed to parse AI response as JSON:', parseError)
          throw new Error('AI response is not valid JSON')
        }

        // Validate the config
        const validatedConfig = ExerciseConfigSchema.parse(config)

        return NextResponse.json({ 
          success: true, 
          config: validatedConfig,
          exerciseName,
          exerciseDescription 
        })

      } catch (error) {
        console.error('Cloudflare AI API error:', error)
        // Fall through to fallback
      }
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
      message: 'Using fallback config - configure CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID for AI generation'
    })

  } catch (error) {
    console.error('Error in generate-config route:', error)
    
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}