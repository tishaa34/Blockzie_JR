import { createSlice, nanoid } from '@reduxjs/toolkit';

// Grid constants must match Stage.js
const GRID_WIDTH = 20;
const GRID_HEIGHT = 15;
// Center indices are integer grid cells (Stage places at (x+0.5, y+0.5) cells)
const CENTER_X = Math.floor(GRID_WIDTH / 2);
const CENTER_Y = Math.floor(GRID_HEIGHT / 2);

// Default starter actor
const makeDefaultstem = () => ({
  id: nanoid(),
  name: 'Stembot',
  image: '/assets/characters/stembot.svg',
  x: CENTER_X,
  y: CENTER_Y,
  direction: 0,
  height: 5,
  scripts: [],
  size:1,
  visible: true,
});

// Default scene
const makeDefaultScene = () => ({
  id: nanoid(),
  background: '#ffffff',
  actors: [makeDefaultstem()],
  undoStack: [],
  redoStack: [],
});

const initialState = {
  scenes: [makeDefaultScene()],
  currentSceneIndex: 0,

  // Global scene-level undo/redo (switch, remove scene, etc.)
  sceneUndoStack: [],
  sceneRedoStack: [],

  // Block palette UI state
  selectedBlockCategory: 'motion',
  categoryPanelOpen: false,

  // Assets (optional)
  sounds: { pop: '/assets/sounds/pop.mp3' },
  backgroundGallery: [
    '/assets/backgrounds/bg1.png',
    '/assets/backgrounds/bg2.png',
    '/assets/backgrounds/bg3.png',
    '#ffffff', '#87CEEB', '#98FB98', '#FFB6C1', '#F0E68C',
  ],
  customSounds: [], // Array to store custom recorded sounds
};

// Safe deep clone for undo
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

