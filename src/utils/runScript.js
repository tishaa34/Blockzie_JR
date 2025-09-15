import {
  moveActor,
  rotateActor,
  scaleActor,
  resetActorSize,
  disappearActor,
  reappearActor,
  setVideoOpacity,
  syncActorsWithFaces,
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

// FIXED: Simple obstacle detection using dispatch to get fresh state
function checkForObstacle(actor, direction, dispatch, currentSceneData) {
  try {
    // Use the scene data passed from the run function
    if (!currentSceneData || !currentSceneData.actors) {
      console.log("🚧 No scene data available");
      return false;
    }
    
    // Calculate next position
    let nextX = actor.x;
    let nextY = actor.y;
    
    switch (direction) {
      case 'right': nextX = actor.x + 1; break;
      case 'left': nextX = actor.x - 1; break;
      case 'up': nextY = actor.y - 1; break;
      case 'down': nextY = actor.y + 1; break;
    }
    
    console.log(`🚧 Checking ${direction}: (${actor.x},${actor.y}) -> (${nextX},${nextY})`);
    
    // Check boundaries (20x15 grid)
    if (nextX < 0 || nextX >= 20 || nextY < 0 || nextY >= 15) {
      console.log(`🚧 WALL OBSTACLE at (${nextX},${nextY})`);
      return true;
    }
    
    // Check for other visible actors
    const otherActors = currentSceneData.actors.filter(a => 
      a.id !== actor.id && 
      a.visible !== false
    );
    
    console.log(`🚧 Checking against ${otherActors.length} other actors:`);
    
    for (const otherActor of otherActors) {
      console.log(`🚧   - "${otherActor.name || 'Actor'}" at (${otherActor.x},${otherActor.y})`);
      
      // Check if positions overlap (same grid cell)
      if (Math.floor(otherActor.x) === Math.floor(nextX) && 
          Math.floor(otherActor.y) === Math.floor(nextY)) {
        console.log(`🚧 ❌ SPRITE COLLISION! "${otherActor.name || 'Actor'}" blocks move to (${nextX},${nextY})`);
        return true;
      }
    }
    
    console.log("🚧 ✅ Path is clear");
    return false;
    
  } catch (err) {
    console.error("Error in obstacle detection:", err);
    return false;
  }
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

// NEW: Helper function to check if a block is an Obstacle Detected block
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

// MAIN: exported async run function - BACK TO ORIGINAL SIGNATURE (no currentScene parameter)
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

      // FIXED: Handle Obstacle Detected block - simplified version
      if (isObstacleDetectedBlock(b)) {
        const lowFreq = Math.max(1, Math.min(99, b?.lowFrequency || 1));
        const highFreq = Math.max(1, Math.min(99, b?.highFrequency || 99));
        const alertFrequency = Math.max(lowFreq, highFreq);
        
        console.log(`🚧 OBSTACLE DETECTED BLOCK - Playing ${alertFrequency}Hz sound`);
        
        // Always play the sound for now (we'll add obstacle detection later)
        await playFrequencySound(alertFrequency, 500);
        console.log(`🔊 Obstacle alert sound played at ${alertFrequency}Hz`);
        
        continue;
      }

      const blockIdentifier = b?.name || b?.type;
      console.log(`▶️ Executing: ${blockIdentifier} (count: ${c})`);

      switch (blockIdentifier) {
        case 'Move Right':
          for (let k = 0; k < c; k++) {
            dispatch(moveActor({ actorId: actor.id, dx: 1, dy: 0, fromScript: true }));
            await delay(180, currentSpeedMultiplier);
          }
          break;

        case 'Move Left':
          for (let k = 0; k < c; k++) {
            dispatch(moveActor({ actorId: actor.id, dx: -1, dy: 0, fromScript: true }));
            await delay(180, currentSpeedMultiplier);
          }
          break;

        case 'Move Up':
          for (let k = 0; k < c; k++) {
            dispatch(moveActor({ actorId: actor.id, dx: 0, dy: -1, fromScript: true }));
            await delay(120, currentSpeedMultiplier);
            dispatch(moveActor({ actorId: actor.id, dx: 0, dy: 2, fromScript: true }));
            await delay(120, currentSpeedMultiplier);
          }
          break;

        case 'Move Down':
          for (let k = 0; k < c; k++) {
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
            dispatch(moveActor({ actorId: actor.id, dx: 0, dy: -1, fromScript: true }));
            await delay(180, currentSpeedMultiplier);
          }
          break;

        case 'Pointing Down':
          if (isPointing('down')) {
            dispatch(moveActor({ actorId: actor.id, dx: 0, dy: 1, fromScript: true }));
            await delay(180, currentSpeedMultiplier);
          }
          break;

        case 'Pointing Left':
          if (isPointing('left')) {
            dispatch(moveActor({ actorId: actor.id, dx: -1, dy: 0, fromScript: true }));
            await delay(180, currentSpeedMultiplier);
          }
          break;

        case 'Pointing Right':
          if (isPointing('right')) {
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

    console.log("✅ Script execution completed normally");
  } catch (error) {
    console.error("Script execution error:", error);
    throw error;
  }
}
