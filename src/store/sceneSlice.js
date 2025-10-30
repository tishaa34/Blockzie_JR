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
  image: './assets/characters/stembot.svg',
  x: CENTER_X,
  y: CENTER_Y,
  direction: 0,
  height: 5,
  scripts: [],
  size: 1,
  visible: true,
});


// Default scene
const makeDefaultScene = () => ({
  id: nanoid(),
  background: '#ffffff',
  actors: [makeDefaultstem()],
  obstacles: [],
  coloredAreas: [],
  undoStack: [],
  redoStack: [],
});


const initialState = {
  scenes: [makeDefaultScene()],
  currentSceneIndex: 0,
  simulatorRobots: [], // NEW: Simulator robots (only one at a time)
  currentSimulatorRobotIndex: 0,
  sceneUndoStack: [],
  sceneRedoStack: [],
  selectedBlockCategory: 'motion',
  categoryPanelOpen: false,
  sounds: { pop: './assets/sounds/pop.mp3' },
  backgroundGallery: [
    './assets/backgrounds/bg1.png',
    './assets/backgrounds/bg2.png',
    './assets/backgrounds/bg3.png',
    '#ffffff', '#87CEEB', '#98FB98', '#FFB6C1', '#F0E68C',
  ],
  customSounds: [],
  showHumanDetection: false,
  globalCameraState: 'off',
  videoOpacity: 100,
  // NEW: selected simulator robot id for editing scripts
  selectedSimRobotId: null,
  selectedDevice: null,
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


    // UI state - 🛤️ UPDATED: Accept 'sensors' category
    setSelectedBlockCategory(state, action) {
      const validCategories = [
        'start', 'motion', 'looks', 'sound', 'control',
        'sensors', 'device', 'humandetection', 'end',
        'otto', 'esp32'
      ];

      if (validCategories.includes(action.payload)) {
        state.selectedBlockCategory = action.payload;
      }
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
      scene.obstacles = previous.obstacles || [];
      scene.coloredAreas = previous.coloredAreas || [];
    },


    redoLastAction(state) {
      const scene = state.scenes[state.currentSceneIndex];
      if (!scene?.redoStack?.length) return;
      const next = scene.redoStack.pop();
      scene.undoStack.push(deepClone(scene));
      scene.actors = next.actors;
      scene.background = next.background;
      scene.obstacles = next.obstacles || [];
      scene.coloredAreas = next.coloredAreas || [];
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


    // Obstacles
    addObstacle(state, action) {
      const obstacle = action.payload;
      const currentScene = state.scenes[state.currentSceneIndex];
      if (currentScene) {
        if (!currentScene.obstacles) currentScene.obstacles = [];
        currentScene.obstacles.push({
          id: obstacle.id || `obstacle-${Date.now()}-${Math.random()}`,
          shape: obstacle.shape,
          x: obstacle.x || Math.floor(Math.random() * 18) + 1,
          y: obstacle.y || Math.floor(Math.random() * 15) + 1,
          ...obstacle
        });
      }
    },


    removeObstacle(state, action) {
      const obstacleId = action.payload;
      const currentScene = state.scenes[state.currentSceneIndex];
      if (currentScene && currentScene.obstacles) {
        currentScene.obstacles = currentScene.obstacles.filter(o => o.id !== obstacleId);
      }
    },


    moveObstacle(state, action) {
      const { id, x, y } = action.payload;
      const currentScene = state.scenes[state.currentSceneIndex];
      if (currentScene && currentScene.obstacles) {
        const obstacle = currentScene.obstacles.find(o => o.id === id);
        if (obstacle) {
          obstacle.x = x;
          obstacle.y = y;
        }
      }
    },


    // Colored areas (non-blocking)
    addColoredArea(state, action) {
      const coloredArea = action.payload;
      const currentScene = state.scenes[state.currentSceneIndex];
      if (currentScene) {
        if (!currentScene.coloredAreas) currentScene.coloredAreas = [];
        currentScene.coloredAreas.push({
          id: coloredArea.id || `coloredArea-${Date.now()}-${Math.random()}`,
          color: coloredArea.color || '#ffeb3b',
          x: coloredArea.x || Math.floor(Math.random() * 18) + 1,
          y: coloredArea.y || Math.floor(Math.random() * 15) + 1,
          width: coloredArea.width || 60,
          height: coloredArea.height || 60,
          type: 'coloredArea',
          blocking: false
        });
      }
    },


    removeColoredArea(state, action) {
      const coloredAreaId = action.payload;
      const currentScene = state.scenes[state.currentSceneIndex];
      if (currentScene && currentScene.coloredAreas) {
        currentScene.coloredAreas = currentScene.coloredAreas.filter(c => c.id !== coloredAreaId);
      }
    },


    moveColoredArea(state, action) {
      const { id, x, y } = action.payload;
      const currentScene = state.scenes[state.currentSceneIndex];
      if (currentScene && currentScene.coloredAreas) {
        const coloredArea = currentScene.coloredAreas.find(c => c.id === id);
        if (coloredArea) {
          coloredArea.x = x;
          coloredArea.y = y;
        }
      }
    },


    // Actors (stage)
    addActor(state, action) {
      const scene = state.scenes[state.currentSceneIndex];
      if (!scene) return;


      scene.undoStack.push(deepClone(scene));
      scene.redoStack = [];


      const {
        id, name, image, x, y, direction = 0, width, height, scripts,
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
        visible: true,
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
      const { actorId, dx, dy, fromScript, resetPosition } = action.payload;
      const scene = state.scenes[state.currentSceneIndex];
      if (!scene) return;

      const actor = scene.actors.find(a => a.id === actorId);
      if (!actor) return;

      if (!fromScript) {
        scene.undoStack.push(deepClone(scene));
        scene.redoStack = [];
      }

      // If "Go Home" requested → reset position
      if (resetPosition) {
        // Store original position if not already saved
        if (!actor.originalPosition) {
          actor.originalPosition = { x: CENTER_X, y: CENTER_Y }; // fallback default
        }

        actor.x = actor.originalPosition.x;
        actor.y = actor.originalPosition.y;
        return;
      }

      // Normal move
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


    scaleActor(state, action) {
      const { actorId, scale, fromScript, reset } = action.payload;
      const scene = state.scenes[state.currentSceneIndex];
      if (!scene) return;

      const actor = scene.actors.find(a => a.id === actorId);
      if (!actor) return;

      if (!fromScript) {
        scene.undoStack.push(deepClone(scene));
        scene.redoStack = [];
      }

      const minSize = 0.5;
      const maxSize = 4.0;

      if (reset) {
        // Reset to original size
        actor.size = 1;
      } else {
        // Normal grow/shrink scaling
        const newSize = (actor.size || 1) * scale;
        actor.size = Math.min(Math.max(newSize, minSize), maxSize);
      }
    },

    resetActorSize(state, action) {
      const { actorId, fromScript } = action.payload;
      const scene = state.scenes[state.currentSceneIndex];
      if (!scene) return;


      const actor = scene.actors.find(a => a.id === actorId);
      if (!actor) return;


      if (!fromScript) {
        scene.undoStack.push(deepClone(scene));
        scene.redoStack = [];
      }


      actor.size = 1;
    },


    disappearActor(state, action) {
      const scene = state.scenes[state.currentSceneIndex];
      if (!scene) return;


      const actor = scene.actors.find((a) => a.id === action.payload.actorId);
      if (actor) {
        actor.visible = false;
      }
    },


    reappearActor(state, action) {
      const scene = state.scenes[state.currentSceneIndex];
      if (!scene) return;


      const actor = scene.actors.find((a) => a.id === action.payload.actorId);
      if (actor) {
        actor.visible = true;
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


    cycleNextBackground(state) {
      const scene = state.scenes[state.currentSceneIndex];
      if (!scene) return;


      scene.undoStack.push(deepClone(scene));
      if (scene.undoStack.length > 20) scene.undoStack.shift();
      scene.redoStack = [];


      const gallery = state.backgroundGallery;
      const currentBg = scene.background;


      let currentIndex = gallery.findIndex(bg => bg === currentBg);
      if (currentIndex === -1) currentIndex = -1;


      const nextIndex = (currentIndex + 1) % gallery.length;
      scene.background = gallery[nextIndex];
    },


    // Scripts (stage) - 🛤️ UPDATED: Handle sensors category blocks
    addBlockToScript(state, action) {
      const { actorId, block } = action.payload;
      const scene = state.scenes[state.currentSceneIndex];
      const actor = scene?.actors.find(a => a.id === actorId);
      if (!actor) return;


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
        soundData: block.soundData || null,
        audioURL: block.soundData?.audioURL || null,
        lowFrequency: block.type === 'obstacle_sound' ? (block.lowFrequency ?? 1) : undefined,
        highFrequency: block.type === 'obstacle_sound' ? (block.highFrequency ?? 99) : undefined,
        // 🛤️ ADDED: Handle path following block properties
        pathColor: block.pathColor || (block.type === 'setPathColor' ? '#000000' : undefined),
        maxSteps: block.maxSteps || (block.type === 'followPath' ? 50 : undefined),
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
      const { actorId, blockId, newCount, property = 'count' } = action.payload;
      const scene = state.scenes[state.currentSceneIndex];
      const actor = scene?.actors.find(a => a.id === actorId);
      if (!actor) return;


      const block = actor.scripts.find(b => b.id === blockId);
      if (block) {
        block[property] = Math.min(Math.max(0, newCount), 100);
      }
    },


    updateObstacleFrequency(state, action) {
      const { actorId, blockId, lowFrequency, highFrequency } = action.payload;
      const scene = state.scenes[state.currentSceneIndex];
      const actor = scene?.actors.find(a => a.id === actorId);
      if (!actor) return;


      const block = actor.scripts.find(b => b.id === blockId);
      if (block) {
        if (lowFrequency !== undefined) {
          block.lowFrequency = Math.min(Math.max(1, lowFrequency), 99);
        }
        if (highFrequency !== undefined) {
          block.highFrequency = Math.min(Math.max(1, highFrequency), 99);
        }
      }
    },


    updateCameraState(state, action) {
      const { actorId, blockId, cameraState } = action.payload;
      const scene = state.scenes[state.currentSceneIndex];
      const actor = scene.actors.find(a => a.id === actorId);
      if (actor) {
        const block = actor.scripts.find(b => b.id === blockId);
        if (block) {
          block.cameraState = cameraState;
        }
      }
    },


    setCameraState(state, action) {
      state.globalCameraState = action.payload;
    },

    setSelectedDevice(state, action) {
      state.selectedDevice = action.payload;
    },

    // Custom sounds
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


      if (state.customSounds.length > 10) {
        const removedSound = state.customSounds.shift();
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
        if (removedSound.audioURL) {
          URL.revokeObjectURL(removedSound.audioURL);
        }
        state.customSounds.splice(soundIndex, 1);
      }
    },


    clearAllCustomSounds(state) {
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
      if (sound) sound.name = newName;
    },


    setShowHumanDetection(state, action) {
      state.showHumanDetection = action.payload;
    },


    syncActorsWithFaces(state, action) {
      const faceCount = action.payload;
      const scene = state.scenes[state.currentSceneIndex];
      if (!scene) return;


      const currentActorCount = scene.actors.length;


      if (faceCount > currentActorCount) {
        for (let i = 0; i < faceCount - currentActorCount; i++) {
          scene.actors.push(makeDefaultstem());
        }
      } else if (faceCount < currentActorCount) {
        for (let i = 0; i < currentActorCount - faceCount && scene.actors.length > 1; i++) {
          scene.actors.pop();
        }
      }
    },


    setVideoOpacity(state, action) {
      state.videoOpacity = Math.min(Math.max(0, action.payload), 100);
    },


    // NEW: Simulator robot management
    addSimulatorRobot(state, action) {
      const robot = action.payload || {};
      state.simulatorRobots.push({
        id: robot.id || `simRobot-${Date.now()}-${Math.random()}`,
        name: robot.name || 'Robot',
        image: robot.image || './assets/characters/stembot.svg',
        x: Number.isFinite(robot.x) ? robot.x : Math.floor(Math.random() * 18) + 1,
        y: Number.isFinite(robot.y) ? robot.y : Math.floor(Math.random() * 15) + 1,
        direction: robot.direction || 0,
        size: robot.size || 1,
        // IMPORTANT: robot keeps its own scripts (independent from stage actors)
        scripts: robot.scripts ? deepClone(robot.scripts) : [],
        visible: true,
        type: 'simulatorRobot'
      });
    },


    removeSimulatorRobot(state, action) {
      const robotId = action.payload;
      state.simulatorRobots = state.simulatorRobots.filter(r => r.id !== robotId);
      // If the removed robot was selected for editing, clear selection
      if (state.selectedSimRobotId === robotId) state.selectedSimRobotId = null;
    },


    moveSimulatorRobot(state, action) {
      const { id, x, y, direction } = action.payload;
      const robot = state.simulatorRobots.find(r => r.id === id);
      if (robot) {
        robot.x = Math.max(0, Math.min(x, GRID_WIDTH - 1));
        robot.y = Math.max(0, Math.min(y, GRID_HEIGHT - 1));
        if (direction !== undefined && direction !== null) {
          robot.direction = direction;
        }
      }
    },


    // NEW: Simulator robot movement from scripts
    moveSimulatorRobotFromScript: (state, action) => {
      const { robotId, x, y, direction } = action.payload;
      const robotIndex = state.simulatorRobots.findIndex(robot => robot.id === robotId);


      if (robotIndex !== -1) {
        console.log(`📦 REDUX: Moving simulator robot from (${state.simulatorRobots[robotIndex].x}, ${state.simulatorRobots[robotIndex].y}) to (${x}, ${y})`);


        state.simulatorRobots[robotIndex].x = x;
        state.simulatorRobots[robotIndex].y = y;


        if (direction !== undefined) {
          state.simulatorRobots[robotIndex].direction = direction;
        }


        console.log(`📦 REDUX: Robot moved successfully to (${x}, ${y})`);
      } else {
        console.error(`📦 REDUX ERROR: Robot ${robotId} not found`);
      }
    }
    ,


    rotateSimulatorRobotFromScript(state, action) {
      const { robotId, degrees } = action.payload;
      const robot = state.simulatorRobots.find(r => r.id === robotId);
      if (robot) {
        let newDir = (robot.direction + degrees) % 360;
        if (newDir < 0) newDir += 360;
        robot.direction = newDir;
        // console.log(`🤖 Robot ${robotId} rotated to ${robot.direction}°`);
      }
    },


    scaleSimulatorRobotFromScript(state, action) {
      const { robotId, scale } = action.payload;
      const robot = state.simulatorRobots.find(r => r.id === robotId);
      if (robot) {
        const newSize = (robot.size || 1) * scale;
        robot.size = Math.min(Math.max(0.5, newSize), 4.0);
        // console.log(`🤖 Robot ${robotId} scaled to ${robot.size}`);
      }
    },


    disappearSimulatorRobot(state, action) {
      const { robotId } = action.payload;
      const robot = state.simulatorRobots.find(r => r.id === robotId);
      if (robot) {
        robot.visible = false;
        // console.log(`🤖 Robot ${robotId} disappeared`);
      }
    },


    reappearSimulatorRobot(state, action) {
      const { robotId } = action.payload;
      const robot = state.simulatorRobots.find(r => r.id === robotId);
      if (robot) {
        robot.visible = true;
        // console.log(`🤖 Robot ${robotId} reappeared`);
      }
    },


    // NEW: Reducers to manage simulator robot scripts (editor) - 🛤️ UPDATED: Handle sensors category
    addBlockToSimulatorScript(state, action) {
      // payload: { robotId, block, index? }
      const { robotId, block } = action.payload;
      const robot = state.simulatorRobots.find(r => r.id === robotId);
      if (!robot) return;


      if (block.category === 'start') {
        robot.scripts = robot.scripts.filter(b => b.category !== 'start');
      }


      if (block.category === 'end') {
        robot.scripts = robot.scripts.filter(b => b.category !== 'end');
      }


      const newBlock = {
        id: nanoid(),
        type: block.name,
        ...block,
        steps: block.category === 'move' ? (block.steps ?? 10) : undefined,
        angle: block.category === 'turn' ? (block.angle ?? 90) : undefined,
        duration: block.category === 'wait' ? (block.duration ?? 1000) : undefined,
        soundData: block.soundData || null,
        audioURL: block.soundData?.audioURL || null,
        lowFrequency: block.type === 'obstacle_sound' ? (block.lowFrequency ?? 1) : undefined,
        highFrequency: block.type === 'obstacle_sound' ? (block.highFrequency ?? 99) : undefined,
        // 🛤️ ADDED: Handle path following block properties for simulator robots too
        pathColor: block.pathColor || (block.type === 'setPathColor' ? '#000000' : undefined),
        maxSteps: block.maxSteps || (block.type === 'followPath' ? 50 : undefined),
      };


      if (block.category === 'start') {
        robot.scripts.unshift(newBlock);
      } else if (block.category === 'end') {
        robot.scripts.push(newBlock);
      } else {
        const startIndex = robot.scripts.findIndex(b => b.category === 'start');
        const endIndex = robot.scripts.findIndex(b => b.category === 'end');


        if (startIndex !== -1 && endIndex !== -1) {
          robot.scripts.splice(endIndex, 0, newBlock);
        } else {
          robot.scripts.push(newBlock);
        }
      }
    },


    clearSimulatorScript(state, action) {
      const robotId = action.payload.robotId;
      const robot = state.simulatorRobots.find(r => r.id === robotId);
      if (!robot) return;


      // Note: no per-robot undo handled here to keep changes minimal
      robot.scripts = [];
    },


    updateSimulatorBlockCount(state, action) {
      const { robotId, blockId, newCount, property = 'count' } = action.payload;
      const robot = state.simulatorRobots.find(r => r.id === robotId);
      if (!robot) return;


      const block = robot.scripts.find(b => b.id === blockId);
      if (block) {
        block[property] = Math.min(Math.max(0, newCount), 100);
      }
    },


    // REPLACE this reducer in your sceneSlice.js:
    cycleSimulatorRobot(state) {
      const library = [
        { name: 'Stembot', image: './assets/characters/stembot.svg' },
        { name: 'EdisonV3 Car', image: './assets/characters/edisonv3.jpg' },
        { name: 'Robot Dog', image: './assets/characters/calliope2016.jpg' },
        { name: 'Robot Car', image: './assets/characters/robotino.jpg' },
        // Add more robot types as needed 
      ];


      // Preserve position & direction from the previous robot if any
      const prevRobot = state.simulatorRobots[0];
      const prevX = prevRobot?.x ?? Math.floor(Math.random() * 18) + 1;
      const prevY = prevRobot?.y ?? Math.floor(Math.random() * 15) + 1;
      const prevDir = prevRobot?.direction ?? 0;
      const prevSize = prevRobot?.size ?? 1;


      // CLEAR existing robots first (only one robot allowed)
      state.simulatorRobots = [];


      state.currentSimulatorRobotIndex =
        (state.currentSimulatorRobotIndex + 1) % library.length;


      const scene = state.scenes[state.currentSceneIndex];


      // DON'T copy stage actor scripts — keep simulator robots independent.
      const next = library[state.currentSimulatorRobotIndex];


      // ADD only one robot (replacing any previous robot) with its own empty scripts
      state.simulatorRobots.push({
        id: `simRobot-${Date.now()}-${Math.random()}`,
        name: next.name,
        image: next.image,
        x: prevX,               // preserve old x
        y: prevY,               // preserve old y
        direction: prevDir,     // preserve direction
        size: prevSize,         // preserve size
        scripts: [],            // important: empty scripts by default (independent)
        visible: true,
        type: 'simulatorRobot'
      });


      // if previously selected robot existed, update selection to the new robot
      state.selectedSimRobotId = state.simulatorRobots[0]?.id ?? null;
    },


    // allow externally setting selected sim robot for editing
    setSelectedSimRobot(state, action) {
      state.selectedSimRobotId = action.payload ?? null;
    },


    overwrite(state, action) {
      const newState = action.payload;
      state.scenes = newState.scenes || [makeDefaultScene()];
      state.currentSceneIndex = newState.currentSceneIndex || 0;
      state.sceneUndoStack = newState.sceneUndoStack || [];
      state.sceneRedoStack = newState.sceneRedoStack || [];
      state.selectedBlockCategory = newState.selectedBlockCategory || 'motion';
      state.categoryPanelOpen = newState.categoryPanelOpen || false;
      state.sounds = newState.sounds || { pop: './assets/sounds/pop.mp3' };
      state.backgroundGallery = newState.backgroundGallery || [
        './assets/backgrounds/bg1.png',
        './assets/backgrounds/bg2.png',
        './assets/backgrounds/bg3.png',
        '#ffffff', '#87CEEB', '#98FB98', '#FFB6C1', '#F0E68C'
      ];
      state.customSounds = newState.customSounds || [];
      state.videoOpacity = newState.videoOpacity !== undefined ? newState.videoOpacity : 100;


      // NEW: restore simulator robots if present
      state.simulatorRobots = newState.simulatorRobots || [];
      state.currentSimulatorRobotIndex = newState.currentSimulatorRobotIndex || 0;


      // restore selected sim robot id if present
      state.selectedSimRobotId = newState.selectedSimRobotId ?? null;
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
  cycleNextBackground,
  addBlockToScript,
  clearScript,
  updateBlockCount,
  updateObstacleFrequency,
  addCustomSound,
  removeCustomSound,
  clearAllCustomSounds,
  updateCustomSoundName,
  setShowHumanDetection,
  setVideoOpacity,
  syncActorsWithFaces,
  overwrite,
  setCameraState,
  addObstacle,
  removeObstacle,
  moveObstacle,
  addColoredArea,
  removeColoredArea,
  moveColoredArea,
  // Simulator robot actions
  addSimulatorRobot,
  removeSimulatorRobot,
  moveSimulatorRobot,
  cycleSimulatorRobot,
  // NEW: Script movement actions
  moveSimulatorRobotFromScript,
  rotateSimulatorRobotFromScript,
  scaleSimulatorRobotFromScript,
  disappearSimulatorRobot,
  reappearSimulatorRobot,
  // NEW: Simulator script editors
  addBlockToSimulatorScript,
  clearSimulatorScript,
  updateSimulatorBlockCount,
  // NEW: selection
  setSelectedSimRobot,
  setSelectedDevice,
} = sceneSlice.actions;


export default sceneSlice.reducer;
// ========== Open Roberta JSON compatibility (non-breaking additions) ==========
// These helpers DO NOT modify existing reducers or UI. They are pure helpers
// and optional thunks that operate on the existing scene state and actions.

//
// Coordinate normalization helpers (grid cells <-> unit [0..1])
//
const __ORL_GRID_W__ = typeof GRID_WIDTH === 'number' ? GRID_WIDTH : 20;
const __ORL_GRID_H__ = typeof GRID_HEIGHT === 'number' ? GRID_HEIGHT : 15;

const __toUnit__ = (v, max) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n / max));
};

const __fromUnit__ = (v, max) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.max(0, Math.min(1, n)) * max);
};

