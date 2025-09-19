import {
  moveActor,
  rotateActor,
  scaleActor,
  resetActorSize,
  disappearActor,
  reappearActor,
  setVideoOpacity,
  syncActorsWithFaces,
  addObstacle,
  removeObstacle,
  moveObstacle,
  addColoredArea,  // Changed from addTextArea
  removeColoredArea, // Changed from removeTextArea
  moveColoredArea,   // Changed from moveTextArea
  setBackground,
  cycleNextBackground,
  overwrite
} from "../store/sceneSlice";

// Helper for delays with speed multiplier
const delay = (ms, speedMultiplier = 1) => {
  const adjustedTime = Math.max(50, ms / speedMultiplier);
  return new Promise((res) => setTimeout(res, adjustedTime));
};

// UPDATED: Helper for sounds with better error handling
async function playCustomSound(block) {
  try {
    const audio = new Audio(block.soundData?.audioURL || block.audioURL);
    audio.volume = 0.7; // Set volume
    await audio.play();
  } catch (err) {
    console.error("Error playing sound:", err);
  }
}

// FIXED: Frequency sound generator that actually works
function playFrequencySound(frequency = 440, duration = 300) {
  return new Promise((resolve) => {
    try {
      console.log(`🔊 PLAYING FREQUENCY SOUND: ${frequency}Hz for ${duration}ms`);
      // Create a simple beep sound that works in all browsers
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Resume audio context if suspended (required by most browsers)
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log("🔊 Audio context resumed");
        });
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Set frequency (map 1-99 to 300-1500 Hz for better hearing)
      const mappedFreq = 300 + (frequency - 1) * 12;
      oscillator.frequency.setValueAtTime(mappedFreq, audioContext.currentTime);

      // Use sine wave for clear sound
      oscillator.type = 'sine';

      // Set volume envelope
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

      // Start and stop
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);

      // Resolve promise when sound finishes
      oscillator.onended = () => {
        console.log("🔊 Frequency sound finished playing");
        resolve();
      };
    } catch (err) {
      console.error("❌ Error playing frequency sound:", err);
      resolve(); // Don't block execution
    }
  });
}

// IMPROVED: Better Redux store access for obstacle detection
function getCurrentSceneData(dispatch) {
  try {
    // Method 1: Try to access store from the dispatch function context
    if (dispatch && dispatch.getState) {
      const state = dispatch.getState();
      return state.scene?.scenes?.[state.scene?.currentSceneIndex];
    }

    // Method 2: Try various global store access patterns
    const possibleStores = [
      window.__REDUX_STORE__,
      window.reduxStore,
      window.store,
      window.__store__
    ];

    for (const store of possibleStores) {
      if (store && store.getState) {
        const state = store.getState();
        const currentScene = state.scene?.scenes?.[state.scene?.currentSceneIndex];
        if (currentScene) {
          console.log(`🚧 Found scene data via global store:`, {
            actors: currentScene.actors?.length || 0,
            obstacles: currentScene.obstacles?.length || 0,
            coloredAreas: currentScene.coloredAreas?.length || 0
          });
          return currentScene;
        }
      }
    }
    console.warn("🚧 No Redux store found - obstacle detection will be skipped");
    return null;
  } catch (err) {
    console.error("🚧 Error accessing scene data:", err);
    return null;
  }
}

