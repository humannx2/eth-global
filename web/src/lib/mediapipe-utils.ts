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
  inverted?: boolean; // Invert the composite signal if needed
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

// Predefined exercise configurations
export const PREDEFINED_EXERCISE_CONFIGS: Record<string, ExerciseConfig> = {
  pushup: {
    name: 'pushup',
    initialDirection: 'up',
    inverted: true, // Inverted because as elbows flex more (going down), angle decreases
    minPeakDistance: 10,
    anglePoints: [
      {
        name: 'left_elbow',
        points: [LANDMARK_INDICES.LEFT_SHOULDER, LANDMARK_INDICES.LEFT_ELBOW, LANDMARK_INDICES.LEFT_WRIST],
        weight: 1.0,
        targetLowAngle: 60,
        targetHighAngle: 160
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
    initialDirection: 'up',
    inverted: true, // Inverted because as knees flex more (going down), angle decreases
    minPeakDistance: 12,
    anglePoints: [
      {
        name: 'left_knee',
        points: [LANDMARK_INDICES.LEFT_HIP, LANDMARK_INDICES.LEFT_KNEE, LANDMARK_INDICES.LEFT_ANKLE],
        weight: 1.0,
        targetLowAngle: 90,
        targetHighAngle: 170
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
    initialDirection: 'down',
    inverted: true, // Inverted because as elbow flexes more, angle decreases
    minPeakDistance: 8,
    anglePoints: [
      {
        name: 'left_elbow',
        points: [LANDMARK_INDICES.LEFT_SHOULDER, LANDMARK_INDICES.LEFT_ELBOW, LANDMARK_INDICES.LEFT_WRIST],
        weight: 1.0,
        targetLowAngle: 45,
        targetHighAngle: 150
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
 * Calculate the angle between three points
 */
export function calculateAngle(point1: Landmark, vertex: Landmark, point3: Landmark): number {
  const radians = Math.atan2(point3.y - vertex.y, point3.x - vertex.x) - 
                  Math.atan2(point1.y - vertex.y, point1.x - vertex.x);
  let angle = Math.abs(radians * (180 / Math.PI));
  
  if (angle > 180) {
    angle = 360 - angle;
  }
  
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
 */
function detectPeaksAndValleysAdvanced(
  values: number[], 
  minDistance: number = 5, 
  prominenceThreshold: number = 0.15
): { peaks: number[], valleys: number[] } {
  const peaks: number[] = [];
  const valleys: number[] = [];
  
  if (values.length < 10) return { peaks, valleys };
  
  // First, smooth the data slightly to reduce noise
  const smoothedValues = smoothData(values, 3);
  
  // Calculate dynamic prominence threshold based on data range
  const minVal = Math.min(...smoothedValues);
  const maxVal = Math.max(...smoothedValues);
  const dataRange = maxVal - minVal;
  const dynamicProminence = Math.max(dataRange * prominenceThreshold, 2); // Minimum 2 degrees
  
  for (let i = minDistance; i < smoothedValues.length - minDistance; i++) {
    const current = smoothedValues[i];
    let isPeak = true;
    let isValley = true;
    let maxLeft = current;
    let minLeft = current;
    let maxRight = current;
    let minRight = current;
    
    // Check left side
    for (let j = i - minDistance; j < i; j++) {
      maxLeft = Math.max(maxLeft, smoothedValues[j]);
      minLeft = Math.min(minLeft, smoothedValues[j]);
      if (smoothedValues[j] >= current) isPeak = false;
      if (smoothedValues[j] <= current) isValley = false;
    }
    
    // Check right side
    for (let j = i + 1; j <= i + minDistance && j < smoothedValues.length; j++) {
      maxRight = Math.max(maxRight, smoothedValues[j]);
      minRight = Math.min(minRight, smoothedValues[j]);
      if (smoothedValues[j] >= current) isPeak = false;
      if (smoothedValues[j] <= current) isValley = false;
    }
    
    // Calculate prominence
    const peakProminence = Math.min(current - minLeft, current - minRight);
    const valleyProminence = Math.min(maxLeft - current, maxRight - current);
    
    // Add peak/valley if it meets prominence threshold
    if (isPeak && peakProminence >= dynamicProminence) {
      // Check minimum distance from last peak
      if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDistance) {
        peaks.push(i);
      }
    }
    
    if (isValley && valleyProminence >= dynamicProminence) {
      // Check minimum distance from last valley
      if (valleys.length === 0 || i - valleys[valleys.length - 1] >= minDistance) {
        valleys.push(i);
      }
    }
  }
  
  return { peaks, valleys };
}

/**
 * Processes a history of poses to count repetitions using comprehensive multi-joint tracking.
 */
export function segmentReps(
  poseHistory: Pose[], 
  exerciseConfig: ExerciseConfig, 
  lastProcessedRepCount: number = 0,
  feedbackOptions: FeedbackOptions = {}
): { 
  repCount: number; 
  newRepSegments: RepSegment[];
} {
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
    
    // Apply inversion if specified
    const finalValue = exerciseConfig.inverted ? -compositeValue : compositeValue;
    values.push(finalValue);
    
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
  
  if (values.length < 20) return { repCount: 0, newRepSegments: [] };
  
  // Detect peaks and valleys with advanced algorithm
  const { peaks, valleys } = detectPeaksAndValleysAdvanced(values, exerciseConfig.minPeakDistance);
  
  // Only count reps if we have a minimum number of alternating events
  const allEvents = [...peaks.map(i => ({ index: i, type: 'peak' })), ...valleys.map(i => ({ index: i, type: 'valley' }))];
  allEvents.sort((a, b) => a.index - b.index);
  
  // More conservative rep counting - need proper alternating pattern
  let repCount = 0;
  const validSequence: Array<{ type: string; index: number }> = [];
  const newRepSegments: RepSegment[] = [];
  
  for (const event of allEvents) {
    const lastEvent = validSequence[validSequence.length - 1];
    
    // Only add to sequence if it's different from the last event
    if (!lastEvent || lastEvent.type !== event.type) {
      validSequence.push(event);
    }
  }
  
  // Count complete cycles and create rep segments
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
      
      // Only process and log if this is a new rep (beyond what was already processed)
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
            const repSegment: RepSegment = {
              repNumber: repCount,
              exerciseType: exerciseConfig.name,
              startIndex: startIndex,
              endIndex: endIndex,
              angles: repAngles,
              duration: (endIndex - startIndex) * 33.33 // Approximate 30fps
            };
            
            newRepSegments.push(repSegment);
          }
        }
      }
    }
  }
  
  return { repCount, newRepSegments };
}

/**
 * Get exercise configuration by name, falling back to predefined configs
 */
export function getExerciseConfig(exerciseName: string): ExerciseConfig | null {
  // Normalize exercise name for lookup
  const normalizedName = exerciseName.toLowerCase().replace(/\s+/g, '_');
  
  // Check predefined configs first
  if (PREDEFINED_EXERCISE_CONFIGS[normalizedName]) {
    return PREDEFINED_EXERCISE_CONFIGS[normalizedName];
  }
  
  // For demo purposes, return pushup config as fallback
  // In a real implementation, this would call an AI service to generate config
  return PREDEFINED_EXERCISE_CONFIGS.pushup;
}

/**
 * Process exercise reps using the provided configuration
 */
export async function processExerciseReps(
  poseHistory: Pose[],
  exerciseName: string,
  lastProcessedRepCount: number = 0,
  feedbackOptions: FeedbackOptions = {}
): Promise<{ repCount: number; newRepSegments: RepSegment[]; configUsed: ExerciseConfig | null }> {
  const exerciseConfig = getExerciseConfig(exerciseName);
  
  if (!exerciseConfig) {
    console.error(`Could not get configuration for exercise: ${exerciseName}`);
    return { repCount: 0, newRepSegments: [], configUsed: null };
  }
  
  // Process reps using the configuration
  const result = segmentReps(poseHistory, exerciseConfig, lastProcessedRepCount, feedbackOptions);
  
  return {
    ...result,
    configUsed: exerciseConfig
  };
}