//
// Build Open Roberta Lab simulation configuration (NEPOprog-sim_configuration.json style)
// Structure:
// {
//   robotPoses: [ [ { x, y, theta }, ... ] ],
//   obstacles: [ { x, y, w, h, theta, color, form, type } ],
//   colorAreas: [ ... ],
//   marker: [ ... ]
// }
//
export function toOpenRobertaSimConfig(sceneSliceState) {
  try {
    const currentScene = sceneSliceState?.scenes?.[sceneSliceState?.currentSceneIndex] || {};
    const robots = sceneSliceState?.simulatorRobots || [];

    // robotPoses: one inner array per scene; here we export the current scene’s robots
    const robotPosesInner = robots.map(r => ({
      x: __toUnit__(r?.x ?? 0, __ORL_GRID_W__),
      y: __toUnit__(r?.y ?? 0, __ORL_GRID_H__),
      theta: Number.isFinite(r?.direction) ? r.direction : 0
    }));

    // obstacles: normalize coords and sizes; accept w/h or width/height
    const obstacles = (currentScene?.obstacles || []).map(obs => {
      const wCells = Number.isFinite(obs?.w) ? obs.w
        : (Number.isFinite(obs?.width) ? obs.width : 1);
      const hCells = Number.isFinite(obs?.h) ? obs.h
        : (Number.isFinite(obs?.height) ? obs.height : 1);

      return {
        x: __toUnit__(obs?.x ?? 0, __ORL_GRID_W__),
        y: __toUnit__(obs?.y ?? 0, __ORL_GRID_H__),
        w: __toUnit__(wCells, __ORL_GRID_W__),
        h: __toUnit__(hCells, __ORL_GRID_H__),
        theta: Number.isFinite(obs?.theta) ? obs.theta : (Number.isFinite(obs?.rotation) ? obs.rotation : 0),
        color: obs?.color || '#33B8CA',
        form: obs?.form || obs?.shape || 'RECTANGLE',
        type: obs?.type || 'OBSTACLE'
      };
    });

    // colorAreas -> optional; normalize best-effort; defaults if sizes are missing
    const colorAreas = (currentScene?.coloredAreas || []).map(area => {
      const wCells = Number.isFinite(area?.w) ? area.w
        : (Number.isFinite(area?.width) ? area.width : 1);
      const hCells = Number.isFinite(area?.h) ? area.h
        : (Number.isFinite(area?.height) ? area.height : 1);
      return {
        x: __toUnit__(area?.x ?? 0, __ORL_GRID_W__),
        y: __toUnit__(area?.y ?? 0, __ORL_GRID_H__),
        w: __toUnit__(wCells, __ORL_GRID_W__),
        h: __toUnit__(hCells, __ORL_GRID_H__),
        color: area?.color || '#000000',
        type: area?.type || 'COLOR_AREA'
      };
    });

    // marker: keep empty unless used
    const marker = [];

    return {
      robotPoses: [robotPosesInner],
      obstacles,
      colorAreas,
      marker
    };
  } catch (e) {
    console.error('toOpenRobertaSimConfig error:', e);
    return { robotPoses: [[]], obstacles: [], colorAreas: [], marker: [] };
  }
}

