// FitStake AI Agent - Client-side wrapper for 0G-powered fitness AI
// This maintains backward compatibility while using proper client-server architecture

export { 
  FitStakeAgent,
  fitStakeAgent,
  type ExerciseConfigType as ExerciseConfig,
  type CheatDetectionResultType as CheatDetectionResult,
  type WorkoutSessionType as WorkoutSession,
  type PoseLandmarkType as PoseLandmark
} from './fitstake-agent-client'

// For immediate migration, re-export the singleton
import { fitStakeAgent as agent } from './fitstake-agent-client'
export default agent