// FIXED: Predictive collision detection - prevents movement into obstacles (ignores colored areas)
function checkForObstacle(actor, direction, dispatch, currentSceneData) {
  try {
    console.log(`🚧 === OBSTACLE CHECK START ===`);
    console.log(`🚧 Actor "${actor.name || actor.id}" at (${actor.x}, ${actor.y}) wants to move ${direction}`);

    // Use the scene data passed from the run function
    if (!currentSceneData || !currentSceneData.actors) {
      console.log("🚧 ❌ No scene data available - skipping obstacle check");
      return false;
    }

    console.log(`🚧 Scene data:`, {
      actors: currentSceneData.actors?.length || 0,
      obstacles: currentSceneData.obstacles?.length || 0,
      coloredAreas: currentSceneData.coloredAreas?.length || 0,
      background: currentSceneData.background
    });

    // Get current sprite position (rounded to grid)
    const currentX = Math.round(actor.x);
    const currentY = Math.round(actor.y);

    // Calculate WHERE the sprite WANTS TO MOVE (next position)
    let targetX = currentX;
    let targetY = currentY;

    switch (direction) {
      case 'right': targetX = currentX + 1; break;
      case 'left': targetX = currentX - 1; break;
      case 'up': targetY = currentY - 1; break;
      case 'down': targetY = currentY + 1; break;
    }

    console.log(`🚧 Current grid position: (${currentX}, ${currentY})`);
    console.log(`🚧 Target grid position: (${targetX}, ${targetY})`);

    // Check boundaries (20x15 grid)
    if (targetX < 0 || targetX >= 20 || targetY < 0 || targetY >= 15) {
      console.log(`🚧 ❌ WALL BOUNDARY! Cannot move to (${targetX},${targetY})`);
      return true;
    }

    // Check if target position contains an obstacle (ignore colored areas)
    if (currentSceneData.obstacles && currentSceneData.obstacles.length > 0) {
      console.log(`🚧 Checking ${currentSceneData.obstacles.length} obstacles:`);
      for (const obstacle of currentSceneData.obstacles) {
        // Only check actual obstacles, not colored areas
        if (obstacle.type !== 'coloredArea' && obstacle.blocking !== false) {
          const obstacleX = Math.round(obstacle.x);
          const obstacleY = Math.round(obstacle.y);
          console.log(`🚧 - Obstacle "${obstacle.shape}" at grid (${obstacleX}, ${obstacleY})`);
          
          // CRITICAL: Check if target position is occupied by obstacle
          if (targetX === obstacleX && targetY === obstacleY) {
            console.log(`🚧 ❌ OBSTACLE BLOCKS MOVEMENT! "${obstacle.shape}" is at target position (${targetX},${targetY})`);
            return true; // Block movement BEFORE it happens
          }
        }
      }
      console.log(`🚧 ✅ Target position (${targetX}, ${targetY}) is clear of obstacles`);
    } else {
      console.log(`🚧 No obstacles in scene`);
    }

    // Check coloredAreas but ignore them for collision (they are non-blocking)
    if (currentSceneData.coloredAreas && currentSceneData.coloredAreas.length > 0) {
      console.log(`🎨 Found ${currentSceneData.coloredAreas.length} colored areas - allowing movement through them`);
      // Colored areas are non-blocking, so we don't check collision
    }

    // Check for other visible actors at target position
    if (currentSceneData.actors && currentSceneData.actors.length > 0) {
      const otherActors = currentSceneData.actors.filter(a =>
        a.id !== actor.id &&
        a.visible !== false
      );
      console.log(`🚧 Checking ${otherActors.length} other actors:`);
      for (const otherActor of otherActors) {
        const otherX = Math.round(otherActor.x);
        const otherY = Math.round(otherActor.y);
        console.log(`🚧 - "${otherActor.name || 'Actor'}" at grid (${otherX},${otherY})`);

        // Check if target position is occupied by another actor
        if (targetX === otherX && targetY === otherY) {
          console.log(`🚧 ❌ ACTOR BLOCKS MOVEMENT! "${otherActor.name || 'Actor'}" is at target position (${targetX},${targetY})`);
          return true;
        }
      }
      console.log(`🚧 ✅ Target position (${targetX}, ${targetY}) is clear of other actors`);
    } else {
      console.log(`🚧 No other actors to check`);
    }

    console.log("🚧 ✅ Movement allowed - target position is clear");
    console.log(`🚧 === OBSTACLE CHECK END ===`);
    return false;
  } catch (err) {
    console.error("🚧 Error in obstacle detection:", err);
    return false;
  }
}

