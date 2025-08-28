import { 
  moveActor, 
  rotateActor, 
  scaleActor, 
  resetActorSize, 
  disappearActor, 
  reappearActor 
} from "../store/sceneSlice";

// helper for delays
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// helper for sounds
async function playCustomSound(block) {
  try {
    const audio = new Audio(block.soundData?.audioURL || block.audioURL);
    await audio.play();
  } catch (err) {
    console.error("Error playing sound:", err);
  }
}

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

  for (let i = 0; i < actor.scripts.length;) {
    const b = actor.scripts[i];
    const c = Math.max(1, Math.min(99, b?.count || 1));
    console.log("Executing:", b?.type, "count:", c);

    switch (b?.type) {
      case 'Move Right':
        for (let k = 0; k < c; k++) {
          dispatch(moveActor({ actorId: actor.id, dx: 1, dy: 0, fromScript: true }));
          await delay(180);
        }
        break;

      case 'Move Left':
        for (let k = 0; k < c; k++) {
          dispatch(moveActor({ actorId: actor.id, dx: -1, dy: 0, fromScript: true }));
          await delay(180);
        }
        break;

      case 'Move Up':
        for (let k = 0; k < c; k++) {
          dispatch(moveActor({ actorId: actor.id, dx: 0, dy: -1, fromScript: true }));
          await delay(120);
          dispatch(moveActor({ actorId: actor.id, dx: 0, dy: 2, fromScript: true }));
          await delay(120);
        }
        break;

      case 'Move Down':
        for (let k = 0; k < c; k++) {
          dispatch(moveActor({ actorId: actor.id, dx: 0, dy: 1, fromScript: true }));
          await delay(180);
        }
        break;

      case 'Rotate Left':
        for (let k = 0; k < c; k++) {
          dispatch(rotateActor({ actorId: actor.id, degrees: -90, fromScript: true }));
          await delay(140);
        }
        break;

      case 'Rotate Right':
        for (let k = 0; k < c; k++) {
          dispatch(rotateActor({ actorId: actor.id, degrees: 90, fromScript: true }));
          await delay(140);
        }
        break;

      case 'Wait':
        await delay(1000 * c);
        break;

      case 'Pop':
        if (sounds?.pop) {
          try {
            await new Audio(sounds.pop).play();
          } catch {}
        }
        await delay(120);
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
          await delay(200);
        }
        break;

      case 'Shrink Size':
        for (let k = 0; k < c; k++) {
          dispatch(scaleActor({ actorId: actor.id, scale: 0.8, fromScript: true }));
          await delay(200);
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
            if (k < c - 1) await delay(200);
          }
          await delay(120);
        } else if (b?.audioURL) {
          console.log('Playing custom sound via audioURL:', b.type);
          for (let k = 0; k < c; k++) {
            await playCustomSound(b);
            if (k < c - 1) await delay(200);
          }
          await delay(120);
        }
        break;
    }

    i++;
    await delay(80);
  }
}