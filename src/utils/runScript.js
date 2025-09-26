import {
  moveActor, rotateActor, scaleActor, resetActorSize, disappearActor, reappearActor, setVideoOpacity, syncActorsWithFaces,
  addObstacle, removeObstacle, moveObstacle, addColoredArea, removeColoredArea, moveColoredArea,
  setBackground, cycleNextBackground, overwrite,
  addSimulatorRobot, removeSimulatorRobot, moveSimulatorRobot, cycleSimulatorRobot,
  // NEW IMPORTS: Script movement actions
  moveSimulatorRobotFromScript, rotateSimulatorRobotFromScript, scaleSimulatorRobotFromScript, 
  disappearSimulatorRobot, reappearSimulatorRobot,
} from '../store/sceneSlice';

// Helper for delays with speed multiplier
const delay = (ms, speedMultiplier = 1) => {
  const adjustedTime = Math.max(50, ms / speedMultiplier);
  return new Promise(res => setTimeout(res, adjustedTime));
};

// NEW: Draw line trail functionality
export function initializeDrawLineCanvas() {
  console.log('✏️ Draw line canvas initialized');
}

export function clearDrawnPaths() {
  localStorage.removeItem('simulatorDrawnPaths');
  window.dispatchEvent(new CustomEvent('clearDrawnPaths'));
  console.log('✏️ All drawn paths cleared');
}

export function getDrawLineSettings() {
  try {
    const stored = localStorage.getItem('simulatorDrawLineSettings');
    return stored ? JSON.parse(stored) : {
      enabled: false,
      thickness: 3,
      size: 10,
      color: '#FF0000'
    };
  } catch (error) {
    console.error('Error getting draw line settings:', error);
    return {
      enabled: false,
      thickness: 3,
      size: 10,
      color: '#FF0000'
    };
  }
}

export function setDrawLineSettings(settings) {
  try {
    localStorage.setItem('simulatorDrawLineSettings', JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('drawLineSettingsChanged', {
      detail: settings
    }));
    console.log('✏️ Draw line settings updated:', settings);
    return true;
  } catch (error) {
    console.error('Error setting draw line settings:', error);
    return false;
  }
}

// ADD: Simulator obstacle detection function
const checkSimulatorObstacle = (robot, targetX, targetY) => {
  console.log(`🚧 Checking simulator obstacles for robot at (${targetX}, ${targetY})`);
  
  const obstacles = document.querySelectorAll('.simulator-obstacle');
  console.log(`🚧 Found ${obstacles.length} simulator obstacles to check`);
  
  const stageElement = document.querySelector('.simulator-modal-container');
  if (!stageElement) {
    console.log('🚧 No simulator stage found - allowing movement');
    return false;
  }
  
  const stageRect = stageElement.getBoundingClientRect();
  const targetPixelX = (targetX / 20) * stageRect.width;
  const targetPixelY = (targetY / 15) * stageRect.height;
  
  console.log(`🚧 Target: Grid(${targetX}, ${targetY}) = Pixel(${targetPixelX}, ${targetPixelY})`);
  
  for (let i = 0; i < obstacles.length; i++) {
    const obstacle = obstacles[i];
    const obstaclePixelX = parseInt(obstacle.style.left) || 0;
    const obstaclePixelY = parseInt(obstacle.style.top) || 0;
    
    const xDistance = Math.abs(targetPixelX - obstaclePixelX);
    const yDistance = Math.abs(targetPixelY - obstaclePixelY);
    
    console.log(`🚧 Obstacle ${i}: Pixel(${obstaclePixelX}, ${obstaclePixelY}) - Distance: X=${xDistance}, Y=${yDistance}`);
    
    if (xDistance < 40 && yDistance < 40) {
      console.log(`🚧 ❌ SIMULATOR COLLISION! Robot would hit obstacle ${i}`);
      return true;
    }
  }
  
  if (targetX < 0 || targetX >= 20 || targetY < 0 || targetY >= 15) {
    console.log(`🚧 ❌ SIMULATOR BOUNDARY! Position (${targetX}, ${targetY}) out of bounds`);
    return true;
  }
  
  console.log(`🚧 ✅ Simulator path clear to (${targetX}, ${targetY})`);
  return false;
};

async function playCustomSound(block) {
  try {
    const audio = new Audio(block.soundData?.audioURL || block.audioURL);
    audio.volume = 0.7;
    await audio.play();
  } catch (err) {
    console.error("Error playing sound:", err);
  }
}

function playFrequencySound(frequency = 440, duration = 300) {
  return new Promise((resolve) => {
    try {
      console.log(`🔊 PLAYING FREQUENCY SOUND: ${frequency}Hz for ${duration}ms`);
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('🔊 Audio context resumed');
        });
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      const mappedFreq = 300 + ((frequency - 1) * 12);
      oscillator.frequency.setValueAtTime(mappedFreq, audioContext.currentTime);
      
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + (duration / 1000));
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + (duration / 1000));
      
      oscillator.onended = () => {
        console.log('🔊 Frequency sound finished playing');
        resolve();
      };
      
    } catch (err) {
      console.error('🔊 Error playing frequency sound:', err);
      resolve();
    }
  });
}