// NEW: Simulator Control Functions
export function addObstacleToScene(obstacleData, dispatch) {
  try {
    console.log('🚧 Adding obstacle from simulator:', obstacleData);
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
    console.log('🚧 Removing obstacle from simulator:', obstacleId);
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
    console.log('🚧 Moving obstacle in simulator:', { obstacleId, newX, newY });
    dispatch(moveObstacle({ id: obstacleId, x: newX, y: newY }));
    console.log('✅ Obstacle moved successfully');
    return true;
  } catch (error) {
    console.error('❌ Error moving obstacle:', error);
    return false;
  }
}

// NEW: Colored Area Management Functions (NO TEXT - just colored blocks)
export function addColoredAreaToScene(coloredAreaData, dispatch) {
  try {
    console.log('🎨 Adding colored area from simulator:', coloredAreaData);
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
    console.log('🎨 Removing colored area from simulator:', coloredAreaId);
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
    console.log('🎨 Moving colored area in simulator:', { coloredAreaId, newX, newY });
    dispatch(moveColoredArea({ id: coloredAreaId, x: newX, y: newY }));
    console.log('✅ Colored area moved successfully');
    return true;
  } catch (error) {
    console.error('❌ Error moving colored area:', error);
    return false;
  }
}

// Function to upload custom simulator background
export async function uploadSimulatorBackground() {
  return new Promise((resolve) => {
    try {
      console.log('📂 Opening file picker for simulator background upload');

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*'; // Only allow image files
      input.multiple = false;

      input.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) {
          console.log('No file selected');
          resolve(false);
          return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
          console.error('❌ Invalid file type. Please select an image file.');
          alert('Please select an image file (PNG, JPG, GIF, etc.)');
          resolve(false);
          return;
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if (file.size > maxSize) {
          console.error('❌ File too large. Maximum size is 10MB.');
          alert('File too large. Please select an image smaller than 10MB.');
          resolve(false);
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const imageDataURL = e.target.result;

            // Store the custom background
            const customBackgrounds = getCustomSimulatorBackgrounds();
            const newCustomBg = {
              id: `custom_${Date.now()}`,
              name: file.name,
              dataURL: imageDataURL,
              uploadedAt: new Date().toISOString()
            };

            customBackgrounds.push(newCustomBg);

            // Limit to 5 custom backgrounds to prevent storage overflow
            if (customBackgrounds.length > 5) {
              customBackgrounds.shift(); // Remove oldest
            }

            localStorage.setItem('simulatorCustomBackgrounds', JSON.stringify(customBackgrounds));

            // Set as current background
            localStorage.setItem('simulatorBackground', imageDataURL);

            // Dispatch event to update UI
            window.dispatchEvent(new CustomEvent('simulatorBackgroundChanged'));

            console.log('✅ Custom background uploaded and set:', file.name);
            resolve(true);
          } catch (error) {
            console.error('❌ Error processing image:', error);
            alert('Error processing image. Please try a different file.');
            resolve(false);
          }
        };

        reader.onerror = () => {
          console.error('❌ Error reading file');
          alert('Error reading file. Please try again.');
          resolve(false);
        };

        reader.readAsDataURL(file);
      };

      input.click();
    } catch (error) {
      console.error('❌ Error opening file picker:', error);
      resolve(false);
    }
  });
}

// Function to get custom simulator backgrounds
export function getCustomSimulatorBackgrounds() {
  try {
    const stored = localStorage.getItem('simulatorCustomBackgrounds');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting custom backgrounds:', error);
    return [];
  }
}

// Function to get all available simulator backgrounds (built-in + custom)
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

