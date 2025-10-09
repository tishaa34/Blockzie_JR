// src/utils/blockUtils.js
// 🧩 Block detection helpers extracted from runScript.js
// No logic changes — only modularized for clarity and maintainability.

export function isStopBlock(block) {
  return (
    block?.name === 'Stop' ||
    block?.type === 'Stop' ||
    block?.name?.toLowerCase().includes('stop')
  );
}

export function isWaitBlock(block) {
  return (
    block?.name === 'Wait' ||
    block?.type === 'Wait' ||
    block?.name?.toLowerCase().includes('wait')
  );
}

export function isSpeedBlock(block) {
  return (
    block?.name === 'Speed' ||
    block?.type === 'Speed' ||
    block?.name?.toLowerCase().includes('speed')
  );
}

export function isObstacleDetectedBlock(block) {
  return (
    block?.name === 'Obstacle Detected' ||
    block?.type === 'obstaclesound' ||
    block?.name?.toLowerCase().includes('obstacle')
  );
}

export function isPathFollowingBlock(block) {
  return (
    block?.name === 'Follow Path' ||
    block?.type === 'followPath' ||
    block?.name?.toLowerCase().includes('follow path')
  );
}

export function isPathDetectedBlock(block) {
  return (
    block?.name === 'Path Detected' ||
    block?.type === 'pathDetected' ||
    block?.name?.toLowerCase().includes('path detected')
  );
}

export function isSetPathColorBlock(block) {
  return (
    block?.name === 'Set Path Color' ||
    block?.type === 'setPathColor' ||
    block?.name?.toLowerCase().includes('set path color')
  );
}