function getCurrentSceneData(dispatch) {
  try {
    if (dispatch && dispatch.getState) {
      const state = dispatch.getState();
      const currentScene = state.scene?.scenes?.[state.scene?.currentSceneIndex];
      
      if (currentScene) {
        return {
          ...currentScene,
          simulatorRobots: state.scene?.simulatorRobots || []
        };
      }
    }
    
    const possibleStores = [
      window.__REDUX_STORE__,
      window.reduxStore,
      window.store,
      window.__store
    ];
    
    for (const store of possibleStores) {
      if (store && store.getState) {
        const state = store.getState();
        const currentScene = state.scene?.scenes?.[state.scene?.currentSceneIndex];
        
        if (currentScene) {
          console.log(`📦 Found scene data via global store: actors: ${currentScene.actors?.length || 0}, obstacles: ${currentScene.obstacles?.length || 0}, coloredAreas: ${currentScene.coloredAreas?.length || 0}, simulatorRobots: ${state.scene?.simulatorRobots?.length || 0}`);
          return {
            ...currentScene,
            simulatorRobots: state.scene?.simulatorRobots || []
          };
        }
      }
    }
    
    console.warn("⚠️ No Redux store found - obstacle detection will be skipped");
    return null;
  } catch (err) {
    console.error("❌ Error accessing scene data:", err);
    return null;
  }
}

function checkForObstacle(actor, direction, dispatch, currentSceneData) {
  try {
    console.log("🚧 OBSTACLE CHECK START");
    console.log(`🚧 Actor ${actor.name} (${actor.id}) at (${actor.x}, ${actor.y}) wants to move ${direction}`);
    
    if (!currentSceneData || !currentSceneData.actors) {
      console.log("🚧 No scene data available - skipping obstacle check");
      return false;
    }
    
    console.log(`📦 Scene data: actors: ${currentSceneData.actors?.length || 0}, obstacles: ${currentSceneData.obstacles?.length || 0}, coloredAreas: ${currentSceneData.coloredAreas?.length || 0}, simulatorRobots: ${currentSceneData.simulatorRobots?.length || 0}, background: ${currentSceneData.background}`);
    
    const currentX = Math.round(actor.x);
    const currentY = Math.round(actor.y);
    
    let targetX = currentX;
    let targetY = currentY;
    
    switch (direction) {
      case 'right':
        targetX = currentX + 1;
        break;
      case 'left':
        targetX = currentX - 1;
        break;
      case 'up':
        targetY = currentY - 1;
        break;
      case 'down':
        targetY = currentY + 1;
        break;
    }
    
    console.log(`🚧 Current grid position: (${currentX}, ${currentY})`);
    console.log(`🚧 Target grid position: (${targetX}, ${targetY})`);
    
    if (targetX < 0 || targetX >= 20 || targetY < 0 || targetY >= 15) {
      console.log(`🚧 ❌ WALL/BOUNDARY! Cannot move to (${targetX},${targetY})`);
      return true;
    }
    
    if (currentSceneData.obstacles && currentSceneData.obstacles.length > 0) {
      console.log(`🚧 Checking ${currentSceneData.obstacles.length} obstacles`);
      
      for (const obstacle of currentSceneData.obstacles) {
        if (obstacle.type !== 'coloredArea' && obstacle.blocking !== false) {
          const obstacleX = Math.round(obstacle.x);
          const obstacleY = Math.round(obstacle.y);
          
          console.log(`🚧 - Obstacle ${obstacle.shape} at grid (${obstacleX}, ${obstacleY})`);
          
          if (targetX === obstacleX && targetY === obstacleY) {
            console.log(`🚧 ❌ OBSTACLE BLOCKS MOVEMENT! ${obstacle.shape} is at target position (${targetX},${targetY})`);
            return true;
          }
        }
      }
      
      console.log(`🚧 ✅ Target position (${targetX}, ${targetY}) is clear of obstacles`);
    } else {
      console.log("🚧 No obstacles in scene");
    }
    
    if (currentSceneData.coloredAreas && currentSceneData.coloredAreas.length > 0) {
      console.log(`🚧 Found ${currentSceneData.coloredAreas.length} colored areas - allowing movement through them`);
    }
    
    if (currentSceneData.actors && currentSceneData.actors.length > 0) {
      const otherActors = currentSceneData.actors.filter(a => 
        a.id !== actor.id && a.visible !== false
      );
      
      console.log(`🚧 Checking ${otherActors.length} other actors`);
      
      for (const otherActor of otherActors) {
        const otherX = Math.round(otherActor.x);
        const otherY = Math.round(otherActor.y);
        
        console.log(`🚧 - ${otherActor.name} Actor at grid (${otherX},${otherY})`);
        
        if (targetX === otherX && targetY === otherY) {
          console.log(`🚧 ❌ ACTOR BLOCKS MOVEMENT! ${otherActor.name} Actor is at target position (${targetX},${targetY})`);
          return true;
        }
      }
      
      console.log(`🚧 ✅ Target position (${targetX}, ${targetY}) is clear of other actors`);
    } else {
      console.log("🚧 No other actors to check");
    }
    
    console.log("🚧 ✅ Movement allowed - target position is clear");
    console.log("🚧 OBSTACLE CHECK END");
    return false;
  } catch (err) {
    console.error("❌ Error in obstacle detection:", err);
    return false;
  }
}

function isStopBlock(block) {
  return (
    block?.name === 'Stop' ||
    block?.type === 'Stop' ||
    block?.category === 'control' && block?.name === 'Stop' ||
    block?.type === 'Stop' ||
    block?.name?.toLowerCase().includes('stop') ||
    block?.type?.toLowerCase().includes('stop')
  );
}

