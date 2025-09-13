import {
  moveActor,
  rotateActor,
  scaleActor,
  resetActorSize,
  disappearActor,
  reappearActor,
  setVideoOpacity // NEW: Import the setVideoOpacity action
} from "../store/sceneSlice";

// Helper for delays with speed multiplier
const delay = (ms, speedMultiplier = 1) => {
  const adjustedTime = Math.max(50, ms / speedMultiplier); // Minimum 50ms delay
  return new Promise((res) => setTimeout(res, adjustedTime));
};

// Helper for sounds
async function playCustomSound(block) {
  try {
    const audio = new Audio(block.soundData?.audioURL || block.audioURL);
    await audio.play();
  } catch (err) {
    console.error("Error playing sound:", err);
  }
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

// Helper function to check for happy emotion
const isHappyDetected = () => {
    return window.humanDetectionData?.dominantExpression === 'happy';
};

// Helper function to check for pointing direction
const isPointing = (direction) => {
    const data = window.humanDetectionData;
    if (!data?.leftHand || !data?.rightHand || !data?.poses?.[0]?.keypoints) {
        return false;
    }

    const leftWrist = data.leftHand;
    const rightWrist = data.rightHand;
    const scoreThreshold = 0.2;

    switch (direction) {
        case 'up':
            const noseY = data.poses[0].keypoints[0].position.y;
            return (leftWrist.score > scoreThreshold && leftWrist.position.y < noseY) ||
                   (rightWrist.score > scoreThreshold && rightWrist.position.y < noseY);
        case 'down':
            const hipY = data.poses[0].keypoints[11].position.y;
            return (leftWrist.score > scoreThreshold && leftWrist.position.y > hipY) ||
                   (rightWrist.score > scoreThreshold && rightWrist.position.y > hipY);
        case 'left':
            const rightShoulderX = data.poses[0].keypoints[6].position.x;
            return rightWrist.score > scoreThreshold && rightWrist.position.x > rightShoulderX;
        case 'right':
            const leftShoulderX = data.poses[0].keypoints[5].position.x;
            return leftWrist.score > scoreThreshold && leftWrist.position.x < leftShoulderX;
        default:
            return false;
    }
};

// exported async run function
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
  let currentSpeedMultiplier = 1; // Default speed

  console.log("🚀 Starting script execution with", actor.scripts.length, "blocks");

  // First pass: check for Stop blocks and find where to actually stop
  let stopIndex = -1;
  for (let i = 0; i < actor.scripts.length; i++) {
    const block = actor.scripts[i];
    console.log(`Block ${i}:`, JSON.stringify(block, null, 2));

    if (isStopBlock(block)) {
      stopIndex = i;
      console.log(`🛑 STOP BLOCK FOUND at index ${i} - will stop execution here`);
      break;
    }
  }

  try {
    for (let i = 0; i < actor.scripts.length; i++) {
      const b = actor.scripts[i];

      // If we've reached the stop index, terminate execution
      if (stopIndex !== -1 && i === stopIndex) {
        console.log(`🛑 EXECUTION STOPPED at block ${i} due to Stop block`);
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
        console.log(`⏱️ WAITING for ${waitTime}ms (speed: ${currentSpeedMultiplier}x)`);
        await delay(waitTime, currentSpeedMultiplier);
        console.log("⏱️ Wait completed");
        continue;
      }

      // Get the block identifier
      const blockIdentifier = b?.name || b?.type;
      console.log(`▶️ Executing: ${blockIdentifier} (count: ${c}, speed: ${currentSpeedMultiplier}x)`);

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
            // The next block in the script will be executed
          } else {
            // Skip the next block
            i++;
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

        // NEW: Case for "Set Video Transparency" block
        case 'Set Video Transparency':
          const newOpacity = b.opacity;
          if (newOpacity !== undefined) {
            dispatch(setVideoOpacity(newOpacity));
            console.log(`🎥 Setting video opacity to ${newOpacity}%`);
          }
          await delay(50, currentSpeedMultiplier); // A small delay to allow the state to update
          break;

        case 'Pop':
          if (sounds?.pop) {
            try {
              await new Audio(sounds.pop).play();
            } catch {}
          }
          await delay(120, currentSpeedMultiplier);
          break;

        case 'Record':
          // reserved for future use
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
          if (b?.type && b.soundData?.audioURL) {
            console.log('Playing custom sound:', b.type);
            for (let k = 0; k < c; k++) {
              await playCustomSound(b);
              if (k < c - 1) await delay(200, currentSpeedMultiplier);
            }
            await delay(120, currentSpeedMultiplier);
          } else if (b?.audioURL) {
            console.log('Playing custom sound via audioURL:', b.type);
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