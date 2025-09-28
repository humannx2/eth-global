export type Landmark = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
};

export type Pose = Landmark[];

export type AngleConfig = {
  name: string; // e.g., "left_elbow", "right_elbow"
  points: [number, number, number]; // Three joint indices for angle calculation [point1, vertex, point3]
  weight?: number; // Weight for this angle in the composite signal (default 1.0)
  targetLowAngle?: number; // Target minimum angle in degrees for optimal range of motion
  targetHighAngle?: number; // Target maximum angle in degrees for optimal range of motion
};

export type ExerciseConfig = {
  name: string;
  anglePoints: AngleConfig[]; // Multiple angle configurations (left/right when possible)
  minPeakDistance: number; // Minimum distance between peaks to count as a rep
  initialDirection: 'up' | 'down';
};

export type AngleData = {
  timestamp: number;
  angle: number;
  jointPositions: {
    point1: Landmark;
    point2: Landmark;
    point3: Landmark;
  };
};

export type RepSegment = {
  repNumber: number;
  exerciseType: string;
  startIndex: number;
  endIndex: number;
  angles: AngleData[];
  duration: number;
  formScore: number;
};

export type FeedbackOptions = {
  enableRAG?: boolean;
  enableVoice?: boolean;
};

// MediaPipe pose landmark indices for reference
export const LANDMARK_INDICES = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_MOUTH: 9,
  RIGHT_MOUTH: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32
};

// Predefined exercise configurations - optimized for demo
/**
 * Calculate dynamic workout score based on fit-wise algorithm (frontend implementation)
 */
function calculateWorkoutScore(input: {
  exerciseName: string;
  repNumber: number;
  duration: number;
  angleRange: { min: number; max: number };
  averageAngle: number;
  rangeOfMotion: number;
  targetAngles?: { min: number; max: number };
}): { feedback: string; score: number; classification: 'good' | 'okay' | 'bad' } {
  let score = 0;
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
  
  // Debug logging to see score breakdown
  console.log(`🔍 Score Breakdown for Rep:`, {
    romScore: `${romScore}/40`,
    tempoScore: `${tempoScore}/35`, 
    consistencyScore: `${consistencyScore}/25`,
    totalScore: `${score}/100`,
    duration: input.duration,
    rangeOfMotion: input.rangeOfMotion,
    exerciseName: input.exerciseName
  });
  
  // Determine classification (fit-wise thresholds)
  if (score >= 80) {
    classification = 'good';
  } else if (score >= 60) {
    classification = 'okay';
  } else {
    classification = 'bad';
  }

  // Build feedback message (prioritize most important issue)
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
      finalFeedback = romFeedback || 'Keep it up!';
    }
  }

  return {
    feedback: finalFeedback,
    score,
    classification
  };
}

/**
 * Process dynamic feedback for a completed rep using fit-wise algorithm (frontend-only)
 * Only called when a rep is actually completed - not every frame
 */