function isWaitBlock(block) {
  return (
    block?.name === 'Wait' ||
    block?.type === 'Wait' ||
    block?.category === 'control' && block?.name === 'Wait' ||
    block?.type === 'Wait' ||
    block?.name?.toLowerCase().includes('wait') ||
    block?.type?.toLowerCase().includes('wait')
  );
}

function isSpeedBlock(block) {
  return (
    block?.name === 'Speed' ||
    block?.type === 'Speed' ||
    block?.category === 'control' && block?.name === 'Speed' ||
    block?.type === 'Speed' ||
    block?.name?.toLowerCase().includes('speed') ||
    block?.type?.toLowerCase().includes('speed')
  );
}

function isObstacleDetectedBlock(block) {
  return (
    block?.name === 'Obstacle Detected' ||
    block?.type === 'obstaclesound' ||
    block?.name?.toLowerCase().includes('obstacle')
  );
}

const isHappyDetected = () => {
  return window.humanDetectionData?.dominantExpression === 'happy';
};

const isPointing = (direction) => {
  const { leftHand, rightHand, poses } = window.humanDetectionData || {};
  
  if (!leftHand || !rightHand || !poses?.[0]?.keypoints) {
    return false;
  }
  
  const scoreThreshold = 0.2;
  const noseY = poses[0].keypoints[0].position.y;
  const hipY = poses[0].keypoints[11].position.y;
  const leftShoulderX = poses[0].keypoints[5].position.x;
  const rightShoulderX = poses[0].keypoints[6].position.x;
  
  switch (direction) {
    case 'up':
      return (leftHand.score > scoreThreshold && leftHand.position.y < noseY) ||
             (rightHand.score > scoreThreshold && rightHand.position.y < noseY);
    case 'down':
      return (leftHand.score > scoreThreshold && leftHand.position.y > hipY) ||
             (rightHand.score > scoreThreshold && rightHand.position.y > hipY);
    case 'left':
      return (rightHand.score > scoreThreshold && rightHand.position.x < rightShoulderX);
    case 'right':
      return (leftHand.score > scoreThreshold && leftHand.position.x > leftShoulderX);
    default:
      return false;
  }
};

async function playPopSound(sounds) {
  const popSources = [
    sounds?.pop,
    './assets/sounds/pop.mp3',
    'assets/sounds/pop.mp3',
    '/assets/sounds/pop.mp3',
    'sounds/pop.mp3'
  ];
  
  for (const src of popSources) {
    if (src) {
      try {
        console.log(`🔊 Trying to play pop sound from: ${src}`);
        const audio = new Audio(src);
        audio.volume = 0.8;
        
        audio.addEventListener('canplaythrough', () => {
          console.log(`🔊 Pop sound loaded successfully`);
        });
        
        audio.addEventListener('error', (e) => {
          console.warn(`🔊 Pop sound failed to load:`, e);
        });
        
        await audio.play();
        console.log(`🔊 Pop sound played successfully`);
        return;
      } catch (err) {
        console.warn(`⚠️ Failed to play pop sound from ${src}:`, err);
        continue;
      }
    }
  }
  
  console.warn('⚠️ Creating synthetic beep sound');
  await playFrequencySound(800, 200);
}

// FIXED: Universal robot movement dispatch function with detailed debugging
function moveRobotUniversal(actor, dispatch, targetX, targetY, direction) {
  console.log(`🔍 [UNIVERSAL DEBUG] === MOVEMENT DETAILS ===`);
  console.log(`🔍 Actor Name: ${actor.name}`);
  console.log(`🔍 Actor ID: ${actor.id}`);
  console.log(`🔍 Current Position: (${actor.x}, ${actor.y})`);
  console.log(`🔍 Target Position: (${targetX}, ${targetY})`);
  console.log(`🔍 Direction: ${direction}`);
  console.log(`🔍 Position Change: X(${actor.x} → ${targetX}) Y(${actor.y} → ${targetY})`);
  
  // Check if position is actually changing
  if (actor.x === targetX && actor.y === targetY) {
    console.log(`🚨 [UNIVERSAL ERROR] NO MOVEMENT! Target position is same as current position!`);
    console.log(`🚨 This means the robot will not move visually!`);
  } else {
    console.log(`✅ [UNIVERSAL SUCCESS] Position WILL change from (${actor.x}, ${actor.y}) to (${targetX}, ${targetY})`);
  }
  
  console.log(`🤖 [UNIVERSAL] Moving ${actor.name} from (${actor.x}, ${actor.y}) to (${targetX}, ${targetY})`);
  
  // Dispatch BOTH actions to handle any reducer naming
  try {
    dispatch(moveSimulatorRobot({ id: actor.id, x: targetX, y: targetY, direction }));
    console.log(`📦 [REDUX] moveSimulatorRobot dispatched successfully`);
  } catch (e) {
    console.error(`❌ [REDUX ERROR] moveSimulatorRobot failed:`, e);
  }
  
  try {
    dispatch(moveSimulatorRobotFromScript({ robotId: actor.id, x: targetX, y: targetY, direction }));
    console.log(`📦 [REDUX] moveSimulatorRobotFromScript dispatched successfully`);
  } catch (e) {
    console.log(`⚠️ [REDUX] moveSimulatorRobotFromScript action doesn't exist (this is normal)`);
  }
  
  // Update local actor reference
  const oldX = actor.x;
  const oldY = actor.y;
  actor.x = targetX;
  actor.y = targetY;
  if (typeof direction === 'number') {
    actor.direction = direction;
  }
  
  console.log(`📝 [LOCAL UPDATE] Actor reference updated from (${oldX}, ${oldY}) to (${actor.x}, ${actor.y})`);
  
  // Force UI update
  window.dispatchEvent(new CustomEvent('robotMoved', {
    detail: { robotId: actor.id, x: actor.x, y: actor.y, direction: actor.direction, timestamp: Date.now() }
  }));
  
  window.dispatchEvent(new Event('simulatorStateChanged'));
  
  console.log(`🎉 [UNIVERSAL] Robot movement completed - events dispatched`);
  console.log(`🔍 [UNIVERSAL DEBUG] === END MOVEMENT ===`);
}

