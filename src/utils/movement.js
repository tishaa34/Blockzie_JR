// src/utils/movement.js
// 🚀 Movement and motion-related utilities extracted from runScript.js
// Includes delay(), smoothMove(), moveRobotUniversal(), and checkSimulatorObstacle().
// No logic changes — 1:1 copy from original file.

import { moveSimulatorRobot } from '../store/sceneSlice.js';

//
// Helper delay function that respects speed multipliers.
//
export const delay = (ms, speedMultiplier = 1) => {
  const adjustedTime = Math.max(50, ms / speedMultiplier);
  return new Promise(res => setTimeout(res, adjustedTime));
};

//
// Smoothly move an actor/robot across multiple small steps.
//
export async function smoothMove(actor, dispatch, targetX, targetY, steps = 5, speedMultiplier = 1) {
  console.log(`🚀 SMOOTH MOVE from (${actor.x}, ${actor.y}) to (${targetX}, ${targetY}) in ${steps} steps`);

  const startX = actor.x;
  const startY = actor.y;
  const dx = (targetX - startX) / steps;
  const dy = (targetY - startY) / steps;

  for (let i = 1; i <= steps; i++) {
    const newX = startX + dx * i;
    const newY = startY + dy * i;

    // Round to prevent floating-point drift
    const roundedX = Math.round(newX * 10) / 10;
    const roundedY = Math.round(newY * 10) / 10;

    moveRobotUniversal(actor, dispatch, roundedX, roundedY, actor.direction);
    await delay(60, speedMultiplier);
  }

  // Ensure final position exact
  moveRobotUniversal(actor, dispatch, targetX, targetY, actor.direction);
  console.log(`🚀 Smooth move completed to (${targetX}, ${targetY})`);
}

//
// Universal movement dispatcher for robots.
//
export function moveRobotUniversal(actor, dispatch, targetX, targetY, direction) {
  console.log(`🚀 Dispatching robot move from (${actor.x}, ${actor.y}) to (${targetX}, ${targetY})`);
  dispatch(
    moveSimulatorRobot({
      id: actor.id,
      x: targetX,
      y: targetY,
      direction: direction || actor.direction || 0,
    })
  );
}

//
// Obstacle/boundary detection for simulator robots.
//
export const checkSimulatorObstacle = (robot, targetX, targetY) => {
  // Boundary check
  if (targetX < 0 || targetX >= 20 || targetY < 0 || targetY >= 15) {
    console.log(`🚧 ❌ BOUNDARY! Position (${targetX}, ${targetY}) out of bounds`);
    return true;
  }

  const obstacles = document.querySelectorAll('.simulator-obstacle');
  const stageElement = document.querySelector('.simulator-modal-container');

  if (stageElement && obstacles.length > 0) {
    const stageRect = stageElement.getBoundingClientRect();
    const targetPixelX = (targetX / 20) * stageRect.width;
    const targetPixelY = (targetY / 15) * stageRect.height;

    for (let i = 0; i < obstacles.length; i++) {
      const obstacle = obstacles[i];
      const obstaclePixelX = parseInt(obstacle.style.left) || 0;
      const obstaclePixelY = parseInt(obstacle.style.top) || 0;

      const xDistance = Math.abs(targetPixelX - obstaclePixelX);
      const yDistance = Math.abs(targetPixelY - obstaclePixelY);

      if (xDistance < 40 && yDistance < 40) {
        console.log(`🚧 ❌ OBSTACLE COLLISION! Would hit obstacle ${i}`);
        return true;
      }
    }
  }

  console.log(`🚧 ✅ Path clear to (${targetX}, ${targetY})`);
  return false;
};