function processDynamicFeedback(repSegment: RepSegment, exerciseConfig: ExerciseConfig): void {
  console.log(`🏋️ Processing feedback for completed Rep #${repSegment.repNumber}`);
  
  if (repSegment.angles.length === 0) {
    console.log(`Rep #${repSegment.repNumber} - No angle data available for feedback`);
    return;
  }

  const angles = repSegment.angles.map(a => a.angle);
  const minAngle = Math.min(...angles);
  const maxAngle = Math.max(...angles);
  const avgAngle = angles.reduce((sum, angle) => sum + angle, 0) / angles.length;
  const rangeOfMotion = maxAngle - minAngle;

  // Calculate target angles from exercise config if available
  let targetAngles: { min: number; max: number } | undefined;
  if (exerciseConfig.anglePoints && exerciseConfig.anglePoints.length > 0) {
    const angleConfigs = exerciseConfig.anglePoints.filter(config => 
      config.targetLowAngle !== undefined && config.targetHighAngle !== undefined
    );
    
    if (angleConfigs.length > 0) {
      // Use average of all configured target ranges
      const avgTargetLow = angleConfigs.reduce((sum, config) => sum + (config.targetLowAngle || 0), 0) / angleConfigs.length;
      const avgTargetHigh = angleConfigs.reduce((sum, config) => sum + (config.targetHighAngle || 0), 0) / angleConfigs.length;
      targetAngles = {
        min: Math.round(avgTargetLow * 10) / 10,
        max: Math.round(avgTargetHigh * 10) / 10
      };
    }
  }

  const repAnalysis = {
    exerciseName: repSegment.exerciseType.replace('_', ' '),
    repNumber: repSegment.repNumber,
    duration: Math.round(repSegment.duration),
    angleRange: {
      min: Math.round(minAngle * 10) / 10,
      max: Math.round(maxAngle * 10) / 10
    },
    averageAngle: Math.round(avgAngle * 10) / 10,
    rangeOfMotion: Math.round(rangeOfMotion * 10) / 10,
    ...(targetAngles && { targetAngles })
  };

  // Calculate feedback using frontend algorithm (no API call needed!)
  const feedback = calculateWorkoutScore(repAnalysis);
  
  // Only log detailed analysis when rep is completed - not every frame
  console.log(`✅ Rep #${repSegment.repNumber} Analysis:`, {
    exercise: repAnalysis.exerciseName,
    duration: `${repAnalysis.duration}ms`,
    angles: `${repAnalysis.angleRange.min}° - ${repAnalysis.angleRange.max}°`,
    rangeOfMotion: `${repAnalysis.rangeOfMotion}°`,
    targetAngles: repAnalysis.targetAngles,
    score: `${feedback.score}%`,
    classification: feedback.classification,
    feedback: feedback.feedback
  });
  
  if (targetAngles) {
    console.log(`🎯 Target vs Achieved: ${targetAngles.min}°-${targetAngles.max}° vs ${repAnalysis.angleRange.min}°-${repAnalysis.angleRange.max}°`);
  }
  
  // Dispatch custom event for feedback capture (matching fit-wise pattern)
  if (typeof window !== 'undefined') {
    const feedbackEvent = new CustomEvent('ai-feedback', {
      detail: {
        repNumber: repAnalysis.repNumber,
        feedback: feedback.feedback,
        score: feedback.score,
        classification: feedback.classification,
        timestamp: new Date()
      }
    });
    window.dispatchEvent(feedbackEvent);
  }
}