// MAIN exported async run function with DETAILED DEBUG LOGGING
export async function run(actor, dispatch, sounds, selectedActorId) {
  console.log("🔍 DEBUGGING - Actor received:", actor);
  console.log("🔍 DEBUGGING - Scripts array:", actor.scripts);
  console.log("🔍 DEBUGGING - Scripts length:", actor.scripts?.length);

  if (!actor) {
    console.warn("⚠️ run() called with no actor!");
    return;
  }

  if (!Array.isArray(actor.scripts) || actor.scripts.length === 0) {
    console.log(`ℹ️ Actor has no scripts to run:`, actor);
    return;
  }

  const loops = [];
  const targetActorId = selectedActorId || actor.id;
  let currentSpeedMultiplier = 1;
  let obstacleCollisionDetected = false;

  console.log(`🚀 Starting script execution with ${actor.scripts.length} blocks`);
  console.log(`🔊 Available sounds:`, sounds);
  console.log(`🤖 Actor type: ${actor.type || 'stage-actor'}`);
  console.log(`📍 Actor position: x: ${actor.x}, y: ${actor.y}, direction: ${actor.direction}`);

  // First pass: check for Stop blocks
  let stopIndex = -1;
  for (let i = 0; i < actor.scripts.length; i++) {
    const block = actor.scripts[i];
    if (isStopBlock(block)) {
      stopIndex = i;
      console.log(`🛑 STOP BLOCK FOUND at index ${i}`);
      break;
    }
  }

  try {
    for (let i = 0; i < actor.scripts.length; i++) {
      const b = actor.scripts[i];
      
      if (obstacleCollisionDetected) {
        console.log('🚧 SCRIPT EXECUTION STOPPED DUE TO OBSTACLE COLLISION');
        break;
      }
      
      if (stopIndex !== -1 && i >= stopIndex) {
        console.log(`🛑 EXECUTION STOPPED at block ${i}`);
        return;
      }

      const c = Math.max(1, Math.min(99, b?.count || 1));

      if (isSpeedBlock(b)) {
        currentSpeedMultiplier = b?.speedMultiplier || 1.5;
        console.log(`⚡ SPEED CHANGED to ${currentSpeedMultiplier}x`);
        continue;
      }

      if (isWaitBlock(b)) {
        const waitTime = (b?.count || 3) * 1000;
        console.log(`⏳ WAITING for ${waitTime}ms`);
        await delay(waitTime, currentSpeedMultiplier);
        continue;
      }

      if (isObstacleDetectedBlock(b)) {
        const lowFreq = Math.max(1, Math.min(99, b?.lowFrequency || 1));
        const highFreq = Math.max(1, Math.min(99, b?.highFrequency || 99));
        const alertFrequency = Math.max(lowFreq, highFreq);
        console.log(`🚨 OBSTACLE DETECTED BLOCK - Playing ${alertFrequency}Hz sound`);
        await playFrequencySound(alertFrequency, 500);
        console.log(`🔊 Obstacle alert sound played at ${alertFrequency}Hz`);
        continue;
      }

      const blockIdentifier = b?.name || b?.type;
      console.log(`▶️ Executing ${blockIdentifier} (count: ${c})`);

      switch (blockIdentifier) {
        case 'Move Right':
          console.log('▶️ Executing Move Right (count: 1)');
          console.log('🔍 DEBUG - Current actor.x:', actor.x);
          console.log('🔍 DEBUG - Current actor.y:', actor.y);
          
          for (let k = 0; k < c; k++) {
            if (actor.type === 'simulatorRobot') {
              const targetX = Math.min(actor.x + 1, 19);
              console.log('🔍 DEBUG - Calculated targetX:', targetX);
              console.log('🔍 DEBUG - Should move from', actor.x, 'to', targetX);
              
              if (targetX === actor.x) {
                console.log('🚨 ERROR: Target X is same as current X! Robot is at right boundary (x=19)');
                console.log('🚨 Cannot move right - robot is already at maximum X position');
                break;
              }
              
              if (checkSimulatorObstacle(actor, targetX, actor.y)) {
                console.log('🚧 SIMULATOR OBSTACLE DETECTED! Stopping robot movement.');
                await playFrequencySound(600, 800);
                obstacleCollisionDetected = true;
                break;
              }
              
              console.log(`🤖 Moving simulator robot RIGHT from (${actor.x}, ${actor.y}) to (${targetX}, ${actor.y})`);
              
              moveRobotUniversal(actor, dispatch, targetX, actor.y);
              
            } else {
              const currentScene = getCurrentSceneData(dispatch);
              if (currentScene) {
                if (checkForObstacle(actor, 'right', dispatch, currentScene)) {
                  console.log('🚧 OBSTACLE DETECTED! Playing alert sound and stopping execution.');
                  await playFrequencySound(600, 800);
                  obstacleCollisionDetected = true;
                  break;
                }
              }
              dispatch(moveActor({ actorId: actor.id, dx: 1, dy: 0, fromScript: true }));
            }
            
            await delay(200, currentSpeedMultiplier);
          }
          
          console.log('✅ Move Right completed');
          break;

        case 'Move Left':
          console.log('▶️ Executing Move Left (count: 1)');
          console.log('🔍 DEBUG - Current actor.x:', actor.x);
          console.log('🔍 DEBUG - Current actor.y:', actor.y);
          
          for (let k = 0; k < c; k++) {
            if (actor.type === 'simulatorRobot') {
              const targetX = Math.max(actor.x - 1, 0);
              console.log('🔍 DEBUG - Calculated targetX:', targetX);
              console.log('🔍 DEBUG - Should move from', actor.x, 'to', targetX);
              
              if (targetX === actor.x) {
                console.log('🚨 ERROR: Target X is same as current X! Robot is at left boundary (x=0)');
                console.log('🚨 Cannot move left - robot is already at minimum X position');
                break;
              }
              
              if (checkSimulatorObstacle(actor, targetX, actor.y)) {
                console.log('🚧 SIMULATOR OBSTACLE DETECTED! Stopping robot movement.');
                await playFrequencySound(600, 800);
                obstacleCollisionDetected = true;
                break;
              }
              
              console.log(`🤖 Moving simulator robot LEFT from (${actor.x}, ${actor.y}) to (${targetX}, ${actor.y})`);
              
              moveRobotUniversal(actor, dispatch, targetX, actor.y, 270);
              
            } else {
              const currentScene = getCurrentSceneData(dispatch);
              if (currentScene) {
                if (checkForObstacle(actor, 'left', dispatch, currentScene)) {
                  console.log('🚧 OBSTACLE DETECTED! Playing alert sound and stopping execution.');
                  await playFrequencySound(600, 800);
                  obstacleCollisionDetected = true;
                  break;
                }
              }
              dispatch(moveActor({ actorId: actor.id, dx: -1, dy: 0, fromScript: true }));
            }
            
            await delay(200, currentSpeedMultiplier);
          }
          
          console.log('✅ Move Left completed');
          break;

        case 'Move Up':
          console.log('▶️ Executing Move Up (count: 1)');
          console.log('🔍 DEBUG - Current actor.x:', actor.x);
          console.log('🔍 DEBUG - Current actor.y:', actor.y);
          
          for (let k = 0; k < c; k++) {
            if (actor.type === 'simulatorRobot') {
              const targetY = Math.max(actor.y - 1, 0);
              console.log('🔍 DEBUG - Calculated targetY:', targetY);
              console.log('🔍 DEBUG - Should move from', actor.y, 'to', targetY);
              
              if (targetY === actor.y) {
                console.log('🚨 ERROR: Target Y is same as current Y! Robot is at top boundary (y=0)');
                console.log('🚨 Cannot move up - robot is already at minimum Y position');
                break;
              }
              
              if (checkSimulatorObstacle(actor, actor.x, targetY)) {
                console.log('🚧 SIMULATOR OBSTACLE DETECTED! Stopping robot movement.');
                await playFrequencySound(600, 800);
                obstacleCollisionDetected = true;
                break;
              }
              
              console.log(`🤖 Moving simulator robot UP from (${actor.x}, ${actor.y}) to (${actor.x}, ${targetY})`);
              
              moveRobotUniversal(actor, dispatch, actor.x, targetY, 0);
              
            } else {
              const currentScene = getCurrentSceneData(dispatch);
              if (currentScene) {
                if (checkForObstacle(actor, 'up', dispatch, currentScene)) {
                  console.log('🚧 OBSTACLE DETECTED! Playing alert sound and stopping execution.');
                  await playFrequencySound(600, 800);
                  obstacleCollisionDetected = true;
                  break;
                }
              }
              dispatch(moveActor({ actorId: actor.id, dx: 0, dy: -1, fromScript: true }));
            }
            
            await delay(200, currentSpeedMultiplier);
          }
          
          console.log('✅ Move Up completed');
          break;

        case 'Move Down':
          console.log('▶️ Executing Move Down (count: 1)');
          console.log('🔍 DEBUG - Current actor.x:', actor.x);
          console.log('🔍 DEBUG - Current actor.y:', actor.y);
          
          for (let k = 0; k < c; k++) {
            if (actor.type === 'simulatorRobot') {
              const targetY = Math.min(actor.y + 1, 14);
              console.log('🔍 DEBUG - Calculated targetY:', targetY);
              console.log('🔍 DEBUG - Should move from', actor.y, 'to', targetY);
              
              if (targetY === actor.y) {
                console.log('🚨 ERROR: Target Y is same as current Y! Robot is at bottom boundary (y=14)');
                console.log('🚨 Cannot move down - robot is already at maximum Y position');
                break;
              }
              
              if (checkSimulatorObstacle(actor, actor.x, targetY)) {
                console.log('🚧 SIMULATOR OBSTACLE DETECTED! Stopping robot movement.');
                await playFrequencySound(600, 800);
                obstacleCollisionDetected = true;
                break;
              }
              
              console.log(`🤖 Moving simulator robot DOWN from (${actor.x}, ${actor.y}) to (${actor.x}, ${targetY})`);
              
              moveRobotUniversal(actor, dispatch, actor.x, targetY, 180);
              
            } else {
              const currentScene = getCurrentSceneData(dispatch);
              if (currentScene) {
                if (checkForObstacle(actor, 'down', dispatch, currentScene)) {
                  console.log('🚧 OBSTACLE DETECTED! Playing alert sound and stopping execution.');
                  await playFrequencySound(600, 800);
                  obstacleCollisionDetected = true;
                  break;
                }
              }
              dispatch(moveActor({ actorId: actor.id, dx: 0, dy: 1, fromScript: true }));
            }
            
            await delay(200, currentSpeedMultiplier);
          }
          
          console.log('✅ Move Down completed');
          break;
          
        case 'Rotate Left':
          console.log('▶️ Executing Rotate Left (count: 1)');
          console.log('🔍 DEBUG - Current direction:', actor.direction);
          
          for (let k = 0; k < c; k++) {
            if (actor.type === 'simulatorRobot') {
              const newDirection = (actor.direction - 90 + 360) % 360;
              console.log('🔍 DEBUG - New direction:', newDirection);
              console.log(`🤖 Rotating simulator robot LEFT from ${actor.direction}° to ${newDirection}°`);
              
              // FIXED: Only change direction, keep same position
              moveRobotUniversal(actor, dispatch, actor.x, actor.y, newDirection);
              
            } else {
              dispatch(rotateActor({ actorId: actor.id, degrees: -90, fromScript: true }));
            }
            await delay(140, currentSpeedMultiplier);
          }
          
          console.log('✅ Rotate Left completed');
          break;

        case 'Rotate Right':
          console.log('▶️ Executing Rotate Right (count: 1)');
          console.log('🔍 DEBUG - Current direction:', actor.direction);
          
          for (let k = 0; k < c; k++) {
            if (actor.type === 'simulatorRobot') {
              const newDirection = (actor.direction + 90) % 360;
              console.log('🔍 DEBUG - New direction:', newDirection);
              console.log(`🤖 Rotating simulator robot RIGHT from ${actor.direction}° to ${newDirection}°`);
              
              // FIXED: Only change direction, keep same position
              moveRobotUniversal(actor, dispatch, actor.x, actor.y, newDirection);
              
            } else {
              dispatch(rotateActor({ actorId: actor.id, degrees: 90, fromScript: true }));
            }
            await delay(140, currentSpeedMultiplier);
          }
          
          console.log('✅ Rotate Right completed');
          break;

        case 'Pop':
          console.log('🎵 Executing Pop sound block');
          await playPopSound(sounds);
          await delay(120, currentSpeedMultiplier);
          break;

        case 'Happy Detected':
          console.log('😊 Executing Happy Detection block');
          if (isHappyDetected()) {
            console.log('😊 Happy face detected! Continuing execution...');
          } else {
            console.log('😐 No happy face detected. Waiting...');
            let attempts = 0;
            while (!isHappyDetected() && attempts < 10) {
              await delay(1000, currentSpeedMultiplier);
              attempts++;
            }
            if (!isHappyDetected()) {
              console.log('😞 Happy detection timeout. Continuing anyway...');
            }
          }
          break;

        case 'Pointing Up':
          console.log('👆 Executing Pointing Up detection block');
          if (isPointing('up')) {
            console.log('👆 Pointing up detected! Continuing execution...');
          } else {
            console.log('🤷 No pointing up detected. Waiting...');
            let attempts = 0;
            while (!isPointing('up') && attempts < 10) {
              await delay(1000, currentSpeedMultiplier);
              attempts++;
            }
            if (!isPointing('up')) {
              console.log('⏰ Pointing up timeout. Continuing anyway...');
            }
          }
          break;

        case 'Pointing Down':
          console.log('👇 Executing Pointing Down detection block');
          if (isPointing('down')) {
            console.log('👇 Pointing down detected! Continuing execution...');
          } else {
            console.log('🤷 No pointing down detected. Waiting...');
            let attempts = 0;
            while (!isPointing('down') && attempts < 10) {
              await delay(1000, currentSpeedMultiplier);
              attempts++;
            }
            if (!isPointing('down')) {
              console.log('⏰ Pointing down timeout. Continuing anyway...');
            }
          }
          break;

        case 'Pointing Left':
          console.log('👈 Executing Pointing Left detection block');
          if (isPointing('left')) {
            console.log('👈 Pointing left detected! Continuing execution...');
          } else {
            console.log('🤷 No pointing left detected. Waiting...');
            let attempts = 0;
            while (!isPointing('left') && attempts < 10) {
              await delay(1000, currentSpeedMultiplier);
              attempts++;
            }
            if (!isPointing('left')) {
              console.log('⏰ Pointing left timeout. Continuing anyway...');
            }
          }
          break;

        case 'Pointing Right':
          console.log('👉 Executing Pointing Right detection block');
          if (isPointing('right')) {
            console.log('👉 Pointing right detected! Continuing execution...');
          } else {
            console.log('🤷 No pointing right detected. Waiting...');
            let attempts = 0;
            while (!isPointing('right') && attempts < 10) {
              await delay(1000, currentSpeedMultiplier);
              attempts++;
            }
            if (!isPointing('right')) {
              console.log('⏰ Pointing right timeout. Continuing anyway...');
            }
          }
          break;

        case 'Sound':
          console.log(`🎵 Executing Sound block (${b?.frequency || 440}Hz for ${b?.duration || 300}ms)`);
          for (let k = 0; k < c; k++) {
            const frequency = Math.max(1, Math.min(99, b?.frequency || 1));
            const duration = Math.max(100, Math.min(2000, b?.duration || 300));
            await playFrequencySound(frequency, duration);
            if (k < c - 1) await delay(100, currentSpeedMultiplier);
          }
          await delay(120, currentSpeedMultiplier);
          break;

        default:
          if (b?.type === 'customsound' && b.soundData?.audioURL) {
            console.log(`🎵 Playing custom sound: ${b.name}`);
            for (let k = 0; k < c; k++) {
              await playCustomSound(b);
              if (k < c - 1) await delay(200, currentSpeedMultiplier);
            }
            await delay(120, currentSpeedMultiplier);
          } else if (b?.audioURL) {
            console.log(`🎵 Playing custom sound via audioURL: ${b.name}`);
            for (let k = 0; k < c; k++) {
              await playCustomSound(b);
              if (k < c - 1) await delay(200, currentSpeedMultiplier);
            }
            await delay(120, currentSpeedMultiplier);
          }
          break;
      }

      await delay(80, currentSpeedMultiplier);
    }

    if (obstacleCollisionDetected) {
      console.log('🚧 Script execution terminated due to obstacle collision');
    } else {
      console.log('✅ Script execution completed normally');
    }
  } catch (error) {
    console.error('❌ Script execution error:', error);
    throw error;
  }
}

