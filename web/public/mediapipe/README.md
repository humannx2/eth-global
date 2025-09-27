# MediaPipe Models

To enable real pose detection, you need to download the MediaPipe model files:

1. Download `pose_landmarker_heavy.task` from:
   https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task

2. Place the file in this directory (`/public/mediapipe/`)

## Alternative: CDN Models

The component will automatically fall back to simulation mode if model files are not available locally.
For production, you can:

1. Host the models on your CDN
2. Update the modelAssetPath in MediaPipeWorkout.tsx
3. Or use simulation mode for demo purposes

## Current Status

Currently running in **simulation mode** - the component generates fake pose data to demonstrate 
the rep counting and form analysis functionality without requiring actual camera input or 
MediaPipe models.