export const PREDEFINED_EXERCISE_CONFIGS: Record<string, ExerciseConfig> = {
  pushup: {
    name: 'pushup',
    initialDirection: 'up', // Start with arms extended (larger angles)
    minPeakDistance: 10, // More conservative - fit-wise uses 8-12
    anglePoints: [
      {
        name: 'left_elbow',
        points: [LANDMARK_INDICES.LEFT_SHOULDER, LANDMARK_INDICES.LEFT_ELBOW, LANDMARK_INDICES.LEFT_WRIST],
        weight: 1.0,
        targetLowAngle: 60,   // More realistic push-up range
        targetHighAngle: 160  // Arms extended
      },
      {
        name: 'right_elbow',
        points: [LANDMARK_INDICES.RIGHT_SHOULDER, LANDMARK_INDICES.RIGHT_ELBOW, LANDMARK_INDICES.RIGHT_WRIST],
        weight: 1.0,
        targetLowAngle: 60,
        targetHighAngle: 160
      }
    ]
  },
  squat: {
    name: 'squat',
    initialDirection: 'up', // Start standing (larger knee angles)
    minPeakDistance: 10,
    anglePoints: [
      {
        name: 'left_knee',
        points: [LANDMARK_INDICES.LEFT_HIP, LANDMARK_INDICES.LEFT_KNEE, LANDMARK_INDICES.LEFT_ANKLE],
        weight: 1.0,
        targetLowAngle: 90,   // Deep squat (smaller angle)
        targetHighAngle: 170  // Standing (larger angle)
      },
      {
        name: 'right_knee',
        points: [LANDMARK_INDICES.RIGHT_HIP, LANDMARK_INDICES.RIGHT_KNEE, LANDMARK_INDICES.RIGHT_ANKLE],
        weight: 1.0,
        targetLowAngle: 90,
        targetHighAngle: 170
      }
    ]
  },
  bicep_curl: {
    name: 'bicep_curl',
    initialDirection: 'down', // Start with arms extended down (larger angles)
    minPeakDistance: 8,
    anglePoints: [
      {
        name: 'left_elbow',
        points: [LANDMARK_INDICES.LEFT_SHOULDER, LANDMARK_INDICES.LEFT_ELBOW, LANDMARK_INDICES.LEFT_WRIST],
        weight: 1.0,
        targetLowAngle: 45,   // Curled up (smaller angle)
        targetHighAngle: 150  // Extended down (larger angle)
      },
      {
        name: 'right_elbow',
        points: [LANDMARK_INDICES.RIGHT_SHOULDER, LANDMARK_INDICES.RIGHT_ELBOW, LANDMARK_INDICES.RIGHT_WRIST],
        weight: 1.0,
        targetLowAngle: 45,
        targetHighAngle: 150
      }
    ]
  }
};

/**
 * Calculate the angle between three points - always returns positive angle (0-180 degrees)
 */
export function calculateAngle(point1: Landmark, vertex: Landmark, point3: Landmark): number {
  // Calculate vectors from vertex to the other two points
  const v1 = { x: point1.x - vertex.x, y: point1.y - vertex.y };
  const v2 = { x: point3.x - vertex.x, y: point3.y - vertex.y };
  
  // Calculate dot product and magnitudes
  const dotProduct = v1.x * v2.x + v1.y * v2.y;
  const magnitude1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const magnitude2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  
  // Avoid division by zero
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }
  
  // Calculate angle using dot product formula
  const cosAngle = dotProduct / (magnitude1 * magnitude2);
  
  // Clamp cosAngle to [-1, 1] to avoid NaN from Math.acos
  const clampedCosAngle = Math.max(-1, Math.min(1, cosAngle));
  
  // Convert from radians to degrees - always positive (0-180)
  const angle = Math.acos(clampedCosAngle) * (180 / Math.PI);
  
  return angle;
}

/**
 * Simple moving average smoothing
 */
function smoothData(values: number[], windowSize: number = 3): number[] {
  const smoothed: number[] = [];
  
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(values.length, i + Math.ceil(windowSize / 2));
    
    const sum = values.slice(start, end).reduce((acc, val) => acc + val, 0);
    smoothed.push(sum / (end - start));
  }
  
  return smoothed;
}

/**
 * Create a composite movement signal from multiple angles
 */
function createCompositeAngleSignal(pose: Pose, angleConfigs: AngleConfig[]): number {
  let compositeValue = 0;
  let totalWeight = 0;
  
  for (const angleConfig of angleConfigs) {
    const [p1, p2, p3] = angleConfig.points;
    const weight = angleConfig.weight || 1.0;
    
    if (pose[p1] && pose[p2] && pose[p3]) {
      const angle = calculateAngle(pose[p1], pose[p2], pose[p3]);
      compositeValue += angle * weight;
      totalWeight += weight;
    }
  }
  
  return totalWeight > 0 ? compositeValue / totalWeight : 0;
}

/**
 * Advanced peak/valley detection with adaptive thresholds and trend analysis
 * Based on the fit-wise algorithm - more conservative and reliable
 */