// [All export functions remain the same...]
export function addObstacleToScene(obstacleData, dispatch) {
  try {
    console.log('Adding obstacle from simulator:', obstacleData);
    dispatch(addObstacle(obstacleData));
    console.log('✅ Obstacle added successfully');
    return true;
  } catch (error) {
    console.error('❌ Error adding obstacle:', error);
    return false;
  }
}

export function removeObstacleFromScene(obstacleId, dispatch) {
  try {
    console.log('Removing obstacle from simulator:', obstacleId);
    dispatch(removeObstacle(obstacleId));
    console.log('✅ Obstacle removed successfully');
    return true;
  } catch (error) {
    console.error('❌ Error removing obstacle:', error);
    return false;
  }
}

export function moveObstacleInScene(obstacleId, newX, newY, dispatch) {
  try {
    console.log('Moving obstacle in simulator:', obstacleId, newX, newY);
    dispatch(moveObstacle({ id: obstacleId, x: newX, y: newY }));
    console.log('✅ Obstacle moved successfully');
    return true;
  } catch (error) {
    console.error('❌ Error moving obstacle:', error);
    return false;
  }
}

export function addColoredAreaToScene(coloredAreaData, dispatch) {
  try {
    console.log('Adding colored area from simulator:', coloredAreaData);
    dispatch(addColoredArea(coloredAreaData));
    console.log('✅ Colored area added successfully');
    return true;
  } catch (error) {
    console.error('❌ Error adding colored area:', error);
    return false;
  }
}