/**
 * Thunk: Apply an Open Roberta-style config back into current scene using existing actions.
 * - Adds/overwrites obstacles using addObstacle (non-destructive to existing UI).
 * - Positions first simulator robot (creates one if none) to the first pose.
 * This is optional and does not change any existing reducers or UI code.
 */
export const applyOpenRobertaSimConfigThunk = (openRobertaConfig) => (dispatch, getState) => {
  try {
    if (!openRobertaConfig || typeof openRobertaConfig !== 'object') return;

    const state = getState();
    const sceneState = state?.scene;
    if (!sceneState) return;

    const gridW = __ORL_GRID_W__;
    const gridH = __ORL_GRID_H__;

    // 1) Obstacles
    const obs = Array.isArray(openRobertaConfig.obstacles) ? openRobertaConfig.obstacles : [];
    for (const o of obs) {
      const cellX = __fromUnit__(o?.x ?? 0, gridW);
      const cellY = __fromUnit__(o?.y ?? 0, gridH);
      const cellW = Math.max(1, __fromUnit__(o?.w ?? 0, gridW));
      const cellH = Math.max(1, __fromUnit__(o?.h ?? 0, gridH));

      dispatch(addObstacle({
        id: `orl-${Date.now()}-${Math.random()}`,
        x: cellX,
        y: cellY,
        w: cellW,
        h: cellH,
        theta: Number.isFinite(o?.theta) ? o.theta : 0,
        rotation: Number.isFinite(o?.theta) ? o.theta : 0,
        color: o?.color || '#33B8CA',
        shape: o?.form || 'RECTANGLE',
        form: o?.form || 'RECTANGLE',
        type: o?.type || 'OBSTACLE'
      }));
    }

    // 2) Color areas (optional)
    const areas = Array.isArray(openRobertaConfig.colorAreas) ? openRobertaConfig.colorAreas : [];
    for (const a of areas) {
      const cellX = __fromUnit__(a?.x ?? 0, gridW);
      const cellY = __fromUnit__(a?.y ?? 0, gridH);
      const cellW = Math.max(1, __fromUnit__(a?.w ?? 0, gridW));
      const cellH = Math.max(1, __fromUnit__(a?.h ?? 0, gridH));

      dispatch(addColoredArea({
        id: `orl-color-${Date.now()}-${Math.random()}`,
        x: cellX,
        y: cellY,
        width: cellW,
        height: cellH,
        color: a?.color || '#000000',
        type: 'coloredArea',
        blocking: false
      }));
    }

    // 3) Robot pose (first only by convention)
    const firstPose = Array.isArray(openRobertaConfig.robotPoses)
      && Array.isArray(openRobertaConfig.robotPoses[0])
      && openRobertaConfig.robotPoses[0][0]
      ? openRobertaConfig.robotPoses[0][0]
      : null;

    if (firstPose) {
      const posX = __fromUnit__(firstPose.x ?? 0, gridW);
      const posY = __fromUnit__(firstPose.y ?? 0, gridH);
      const theta = Number.isFinite(firstPose.theta) ? firstPose.theta : 0;

      const currentRobots = sceneState.simulatorRobots || [];
      if (currentRobots.length === 0) {
        dispatch(addSimulatorRobot({
          name: 'Robot',
          x: posX,
          y: posY,
          direction: theta,
          image: './assets/characters/stembot.svg'
        }));
      } else {
        dispatch(moveSimulatorRobot({
          id: currentRobots[0].id,
          x: posX,
          y: posY,
          direction: theta
        }));
      }
    }
  } catch (e) {
    console.error('applyOpenRobertaSimConfigThunk error:', e);
  }
};
