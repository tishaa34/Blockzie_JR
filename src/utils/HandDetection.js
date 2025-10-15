import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let handLandmarker = null;

export async function initHandDetection() {
  if (handLandmarker) return handLandmarker;
  const fileset = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
  );
  handLandmarker = await HandLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-assets/hand_landmarker.task',
    },
    runningMode: 'VIDEO',
    numHands: 1,
  });
  return handLandmarker;
}

export function getFingerDirection(landmarks, threshold = 0.14) {
  if (!landmarks || landmarks.length < 9) return null;
  const tip = landmarks[8];
  const base = landmarks[5];
  const dx = tip.x - base.x;
  const dy = tip.y - base.y;
  let direction = null;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold)
    direction = dx > 0 ? 'right' : 'left';
  else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > threshold)
    direction = dy > 0 ? 'down' : 'up';
  return direction;
}