export function removeColoredAreaFromScene(coloredAreaId, dispatch) {
  try {
    console.log('Removing colored area from simulator:', coloredAreaId);
    dispatch(removeColoredArea(coloredAreaId));
    console.log('✅ Colored area removed successfully');
    return true;
  } catch (error) {
    console.error('❌ Error removing colored area:', error);
    return false;
  }
}

export function moveColoredAreaInScene(coloredAreaId, newX, newY, dispatch) {
  try {
    console.log('Moving colored area in simulator:', coloredAreaId, newX, newY);
    dispatch(moveColoredArea({ id: coloredAreaId, x: newX, y: newY }));
    console.log('✅ Colored area moved successfully');
    return true;
  } catch (error) {
    console.error('❌ Error moving colored area:', error);
    return false;
  }
}

export function addSimulatorRobotToScene(robotData, dispatch) {
  try {
    console.log('Adding robot to simulator:', robotData);
    dispatch(addSimulatorRobot(robotData));
    console.log('✅ Robot added to simulator successfully');
    return true;
  } catch (error) {
    console.error('❌ Error adding robot to simulator:', error);
    return false;
  }
}

export function removeSimulatorRobotFromScene(robotId, dispatch) {
  try {
    console.log('Removing robot from simulator:', robotId);
    dispatch(removeSimulatorRobot(robotId));
    console.log('✅ Robot removed from simulator successfully');
    return true;
  } catch (error) {
    console.error('❌ Error removing robot from simulator:', error);
    return false;
  }
}