const sceneSlice = createSlice({
  name: 'scene',
  initialState,
  reducers: {
    // Global scene (array) undo/redo
    pushSceneUndoState(state) {
      state.sceneUndoStack.push({
        scenes: deepClone(state.scenes),
        currentSceneIndex: state.currentSceneIndex,
      });
      if (state.sceneUndoStack.length > 20) state.sceneUndoStack.shift();
      state.sceneRedoStack = [];
    },
    undoSceneAction(state) {
      if (!state.sceneUndoStack.length) return;
      const prev = state.sceneUndoStack.pop();
      state.sceneRedoStack.push({
        scenes: deepClone(state.scenes),
        currentSceneIndex: state.currentSceneIndex,
      });
      state.scenes = prev.scenes;
      state.currentSceneIndex = prev.currentSceneIndex;
    },
    redoSceneAction(state) {
      if (!state.sceneRedoStack.length) return;
      const next = state.sceneRedoStack.pop();
      state.sceneUndoStack.push({
        scenes: deepClone(state.scenes),
        currentSceneIndex: state.currentSceneIndex,
      });
      state.scenes = next.scenes;
      state.currentSceneIndex = next.currentSceneIndex;
    },

    // UI state
    setSelectedBlockCategory(state, action) {
      state.selectedBlockCategory = action.payload;
    },
    toggleCategoryPanel(state) {
      state.categoryPanelOpen = !state.categoryPanelOpen;
    },

    // Per-scene undo/redo (actors/background changes)
    pushUndoState(state) {
      const scene = state.scenes[state.currentSceneIndex];
      if (!scene) return;
      scene.undoStack.push(deepClone(scene));
      if (scene.undoStack.length > 20) scene.undoStack.shift();
      scene.redoStack = [];
    },
    undoLastAction(state) {
      const scene = state.scenes[state.currentSceneIndex];
      if (!scene?.undoStack?.length) return;
      const previous = scene.undoStack.pop();
      scene.redoStack.push(deepClone(scene));
      scene.actors = previous.actors;
      scene.background = previous.background;
    },
    redoLastAction(state) {
      const scene = state.scenes[state.currentSceneIndex];
      if (!scene?.redoStack?.length) return;
      const next = scene.redoStack.pop();
      scene.undoStack.push(deepClone(scene));
      scene.actors = next.actors;
      scene.background = next.background;
    },

    // Scene CRUD
    addScene(state) {
      state.scenes.push(makeDefaultScene());
      state.currentSceneIndex = state.scenes.length - 1;
    },
    removeScene(state, action) {
      const idx = action.payload;
      if (state.scenes.length <= 1) return;
      if (idx < 0 || idx >= state.scenes.length) return;
      state.sceneUndoStack.push({
        scenes: deepClone(state.scenes),
        currentSceneIndex: state.currentSceneIndex,
      });
      state.sceneRedoStack = [];
      state.scenes.splice(idx, 1);
      if (state.currentSceneIndex >= state.scenes.length) {
        state.currentSceneIndex = state.scenes.length - 1;
      } else if (state.currentSceneIndex > idx) {
        state.currentSceneIndex--;
      }
    },
    switchScene(state, action) {
      const idx = action.payload;
      if (idx >= 0 && idx < state.scenes.length) {
        state.currentSceneIndex = idx;
      }
    },

    // Actors
    addActor(state, action) {
      const scene = state.scenes[state.currentSceneIndex];
      if (!scene) return;

      // Push per-scene undo
      scene.undoStack.push(deepClone(scene));
      scene.redoStack = [];

      const {
        id,
        name,
        image,
        x,
        y,
        direction = 0,
        width,
        height,
        scripts,
      } = action.payload || {};

      const actor = {
        id: id ?? nanoid(),
        name: name ?? 'Actor',
        image: image ?? '',
        x: Number.isFinite(x) ? x : CENTER_X,
        y: Number.isFinite(y) ? y : CENTER_Y,
        direction,
        width,
        height,
        scripts: scripts ?? [],
        visible:true
      };

      scene.actors.push(actor);
    },

    removeActor(state, action) {
      const scene = state.scenes[state.currentSceneIndex];
      if (!scene) return;
      if (scene.actors.length <= 1) return;

      scene.undoStack.push(deepClone(scene));
      scene.redoStack = [];

      const targetId = action.payload.actorId;
      scene.actors = scene.actors.filter(a => a.id !== targetId);
    },

    moveActor(state, action) {
      const { actorId, dx, dy, fromScript } = action.payload;
      const scene = state.scenes[state.currentSceneIndex];
      if (!scene) return;
      const actor = scene.actors.find(a => a.id === actorId);
      if (!actor) return;

      if (!fromScript) {
        scene.undoStack.push(deepClone(scene));
        scene.redoStack = [];
      }

      actor.x = Math.min(Math.max(0, actor.x + dx), GRID_WIDTH - 1);
      actor.y = Math.min(Math.max(0, actor.y + dy), GRID_HEIGHT - 1);
    },

    rotateActor(state, action) {
      const { actorId, degrees, fromScript } = action.payload;
      const scene = state.scenes[state.currentSceneIndex];
      if (!scene) return;
      const actor = scene.actors.find(a => a.id === actorId);
      if (!actor) return;

      if (!fromScript) {
        scene.undoStack.push(deepClone(scene));
        scene.redoStack = [];
      }

      let newDir = (actor.direction + degrees) % 360;
      if (newDir < 0) newDir += 360;
      actor.direction = newDir;
    },

    scaleActor: (state, action) => {
      const { actorId, scale, fromScript } = action.payload;
      const scene = state.scenes[state.currentSceneIndex];
      if (!scene) return; // ✅ prevent undefined scene
      const actor = scene.actors.find(a => a.id === actorId);
      if (!actor) return; // ✅ prevent crash if actor not found

      if (!fromScript) {
        scene.undoStack.push(deepClone(scene));
        scene.redoStack = [];
      }

      // default size = 1
      const newSize = (actor.size || 1) * scale;

      // ✅ clamp size between 0.5x and 3x
      const minSize = 0.5;
      const maxSize = 4.0;
      actor.size = Math.min(Math.max(newSize, minSize), maxSize);
    },

    resetActorSize: (state, action) => {
      const { actorId, fromScript } = action.payload;
      const scene = state.scenes[state.currentSceneIndex];
      if (!scene) return;
      const actor = scene.actors.find(a => a.id === actorId);
      if (!actor) return;

      if (!fromScript) {
        scene.undoStack.push(deepClone(scene));
        scene.redoStack = [];
      }

      actor.size = 1; // ✅ reset to default size
    },
    disappearActor: (state, action) => {
      const scene = state.scenes[state.currentSceneIndex];
      if (!scene) return;
      const actor = scene.actors.find((a) => a.id === action.payload.actorId);
      if (actor) {
        actor.visible = false;  // ✅ hide actor
      }
    },

    reappearActor: (state, action) => {
      const scene = state.scenes[state.currentSceneIndex];
      if (!scene) return;
      const actor = scene.actors.find((a) => a.id === action.payload.actorId);
      if (actor) {
        actor.visible = true;   // ✅ show actor again
      }
    },


    // Background
    setBackground(state, action) {
      const scene = state.scenes[state.currentSceneIndex];
      if (scene) {
        scene.background = action.payload;
      }
    },
    addBackgroundToGallery(state, action) {
      const url = action.payload;
      if (!state.backgroundGallery.includes(url)) {
        state.backgroundGallery.push(url);
      }
    },
    removeBackgroundFromGallery(state, action) {
      state.backgroundGallery = state.backgroundGallery.filter(bg => bg !== action.payload);
    },

    // Scripts - Updated to handle custom sounds
    addBlockToScript(state, action) {
      const { actorId, block } = action.payload;
      const scene = state.scenes[state.currentSceneIndex];
      const actor = scene?.actors.find(a => a.id === actorId);
      if (!actor) return;

      // Ensure only one start and one end
      if (block.category === 'start') {
        actor.scripts = actor.scripts.filter(b => b.category !== 'start');
      }
      if (block.category === 'end') {
        actor.scripts = actor.scripts.filter(b => b.category !== 'end');
      }

      const newBlock = {
        id: nanoid(),
        type: block.name,
        ...block,
        steps: block.category === 'move' ? (block.steps ?? 10) : undefined,
        angle: block.category === 'turn' ? (block.angle ?? 90) : undefined,
        duration: block.category === 'wait' ? (block.duration ?? 1000) : undefined,
        // Add custom sound data if it's a custom sound block
        soundData: block.soundData || null,
        audioURL: block.soundData?.audioURL || null,
      };

      if (block.category === 'start') {
        actor.scripts.unshift(newBlock);
      } else if (block.category === 'end') {
        actor.scripts.push(newBlock);
      } else {
        const startIndex = actor.scripts.findIndex(b => b.category === 'start');
        const endIndex = actor.scripts.findIndex(b => b.category === 'end');
        if (startIndex !== -1 && endIndex !== -1) {
          actor.scripts.splice(endIndex, 0, newBlock);
        } else {
          actor.scripts.push(newBlock);
        }
      }
    },

    clearScript(state, action) {
      const scene = state.scenes[state.currentSceneIndex];
      const actor = scene?.actors.find(a => a.id === action.payload.actorId);
      if (!actor) return;
      scene.undoStack.push(deepClone(scene));
      scene.redoStack = [];
      actor.scripts = [];
    },

    updateBlockCount(state, action) {
      const { actorId, blockId, newCount } = action.payload;
      const scene = state.scenes[state.currentSceneIndex];
      const actor = scene?.actors.find(a => a.id === actorId);
      if (!actor) return;
      const block = actor.scripts.find(b => b.id === blockId);
      if (block) {
        block.count = Math.min(Math.max(1, newCount), 99);
      }
    },

    // Custom Sound Management - NEW REDUCERS
    addCustomSound(state, action) {
      const customSound = {
        id: action.payload.id || nanoid(),
        name: action.payload.name,
        audioURL: action.payload.audioURL,
        audioBlob: action.payload.audioBlob,
        type: 'custom',
        createdAt: Date.now(),
      };
      
      state.customSounds.push(customSound);
      
      // Limit to 10 custom sounds to prevent memory issues
      if (state.customSounds.length > 10) {
        const removedSound = state.customSounds.shift();
        // Clean up object URL if it exists
        if (removedSound.audioURL) {
          URL.revokeObjectURL(removedSound.audioURL);
        }
      }
    },

    removeCustomSound(state, action) {
      const soundId = action.payload;
      const soundIndex = state.customSounds.findIndex(sound => sound.id === soundId);
      
      if (soundIndex !== -1) {
        const removedSound = state.customSounds[soundIndex];
        // Clean up object URL
        if (removedSound.audioURL) {
          URL.revokeObjectURL(removedSound.audioURL);
        }
        state.customSounds.splice(soundIndex, 1);
      }
    },

    clearAllCustomSounds(state) {
      // Clean up all object URLs
      state.customSounds.forEach(sound => {
        if (sound.audioURL) {
          URL.revokeObjectURL(sound.audioURL);
        }
      });
      state.customSounds = [];
    },

    updateCustomSoundName(state, action) {
      const { soundId, newName } = action.payload;
      const sound = state.customSounds.find(s => s.id === soundId);
      if (sound) {
        sound.name = newName;
      }
    },

      // Add this to your reducers object in sceneSlice.js
overwrite(state, action) {
  const newState = action.payload;
  
  state.scenes = newState.scenes || [makeDefaultScene()];
  state.currentSceneIndex = newState.currentSceneIndex || 0;
  state.sceneUndoStack = newState.sceneUndoStack || [];
  state.sceneRedoStack = newState.sceneRedoStack || [];
  state.selectedBlockCategory = newState.selectedBlockCategory || 'motion';
  state.categoryPanelOpen = newState.categoryPanelOpen || false;
  state.sounds = newState.sounds || { pop: '/assets/sounds/pop.mp3' };
  state.backgroundGallery = newState.backgroundGallery || [
    '/assets/backgrounds/bg1.png',
    '/assets/backgrounds/bg2.png', 
    '/assets/backgrounds/bg3.png',
    '#ffffff', '#87CEEB', '#98FB98', '#FFB6C1', '#F0E68C'
  ];
  state.customSounds = newState.customSounds || [];
},
  },
});

export const {
  undoSceneAction,
  redoSceneAction,
  setSelectedBlockCategory,
  toggleCategoryPanel,
  pushUndoState,
  undoLastAction,
  redoLastAction,
  pushSceneUndoState,
  addScene,
  removeScene,
  scaleActor,
  resetActorSize,
  switchScene,
  addActor,
  removeActor,
  disappearActor,
  reappearActor, 
  moveActor,
  rotateActor,
  setBackground,
  addBackgroundToGallery,
  removeBackgroundFromGallery,
  addBlockToScript,
  clearScript,
  updateBlockCount,
  addCustomSound,
  removeCustomSound,
  clearAllCustomSounds,
  updateCustomSoundName,
  overwrite, 
} = sceneSlice.actions;

export default sceneSlice.reducer;
