import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Input schema for workout feedback (matching fit-wise)
const WorkoutFeedbackInputSchema = z.object({
  exerciseName: z.string(),
  repNumber: z.number(),
  duration: z.number(),
  angleRange: z.object({
    min: z.number(),
    max: z.number()
  }),
  averageAngle: z.number(),
  rangeOfMotion: z.number(),
  // Target angle ranges for guidance (from exercise config)
  targetAngles: z.object({
    min: z.number(),
    max: z.number()
  }).optional(),
  // Optional feature flags
  enableRAG: z.boolean().optional().default(false),
  enableVoice: z.boolean().optional().default(false)
});

// Output schema for workout feedback response (matching fit-wise)
const WorkoutFeedbackOutputSchema = z.object({
  feedback: z.string().max(100),
  score: z.number().min(0).max(100),
  classification: z.enum(['good', 'okay', 'bad'])
});

type WorkoutFeedbackInput = z.infer<typeof WorkoutFeedbackInputSchema>;
type WorkoutFeedbackOutput = z.infer<typeof WorkoutFeedbackOutputSchema>;

/**
 * Calculate dynamic workout score based on fit-wise algorithm
 */
function calculateWorkoutScore(input: WorkoutFeedbackInput): WorkoutFeedbackOutput {
  let score = 0;
  let feedbackParts: string[] = [];
  let classification: 'good' | 'okay' | 'bad' = 'bad';

  // 1. Range of Motion Score (40% weight) - based on fit-wise criteria
  let romScore = 0;
  let romFeedback = '';
  
  if (input.targetAngles) {
    // With target angles - reward achieving/exceeding target range
    const targetRange = input.targetAngles.max - input.targetAngles.min;
    const achievedPercentage = (input.rangeOfMotion / targetRange) * 100;
    
    if (achievedPercentage >= 95) {
      romScore = 40; // Perfect ROM
      romFeedback = 'Perfect range!';
    } else if (achievedPercentage >= 80) {
      romScore = 35; // Great ROM
      romFeedback = 'Great ROM!';
    } else if (achievedPercentage >= 60) {
      romScore = 25; // Good ROM but can improve
      romFeedback = 'Go deeper!';
    } else {
      romScore = 10; // Limited ROM
      romFeedback = 'Increase range!';
    }
  } else {
    // Without target angles - use exercise-specific defaults (fit-wise approach)
    const exerciseName = input.exerciseName.toLowerCase();
    let expectedMinRange = 70; // Default minimum range
    
    if (exerciseName.includes('curl')) {
      expectedMinRange = 80; // Bicep curls should have good flex
    } else if (exerciseName.includes('squat')) {
      expectedMinRange = 70; // Squats need decent depth
    } else if (exerciseName.includes('pushup') || exerciseName.includes('push-up')) {
      expectedMinRange = 90; // Push-ups need full range
    }
    
    if (input.rangeOfMotion >= expectedMinRange + 20) {
      romScore = 40; // Excellent natural range
      romFeedback = 'Excellent ROM!';
    } else if (input.rangeOfMotion >= expectedMinRange) {
      romScore = 32; // Good range
      romFeedback = 'Good range!';
    } else if (input.rangeOfMotion >= expectedMinRange - 20) {
      romScore = 20; // Limited but acceptable
      romFeedback = 'Go deeper!';
    } else {
      romScore = 8; // Very limited
      romFeedback = 'Much deeper!';
    }
  }

  // 2. Duration/Tempo Score (35% weight) - fit-wise tempo analysis
  let tempoScore = 0;
  let tempoFeedback = '';
  
  const durationSeconds = input.duration / 1000;
  const exerciseName = input.exerciseName.toLowerCase();
  
  // Exercise-specific tempo expectations (fit-wise standards)
  let idealMinTime = 1.5; // Default minimum time
  let idealMaxTime = 3.5; // Default maximum time
  
  if (exerciseName.includes('curl')) {
    idealMinTime = 1.8;
    idealMaxTime = 3.2;
  } else if (exerciseName.includes('squat')) {
    idealMinTime = 2.0;
    idealMaxTime = 4.0;
  } else if (exerciseName.includes('pushup') || exerciseName.includes('push-up')) {
    idealMinTime = 1.2;
    idealMaxTime = 2.8;
  }
  
  if (durationSeconds >= idealMinTime && durationSeconds <= idealMaxTime) {
    tempoScore = 35; // Perfect tempo
    tempoFeedback = 'Perfect tempo!';
  } else if (durationSeconds >= idealMinTime * 0.8 && durationSeconds <= idealMaxTime * 1.2) {
    tempoScore = 28; // Good tempo
    tempoFeedback = 'Good tempo!';
  } else if (durationSeconds < idealMinTime) {
    tempoScore = 15; // Too fast
    tempoFeedback = 'Slow down!';
  } else {
    tempoScore = 18; // Too slow
    tempoFeedback = 'Speed up!';
  }

  // 3. Consistency/Form Score (25% weight) - based on angle consistency
  let consistencyScore = 0;
  let consistencyFeedback = '';
  
  // Calculate form quality based on angle range relative to average
  const avgAngle = input.averageAngle;
  const minAngle = input.angleRange.min;
  const maxAngle = input.angleRange.max;
  
  // Check if the angles show good control (not too erratic)
  const rangeSymmetry = Math.abs((avgAngle - minAngle) - (maxAngle - avgAngle));
  const relativSymmetry = rangeSymmetry / input.rangeOfMotion;
  
  if (relativSymmetry <= 0.2) {
    consistencyScore = 25; // Very controlled
    consistencyFeedback = 'Controlled!';
  } else if (relativSymmetry <= 0.4) {
    consistencyScore = 20; // Good control
    consistencyFeedback = 'Good control!';
  } else if (relativSymmetry <= 0.6) {
    consistencyScore = 12; // Somewhat erratic
    consistencyFeedback = 'More control!';
  } else {
    consistencyScore = 5; // Erratic movement
    consistencyFeedback = 'Stay steady!';
  }

  // Calculate total score
  score = Math.round(romScore + tempoScore + consistencyScore);
  
  // Determine classification (fit-wise thresholds)
  if (score >= 80) {
    classification = 'good';
  } else if (score >= 60) {
    classification = 'okay';
  } else {
    classification = 'bad';
  }

  // Build feedback message (prioritize most important issue)
  feedbackParts = [romFeedback, tempoFeedback, consistencyFeedback].filter(f => f);
  
  // Pick the most relevant feedback (fit-wise style - concise and actionable)
  let finalFeedback = '';
  if (romScore < 25) {
    finalFeedback = romFeedback; // ROM is most important
  } else if (tempoScore < 20) {
    finalFeedback = tempoFeedback; // Then tempo
  } else if (consistencyScore < 15) {
    finalFeedback = consistencyFeedback; // Then consistency
  } else {
    // Everything is good, give encouraging feedback
    if (score >= 90) {
      finalFeedback = 'Excellent form!';
    } else if (score >= 80) {
      finalFeedback = 'Great work!';
    } else {
      finalFeedback = feedbackParts[0] || 'Keep it up!';
    }
  }

  return {
    feedback: finalFeedback,
    score,
    classification
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate input data
    const input = WorkoutFeedbackInputSchema.parse(body);
    
    // Calculate dynamic score using fit-wise algorithm
    const result = calculateWorkoutScore(input);
    
    console.log(`Rep ${input.repNumber} Analysis:`, {
      exercise: input.exerciseName,
      rom: input.rangeOfMotion,
      duration: input.duration,
      score: result.score,
      classification: result.classification
    });

    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Feedback API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}