export function moveSimulatorRobotInScene(robotId, newX, newY, dispatch) {
  try {
    console.log('Moving robot in simulator:', robotId, newX, newY);
    dispatch(moveSimulatorRobot({ id: robotId, x: newX, y: newY }));
    console.log('✅ Robot moved in simulator successfully');
    return true;
  } catch (error) {
    console.error('❌ Error moving robot in simulator:', error);
    return false;
  }
}

export function cycleSimulatorRobotType(dispatch) {
  try {
    console.log('Cycling to next robot type in simulator');
    dispatch(cycleSimulatorRobot());
    console.log('✅ Robot cycled successfully');
    return true;
  } catch (error) {
    console.error('❌ Error cycling robot type:', error);
    return false;
  }
}

export async function uploadSimulatorBackground() {
  return new Promise((resolve) => {
    try {
      console.log('Opening file picker for simulator background upload...');
      
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = false;
      
      input.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) {
          console.log("No file selected");
          resolve(false);
          return;
        }
        
        if (!file.type.startsWith('image/')) {
          console.error('Invalid file type. Please select an image file.');
          alert('Please select an image file (PNG, JPG, GIF, etc.)');
          resolve(false);
          return;
        }
        
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          console.error('File too large. Maximum size is 10MB.');
          alert('File too large. Please select an image smaller than 10MB.');
          resolve(false);
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const imageDataURL = e.target.result;
            
            const customBackgrounds = getCustomSimulatorBackgrounds();
            const newCustomBg = {
              id: `custom_${Date.now()}`,
              name: file.name,
              dataURL: imageDataURL,
              uploadedAt: new Date().toISOString()
            };
            
            customBackgrounds.push(newCustomBg);
            
            if (customBackgrounds.length > 5) {
              customBackgrounds.shift();
            }
            
            localStorage.setItem('simulatorCustomBackgrounds', JSON.stringify(customBackgrounds));
            localStorage.setItem('simulatorBackground', imageDataURL);
            
            window.dispatchEvent(new CustomEvent('simulatorBackgroundChanged'));
            
            console.log('✅ Custom background uploaded and set:', file.name);
            resolve(true);
          } catch (error) {
            console.error('Error processing image:', error);
            alert('Error processing image. Please try a different file.');
            resolve(false);
          }
        };
        
        reader.onerror = () => {
          console.error('Error reading file');
          alert('Error reading file. Please try again.');
          resolve(false);
        };
        
        reader.readAsDataURL(file);
      };
      
      input.click();
    } catch (error) {
      console.error('Error opening file picker:', error);
      resolve(false);
    }
  });
}