function detectPeaksAndValleysAdvanced(
  values: number[], 
  minDistance: number = 5, 
  prominenceThreshold: number = 0.15 // Back to fit-wise's 15% - much more conservative
): { peaks: number[], valleys: number[] } {
  const peaks: number[] = [];
  const valleys: number[] = [];
  
  if (values.length < 5) return { peaks, valleys };
  
  // Apply stronger smoothing for noise reduction (fit-wise uses 7)
  const smoothed = smoothData(values, 7);
  
  // Calculate adaptive thresholds
  const min = Math.min(...smoothed);
  const max = Math.max(...smoothed);
  const range = max - min;
  const dynamicProminence = range * prominenceThreshold;
  
  console.log(`Peak detection: range=${range.toFixed(2)}, prominence=${dynamicProminence.toFixed(2)}, minDistance=${minDistance}`);
  
  // Use fit-wise's trend window calculation
  const trendWindow = Math.max(3, Math.floor(minDistance / 2));
  
  for (let i = trendWindow; i < smoothed.length - trendWindow; i++) {
    const current = smoothed[i];
    
    // Check if current point is a local maximum/minimum using fit-wise logic
    let isPeak = true;
    let isValley = true;
    
    // Compare with points in the trend window
    for (let j = -trendWindow; j <= trendWindow; j++) {
      if (j === 0) continue;
      const compareValue = smoothed[i + j];
      
      if (current <= compareValue) isPeak = false;
      if (current >= compareValue) isValley = false;
    }
    
    // Peak detection with prominence check (fit-wise logic)
    if (isPeak && current - min > dynamicProminence) {
      if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDistance) {
        peaks.push(i);
        console.log(`Peak found at ${i}: value=${current.toFixed(2)}, prominence=${(current - min).toFixed(2)}`);
      }
    }
    
    // Valley detection with prominence check (fit-wise logic)
    if (isValley && max - current > dynamicProminence) {
      if (valleys.length === 0 || i - valleys[valleys.length - 1] >= minDistance) {
        valleys.push(i);
        console.log(`Valley found at ${i}: value=${current.toFixed(2)}, prominence=${(max - current).toFixed(2)}`);
      }
    }
  }
  
  return { peaks, valleys };
}

/**
 * Calculate form score for a rep based on angle data quality and target ranges
 */
function calculateRepFormScore(repAngles: AngleData[], _exerciseConfig: ExerciseConfig): number {
  if (repAngles.length === 0) return 0;
  
  // Since AngleData doesn't have jointName, we'll use a simplified approach
  // Group all angles together and score based on overall movement quality
  const allAngles = repAngles.map(data => data.angle);
  
  if (allAngles.length === 0) return 50;
  
  const minAngle = Math.min(...allAngles);
  const maxAngle = Math.max(...allAngles);
  const rangeOfMotion = maxAngle - minAngle;
  const avgAngle = allAngles.reduce((sum, a) => sum + a, 0) / allAngles.length;
  
  let formScore = 50; // Base score
  
  // Score based on range of motion achieved
  if (rangeOfMotion >= 60) {
    formScore += 30; // Good range of motion
  } else if (rangeOfMotion >= 30) {
    formScore += 15; // Moderate range of motion
  }
  
  // Check if angles are within reasonable bounds for exercise
  if (minAngle >= 20 && maxAngle <= 160) {
    formScore += 20; // Good angle bounds
  } else if (minAngle >= 0 && maxAngle <= 180) {
    formScore += 10; // Acceptable angle bounds
  }
  
  // Penalize very erratic movement (high variability)
  const variance = allAngles.reduce((sum, a) => sum + Math.pow(a - avgAngle, 2), 0) / allAngles.length;
  if (variance > 400) {
    formScore -= 15; // High variability penalty
  } else if (variance > 200) {
    formScore -= 5; // Moderate variability penalty
  }
  
  // Bonus for smooth movement (low variability)
  if (variance < 100) {
    formScore += 10;
  }
  
  return Math.max(0, Math.min(100, Math.round(formScore)));
}