// Function to cycle simulator background (now includes custom backgrounds)
export function cycleSimulatorBackground() {
  const allBackgrounds = getAllSimulatorBackgrounds();

  // Get current simulator background from localStorage or default to bg1
  const currentBg = localStorage.getItem('simulatorBackground') || allBackgrounds[0];

  let currentIndex = allBackgrounds.findIndex(bg => bg === currentBg);
  if (currentIndex === -1) currentIndex = -1;

  // Get next background
  const nextIndex = (currentIndex + 1) % allBackgrounds.length;
  const nextBackground = allBackgrounds[nextIndex];

  // Store in localStorage (not Redux)
  localStorage.setItem('simulatorBackground', nextBackground);

  // Dispatch custom event to notify SimulatorModal
  window.dispatchEvent(new CustomEvent('simulatorBackgroundChanged'));

  console.log('🎨 Cycling simulator background to:', nextBackground.substring(0, 50) + '...');
  return nextBackground;
}

// Function to get current simulator background (handles custom backgrounds)
export function getCurrentSimulatorBackground() {
  const stored = localStorage.getItem('simulatorBackground');
  if (stored) {
    return stored;
  }
  // Default to bg1
  return './assets/backgrounds/bg1.png';
}

// Function to clear all custom backgrounds
export function clearCustomSimulatorBackgrounds() {
  try {
    localStorage.removeItem('simulatorCustomBackgrounds');

    // Reset to bg1 if current background was custom
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
    console.log('🎨 Setting background from simulator:', backgroundUrl);
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
    console.log('💾 Saving project from simulator');

    const state = getState();
    const projectData = {
      scenes: state.scene.scenes,
      currentSceneIndex: state.scene.currentSceneIndex,
      backgroundGallery: state.scene.backgroundGallery,
      customSounds: state.scene.customSounds,
      savedAt: new Date().toISOString()
    };

    // Create and download file
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
      console.log('📂 Loading project from simulator');

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

// UPDATED: Helper for Pop sound with multiple fallbacks
async function playPopSound(sounds) {
  const popSources = [
    sounds?.pop,
    './assets/sounds/pop.mp3',
    '/assets/sounds/pop.mp3',
    'assets/sounds/pop.mp3',
    'sounds/pop.mp3'
  ];

  for (const src of popSources) {
    if (src) {
      try {
        console.log('🔊 Trying to play pop sound from:', src);
        const audio = new Audio(src);
        audio.volume = 0.8; // Higher volume for pop sound

        // Add event listeners for debugging
        audio.addEventListener('canplaythrough', () => {
          console.log('✅ Pop sound loaded successfully');
        });
        audio.addEventListener('error', (e) => {
          console.warn('❌ Pop sound failed to load:', e);
        });

        await audio.play();
        console.log('✅ Pop sound played successfully');
        return; // Success, exit
      } catch (err) {
        console.warn(`Failed to play pop sound from ${src}:`, err);
        continue; // Try next source
      }
    }
  }

  // If all sources fail, create a synthetic beep
  console.warn('🔔 Creating synthetic beep sound');
  await playFrequencySound(800, 200);
}

// Helper function to check if a block is a Stop block
function isStopBlock(block) {
  return (
    block?.name === 'Stop' ||
    block?.type === 'Stop' ||
    (block?.category === 'control' && (block?.name === 'Stop' || block?.type === 'Stop')) ||
    block?.name?.toLowerCase().includes('stop') ||
    block?.type?.toLowerCase().includes('stop')
  );
}

// Helper function to check if a block is a Wait block
function isWaitBlock(block) {
  return (
    block?.name === 'Wait' ||
    block?.type === 'Wait' ||
    (block?.category === 'control' && (block?.name === 'Wait' || block?.type === 'Wait')) ||
    block?.name?.toLowerCase().includes('wait') ||
    block?.type?.toLowerCase().includes('wait')
  );
}

// Helper function to check if a block is a Speed block
function isSpeedBlock(block) {
  return (
    block?.name === 'Speed' ||
    block?.type === 'Speed' ||
    (block?.category === 'control' && (block?.name === 'Speed' || block?.type === 'Speed')) ||
    block?.name?.toLowerCase().includes('speed') ||
    block?.type?.toLowerCase().includes('speed')
  );
}

// Helper function to check if a block is an Obstacle Detected block
function isObstacleDetectedBlock(block) {
  return (
    block?.name === 'Obstacle Detected' ||
    block?.type === 'obstacle_sound' ||
    block?.name?.toLowerCase().includes('obstacle')
  );
}

// Helper function to check for happy emotion
const isHappyDetected = () => {
  return window.humanDetectionData?.dominantExpression === 'happy';
};

// Helper function for pointing detection
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
      return rightHand.score > scoreThreshold && rightHand.position.x > rightShoulderX;
    case 'right':
      return leftHand.score > scoreThreshold && leftHand.position.x < leftShoulderX;
    default:
      return false;
  }
};