export function getCustomSimulatorBackgrounds() {
  try {
    const stored = localStorage.getItem('simulatorCustomBackgrounds');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting custom backgrounds:', error);
    return [];
  }
}

export function getAllSimulatorBackgrounds() {
  const builtInBackgrounds = [
    './assets/backgrounds/bg1.svg',
    './assets/backgrounds/bg2.svg', 
    './assets/backgrounds/bg3.svg',
    './assets/backgrounds/bg4.svg'
  ];
  
  const customBackgrounds = getCustomSimulatorBackgrounds();
  const customDataURLs = customBackgrounds.map(bg => bg.dataURL);
  
  return [...builtInBackgrounds, ...customDataURLs];
}

export function cycleSimulatorBackground() {
  const allBackgrounds = getAllSimulatorBackgrounds();
  
  const currentBg = localStorage.getItem('simulatorBackground') || allBackgrounds[0];
  
  let currentIndex = allBackgrounds.findIndex(bg => bg === currentBg);
  if (currentIndex === -1) currentIndex = -1;
  
  const nextIndex = (currentIndex + 1) % allBackgrounds.length;
  const nextBackground = allBackgrounds[nextIndex];
  
  localStorage.setItem('simulatorBackground', nextBackground);
  
  window.dispatchEvent(new CustomEvent('simulatorBackgroundChanged'));
  
  console.log('🔄 Cycling simulator background to:', nextBackground.substring(0, 50) + '...');
  return nextBackground;
}

export function getCurrentSimulatorBackground() {
  const stored = localStorage.getItem('simulatorBackground');
  if (stored) {
    return stored;
  }
  return './assets/backgrounds/bg1.png';
}

export function clearCustomSimulatorBackgrounds() {
  try {
    localStorage.removeItem('simulatorCustomBackgrounds');
    
    const currentBg = getCurrentSimulatorBackground();
    if (currentBg.startsWith('data:')) {
      localStorage.setItem('simulatorBackground', './assets/backgrounds/bg1.png');
      window.dispatchEvent(new CustomEvent('simulatorBackgroundChanged'));
    }
    
    console.log('✅ All custom simulator backgrounds cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing custom backgrounds:', error);
    return false;
  }
}

export function setSceneBackground(backgroundUrl, dispatch) {
  try {
    console.log('Setting background from simulator:', backgroundUrl);
    dispatch(setBackground(backgroundUrl));
    console.log('✅ Background set successfully');
    return true;
  } catch (error) {
    console.error('❌ Error setting background:', error);
    return false;
  }
}

export async function saveProjectFromSimulator(dispatch, getState) {
  try {
    console.log('Saving project from simulator...');
    const state = getState();
    const projectData = {
      scenes: state.scene.scenes,
      currentSceneIndex: state.scene.currentSceneIndex,
      backgroundGallery: state.scene.backgroundGallery,
      customSounds: state.scene.customSounds,
      simulatorRobots: state.scene.simulatorRobots,
      savedAt: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(projectData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `stembot-project-${new Date().getTime()}.json`;
    link.click();
    
    console.log('✅ Project saved successfully');
    return true;
  } catch (error) {
    console.error('❌ Error saving project:', error);
    return false;
  }
}

export async function loadProjectFromSimulator(dispatch) {
  return new Promise((resolve) => {
    try {
      console.log('Loading project from simulator...');
      
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) {
          resolve(false);
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const projectData = JSON.parse(e.target.result);
            dispatch(overwrite(projectData));
            console.log('✅ Project loaded successfully');
            resolve(true);
          } catch (error) {
            console.error('❌ Error parsing project file:', error);
            resolve(false);
          }
        };
        
        reader.readAsText(file);
      };
      
      input.click();
    } catch (error) {
      console.error('❌ Error loading project:', error);
      resolve(false);
    }
  });
}