/**
 * Processes a history of poses to count repetitions using comprehensive multi-joint tracking.
 * Improved implementation based on fit-wise patterns
 */
export function segmentReps(
  poseHistory: Pose[], 
  exerciseConfig: ExerciseConfig, 
  lastProcessedRepCount: number = 0,
  _feedbackOptions: FeedbackOptions = {}
): { 
  repCount: number; 
  newRepSegments: RepSegment[];
} {
  // Require reasonable poses for better accuracy (fit-wise uses 20)
  if (!poseHistory || poseHistory.length < 20) {
    return { repCount: 0, newRepSegments: [] };
  }

  // Create composite angle signal from all specified angle configurations
  const values: number[] = [];
  const angleDataHistory: AngleData[] = [];
  
  for (let i = 0; i < poseHistory.length; i++) {
    const pose = poseHistory[i];
    if (!pose || pose.length === 0) continue;
    
    // Create composite signal from all angle configurations
    const compositeValue = createCompositeAngleSignal(pose, exerciseConfig.anglePoints);
    
    // Add some debugging for the first few values only (reduce spam)
    if (values.length < 3) {
      console.log(`Initial composite value at frame ${i}: ${compositeValue.toFixed(2)}°`);
    }
    
    // Store the composite value directly (no inversion complexity)
    values.push(compositeValue);
    
    // Store detailed angle data for each configuration
    for (const angleConfig of exerciseConfig.anglePoints) {
      const [p1, p2, p3] = angleConfig.points;
      if (pose[p1] && pose[p2] && pose[p3]) {
        const angle = calculateAngle(pose[p1], pose[p2], pose[p3]);
        
        angleDataHistory.push({
          timestamp: i,
          angle: angle,
          jointPositions: {
            point1: pose[p1],
            point2: pose[p2],
            point3: pose[p3]
          }
        });
      }
    }
  }
  
  if (values.length < 30) return { repCount: 0, newRepSegments: [] };
  
  // Detect peaks and valleys with advanced algorithm
  const { peaks, valleys } = detectPeaksAndValleysAdvanced(values, exerciseConfig.minPeakDistance);
  
  // Only log peak/valley detection results when there are actual results
  if (peaks.length > 0 || valleys.length > 0) {
    console.log(`🎯 Peak/Valley Detection: ${peaks.length} peaks, ${valleys.length} valleys`);
    console.log(`📊 Signal range: ${Math.min(...values).toFixed(1)}° - ${Math.max(...values).toFixed(1)}°`);
  }
  
  // Combine and sort all events
  const allEvents = [...peaks.map(i => ({ index: i, type: 'peak' })), ...valleys.map(i => ({ index: i, type: 'valley' }))];
  allEvents.sort((a, b) => a.index - b.index);
  
  // Build alternating sequence (matching fit-wise logic)
  let repCount = 0;
  const validSequence: Array<{ type: string; index: number }> = [];
  const newRepSegments: RepSegment[] = [];
  
  // Filter to create proper alternating pattern
  for (const event of allEvents) {
    const lastEvent = validSequence[validSequence.length - 1];
    
    // Only add to sequence if it alternates with the last event type
    if (!lastEvent || lastEvent.type !== event.type) {
      validSequence.push(event);
    }
  }
  
  console.log('Valid alternating sequence length:', validSequence.length);
  
  // Count complete rep cycles based on exercise initial direction
  for (let i = 1; i < validSequence.length; i++) {
    const prevEvent = validSequence[i - 1];
    const currEvent = validSequence[i];
    let repCompleted = false;
    
    if (exerciseConfig.initialDirection === 'down') {
      // For exercises starting down: valley -> peak = 1 rep
      if (prevEvent.type === 'valley' && currEvent.type === 'peak') {
        repCompleted = true;
      }
    } else {
      // For exercises starting up: peak -> valley = 1 rep  
      if (prevEvent.type === 'peak' && currEvent.type === 'valley') {
        repCompleted = true;
      }
    }
    
    if (repCompleted) {
      repCount++;
      
      // Only log when a rep is actually completed
      console.log(`🏋️ Rep ${repCount} completed: ${prevEvent.type} → ${currEvent.type}`);
      
      // Only create rep segments for new reps (beyond what was already processed)
      if (repCount > lastProcessedRepCount) {
        // Create rep segment if we have angle data
        if (angleDataHistory.length > 0) {
          const startIndex = prevEvent.index;
          const endIndex = currEvent.index;
          
          // Filter angle data for this rep
          const repAngles = angleDataHistory.filter(
            angleData => angleData.timestamp >= startIndex && angleData.timestamp <= endIndex
          );
          
          if (repAngles.length > 0) {
            // Calculate form score based on angle consistency and target ranges
            const formScore = calculateRepFormScore(repAngles, exerciseConfig);
            
            const repSegment: RepSegment = {
              repNumber: repCount,
              exerciseType: exerciseConfig.name,
              startIndex: startIndex,
              endIndex: endIndex,
              angles: repAngles,
              duration: (endIndex - startIndex) * 33.33, // Approximate 30fps
              formScore: formScore
            };
            
            newRepSegments.push(repSegment);
            console.log(`Created rep segment ${repCount} with form score:`, formScore);
            
            // Process dynamic feedback using fit-wise algorithm (frontend-only)
            try {
              processDynamicFeedback(repSegment, exerciseConfig);
            } catch (error: unknown) {
              console.error('Error processing dynamic feedback:', error);
            }
          }
        }
      }
    }
  }
  
  // Only log summary when there are actual results
  if (repCount > 0 || newRepSegments.length > 0) {
    console.log(`🎯 Rep Summary: ${repCount} total reps, ${newRepSegments.length} new segments analyzed`);
  }
  return { repCount, newRepSegments };
}