// MAIN: exported async run function with obstacle collision detection
export async function run(actor, dispatch, sounds, selectedActorId) {
  if (!actor) {
    console.warn("run() called with no actor!");
    return;
  }

  if (!Array.isArray(actor.scripts) || actor.scripts.length === 0) {
    console.log("Actor has no scripts to run:", actor);
    return;
  }

  const loops = [];
  const targetActorId = selectedActorId || actor.id;
  let currentSpeedMultiplier = 1;
  let obstacleCollisionDetected = false; // Flag to track obstacle collision

  console.log("🚀 Starting script execution with", actor.scripts.length, "blocks");
  console.log("🔊 Available sounds:", sounds);

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

      // Check if obstacle collision was detected and stop execution
      if (obstacleCollisionDetected) {
        console.log(`🚧 🛑 SCRIPT EXECUTION STOPPED DUE TO OBSTACLE COLLISION`);
        break;
      }

      if (stopIndex !== -1 && i === stopIndex) {
        console.log(`🛑 EXECUTION STOPPED at block ${i}`);
        return;
      }

      const c = Math.max(1, Math.min(99, b?.count || 1));

      // Handle Speed block
      if (isSpeedBlock(b)) {
        currentSpeedMultiplier = b?.speedMultiplier || 1.5;
        console.log(`⚡ SPEED CHANGED to ${currentSpeedMultiplier}x`);
        continue;
      }

      // Handle Wait block
      if (isWaitBlock(b)) {
        const waitTime = (b?.count || 3) * 1000;
        console.log(`⏱️ WAITING for ${waitTime}ms`);
        await delay(waitTime, currentSpeedMultiplier);
        continue;
      }

      // Handle Obstacle Detected block
      if (isObstacleDetectedBlock(b)) {
        const lowFreq = Math.max(1, Math.min(99, b?.lowFrequency || 1));
        const highFreq = Math.max(1, Math.min(99, b?.highFrequency || 99));
        const alertFrequency = Math.max(lowFreq, highFreq);
        console.log(`🚧 OBSTACLE DETECTED BLOCK - Playing ${alertFrequency}Hz sound`);

        await playFrequencySound(alertFrequency, 500);
        console.log(`🔊 Obstacle alert sound played at ${alertFrequency}Hz`);
        continue;
      }

      const blockIdentifier = b?.name || b?.type;
      console.log(`▶️ Executing: ${blockIdentifier} (count: ${c})`);

      switch (blockIdentifier) {
        case 'Move Right':
          for (let k = 0; k < c; k++) {
            const currentScene = getCurrentSceneData(dispatch);

            if (currentScene) {
              if (checkForObstacle(actor, 'right', dispatch, currentScene)) {
                console.log(`🚧 ❌ OBSTACLE DETECTED! Playing alert sound and stopping execution.`);
                await playFrequencySound(600, 800);
                obstacleCollisionDetected = true;
                break;
              }
            } else {
              console.log(`🚧 ⚠️ Scene data not available, proceeding without obstacle check`);
            }

            dispatch(moveActor({ actorId: actor.id, dx: 1, dy: 0, fromScript: true }));
            await delay(180, currentSpeedMultiplier);
          }
          break;

        case 'Move Left':
          for (let k = 0; k < c; k++) {
            const currentScene = getCurrentSceneData(dispatch);
            if (currentScene) {
              if (checkForObstacle(actor, 'left', dispatch, currentScene)) {
                console.log(`🚧 ❌ OBSTACLE DETECTED! Playing alert sound and stopping execution.`);
                await playFrequencySound(600, 800);
                obstacleCollisionDetected = true;
                break;
              }
            } else {
              console.log(`🚧 ⚠️ Scene data not available, proceeding without obstacle check`);
            }

            dispatch(moveActor({ actorId: actor.id, dx: -1, dy: 0, fromScript: true }));
            await delay(180, currentSpeedMultiplier);
          }
          break;

        case 'Move Up':
          for (let k = 0; k < c; k++) {
            const currentScene = getCurrentSceneData(dispatch);
            if (currentScene) {
              if (checkForObstacle(actor, 'up', dispatch, currentScene)) {
                console.log(`🚧 ❌ OBSTACLE DETECTED! Playing alert sound and stopping execution.`);
                await playFrequencySound(600, 800);
                obstacleCollisionDetected = true;
                break;
              }
            } else {
              console.log(`🚧 ⚠️ Scene data not available, proceeding without obstacle check`);
            }

            dispatch(moveActor({ actorId: actor.id, dx: 0, dy: -1, fromScript: true }));
            await delay(120, currentSpeedMultiplier);
            dispatch(moveActor({ actorId: actor.id, dx: 0, dy: 2, fromScript: true }));
            await delay(120, currentSpeedMultiplier);
          }
          break;

        case 'Move Down':
          for (let k = 0; k < c; k++) {
            const currentScene = getCurrentSceneData(dispatch);
            if (currentScene) {
              if (checkForObstacle(actor, 'down', dispatch, currentScene)) {
                console.log(`🚧 ❌ OBSTACLE DETECTED! Playing alert sound and stopping execution.`);
                await playFrequencySound(600, 800);
                obstacleCollisionDetected = true;
                break;
              }
            } else {
              console.log(`🚧 ⚠️ Scene data not available, proceeding without obstacle check`);
            }

            dispatch(moveActor({ actorId: actor.id, dx: 0, dy: 1, fromScript: true }));
            await delay(180, currentSpeedMultiplier);
          }
          break;

        case 'Rotate Left':
          for (let k = 0; k < c; k++) {
            dispatch(rotateActor({ actorId: actor.id, degrees: -90, fromScript: true }));
            await delay(140, currentSpeedMultiplier);
          }
          break;

        case 'Rotate Right':
          for (let k = 0; k < c; k++) {
            dispatch(rotateActor({ actorId: actor.id, degrees: 90, fromScript: true }));
            await delay(140, currentSpeedMultiplier);
          }
          break;

        case 'Happy Detected':
          if (isHappyDetected()) {
            // Continue to next block
          } else {
            i++; // Skip next block
          }
          break;

        case 'Pointing Up':
          if (isPointing('up')) {
            const currentScene = getCurrentSceneData(dispatch);
            if (currentScene) {
              if (checkForObstacle(actor, 'up', dispatch, currentScene)) {
                console.log(`🚧 ❌ OBSTACLE DETECTED! Playing alert sound and stopping execution.`);
                await playFrequencySound(600, 800);
                obstacleCollisionDetected = true;
                break;
              }
            }
            dispatch(moveActor({ actorId: actor.id, dx: 0, dy: -1, fromScript: true }));
            await delay(180, currentSpeedMultiplier);
          }
          break;

        case 'Pointing Down':
          if (isPointing('down')) {
            const currentScene = getCurrentSceneData(dispatch);
            if (currentScene) {
              if (checkForObstacle(actor, 'down', dispatch, currentScene)) {
                console.log(`🚧 ❌ OBSTACLE DETECTED! Playing alert sound and stopping execution.`);
                await playFrequencySound(600, 800);
                obstacleCollisionDetected = true;
                break;
              }
            }
            dispatch(moveActor({ actorId: actor.id, dx: 0, dy: 1, fromScript: true }));
            await delay(180, currentSpeedMultiplier);
          }
          break;

        case 'Pointing Left':
          if (isPointing('left')) {
            const currentScene = getCurrentSceneData(dispatch);
            if (currentScene) {
              if (checkForObstacle(actor, 'left', dispatch, currentScene)) {
                console.log(`🚧 ❌ OBSTACLE DETECTED! Playing alert sound and stopping execution.`);
                await playFrequencySound(600, 800);
                obstacleCollisionDetected = true;
                break;
              }
            }
            dispatch(moveActor({ actorId: actor.id, dx: -1, dy: 0, fromScript: true }));
            await delay(180, currentSpeedMultiplier);
          }
          break;

        case 'Pointing Right':
          if (isPointing('right')) {
            const currentScene = getCurrentSceneData(dispatch);
            if (currentScene) {
              if (checkForObstacle(actor, 'right', dispatch, currentScene)) {
                console.log(`🚧 ❌ OBSTACLE DETECTED! Playing alert sound and stopping execution.`);
                await playFrequencySound(600, 800);
                obstacleCollisionDetected = true;
                break;
              }
            }
            dispatch(moveActor({ actorId: actor.id, dx: 1, dy: 0, fromScript: true }));
            await delay(180, currentSpeedMultiplier);
          }
          break;

        case 'Set Video Transparency':
          const newOpacity = b.opacity;
          if (newOpacity !== undefined) {
            dispatch(setVideoOpacity(newOpacity));
            console.log(`🎥 Setting video opacity to ${newOpacity}%`);
          }
          await delay(50, currentSpeedMultiplier);
          break;

        case 'Sync Actors with Faces':
          const facesDetected = window.humanDetectionData?.faceCount || 0;
          dispatch(syncActorsWithFaces(facesDetected));
          console.log(`👤 Syncing actors with ${facesDetected} faces detected`);
          await delay(100, currentSpeedMultiplier);
          break;

        case 'Pop':
          console.log('🔊 Executing Pop sound block');
          await playPopSound(sounds);
          await delay(120, currentSpeedMultiplier);
          break;

        case 'Record':
          // Reserved for future use
          break;

        case 'loop':
          loops.push({ start: i + 1, left: c });
          break;

        case 'end':
        case 'endLoop':
          if (loops.length) {
            const L = loops[loops.length - 1];
            L.left -= 1;
            if (L.left > 0) {
              i = L.start - 1;
              continue;
            } else {
              loops.pop();
            }
          }
          break;

        case 'Grow Size':
          for (let k = 0; k < c; k++) {
            dispatch(scaleActor({ actorId: actor.id, scale: 1.2, fromScript: true }));
            await delay(200, currentSpeedMultiplier);
          }
          break;

        case 'Shrink Size':
          for (let k = 0; k < c; k++) {
            dispatch(scaleActor({ actorId: actor.id, scale: 0.8, fromScript: true }));
            await delay(200, currentSpeedMultiplier);
          }
          break;

        case 'Reset Size':
          dispatch(resetActorSize({ actorId: targetActorId, fromScript: true }));
          break;

        case 'Disappear':
          dispatch(disappearActor({ actorId: targetActorId }));
          break;

        case 'Appear':
          dispatch(reappearActor({ actorId: targetActorId }));
          break;

        default:
          // Handle custom sounds
          if (b?.type === 'custom_sound' && b.soundData?.audioURL) {
            console.log('🎵 Playing custom sound:', b.name);
            for (let k = 0; k < c; k++) {
              await playCustomSound(b);
              if (k < c - 1) await delay(200, currentSpeedMultiplier);
            }
            await delay(120, currentSpeedMultiplier);
          } else if (b?.audioURL) {
            console.log('🎵 Playing custom sound via audioURL:', b.name);
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
      console.log("🚧 ❌ Script execution terminated due to obstacle collision");
    } else {
      console.log("✅ Script execution completed normally");
    }

  } catch (error) {
    console.error("Script execution error:", error);
    throw error;
  }
}