/**
 * Get exercise configuration by name - NO FALLBACK
 * In the new system, configs must come from AI generation
 */
export function getExerciseConfig(exerciseName: string): ExerciseConfig | null {
  // Normalize exercise name for lookup
  const normalizedName = exerciseName.toLowerCase().replace(/\s+/g, '_');
  
  // Check predefined configs for backwards compatibility only
  if (PREDEFINED_EXERCISE_CONFIGS[normalizedName]) {
    console.warn(`Using predefined config for ${exerciseName}. Consider generating AI config instead.`);
    return PREDEFINED_EXERCISE_CONFIGS[normalizedName];
  }
  
  // No fallback - configs should come from AI generation
  console.error(`No configuration found for exercise: ${exerciseName}. Use AI Agent Chat to generate one.`);
  return null;
}

/**
 * Process exercise reps using the provided configuration
 * NO FALLBACKS - configuration must be explicitly provided
 */
export async function processExerciseReps(
  poseHistory: Pose[],
  exerciseName: string,
  lastProcessedRepCount: number = 0,
  feedbackOptions: FeedbackOptions = {},
  customConfig?: ExerciseConfig // Allow custom config from AI or contract
): Promise<{ repCount: number; newRepSegments: RepSegment[]; configUsed: ExerciseConfig | null }> {
  // Use custom config if provided (from contract/AI), otherwise try predefined
  const exerciseConfig = customConfig || getExerciseConfig(exerciseName);
  
  if (!exerciseConfig) {
    console.error(`Could not get configuration for exercise: ${exerciseName}. Please generate one using AI.`);
    return { repCount: 0, newRepSegments: [], configUsed: null };
  }
  
  console.log('Processing reps with config:', exerciseConfig);
  
  // Process reps using the configuration
  const result = segmentReps(poseHistory, exerciseConfig, lastProcessedRepCount, feedbackOptions);
  
  return {
    ...result,
    configUsed: exerciseConfig
  };
}