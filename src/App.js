import React, { useEffect, useState } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import store from './store/store';
import JSZip from 'jszip';

import SceneManager from './editor/ui/SceneManager';
import Stage from './editor/ui/Stage';
import BlockPalette from './editor/blocks/Block';
import ScriptArea from './editor/ui/ScriptArea';
import CharacterGallery from './editor/ui/CharacterGallery';
import CategorySelector from './editor/ui/CategorySelector';
import Toolbar from './editor/ui/Toolbar';
import RightPanelControls from './editor/ui/RightPanelControls';
import BackgroundGallery from './editor/ui/BackgroundGallery';
import HeadingModal from './editor/ui/HeadingModal';
import SplashScreen from './editor/ui/SplashScreen';

import { clearScript } from './store/sceneSlice';

import './App.css';

const demoActors = [
  {
    id: 'actor1',
    name: 'Stembot',
    image: './assets/characters/stembot.svg',
  },
];

function BlockzieJrShell() {
  const dispatch = useDispatch();
  const { scenes, currentSceneIndex } = useSelector(s => s.scene);
  const actorIdFromScene = scenes[currentSceneIndex]?.actors?.[0]?.id;

  const [selectedActorId, setSelectedActorId] = useState(actorIdFromScene || demoActors[0]?.id);
  const [bgModalOpen, setBgModalOpen] = useState(false);
  const [heading, setHeading] = useState({ text: "", color: "#222", size: 38 });
  const [headingModalOpen, setHeadingModalOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  // Splash screen state and message
  const [showSplash, setShowSplash] = useState(true);
  const [splashMessage, setSplashMessage] = useState("Preparing, please wait...");

  useEffect(() => {
    // Show splash only for 3 seconds on initial load
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (actorIdFromScene) setSelectedActorId(actorIdFromScene);
  }, [actorIdFromScene, currentSceneIndex]);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  // Helper function to convert blob to base64 data URL (Electron-compatible)
  const blobToBase64 = (blob, filePath = '') => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        let result = reader.result;
        if (filePath.endsWith('.svg') && !result.startsWith('data:image/svg+xml')) {
          result = result.replace(/^data:.*?base64,/, 'data:image/svg+xml;base64,');
        }
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Asset management functions
  const generateAssetId = (url) => {
    return btoa(url).replace(/[/+=]/g, '').substring(0, 32);
  };

  const getFileExtension = (url) => {
    const parts = url.split('.');
    return parts[parts.length - 1] || 'svg';
  };

  const addAssetToZip = async (zip, assetUrl, assetId, extension) => {
    try {
      if (assetUrl && (assetUrl.startsWith('http') || assetUrl.startsWith('/'))) {
        const response = await fetch(assetUrl);
        if (response.ok) {
          const blob = await response.blob();
          const filename = `${assetId}.${extension}`;
          zip.file(filename, blob);
          return filename;
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch asset: ${assetUrl}`, error);
    }
    return null;
  };

  const collectProjectAssets = (projectData) => {
    const assets = new Set();

    projectData.scenes?.forEach(scene => {
      scene.actors?.forEach(actor => {
        if (actor.image && !actor.image.startsWith('data:')) {
          assets.add(actor.image);
        }
      });
    });

    projectData.backgroundGallery?.forEach(bg => {
      if (bg && typeof bg === 'string' && (bg.includes('/') || bg.includes('.')) && !bg.startsWith('data:')) {
        assets.add(bg);
      }
    });

    if (projectData.sounds) {
      Object.values(projectData.sounds).forEach(soundUrl => {
        if (soundUrl && typeof soundUrl === 'string' && (soundUrl.includes('/') || soundUrl.includes('.')) && !soundUrl.startsWith('data:')) {
          assets.add(soundUrl);
        }
      });
    }

    return Array.from(assets);
  };

  // Enhanced save function - directly opens OS file save dialog (no popup)
  const handleSave = async () => {
    try {
      // Determine default filename based on heading or use "Blockzie-Jr"
      let defaultFilename = heading?.text?.trim() ? heading.text.trim() : 'Blockzie-Jr';
      defaultFilename = defaultFilename.replace(/[\\/:?"<>|]+/g, '').slice(0, 50) || 'Blockzie-Jr';

      const currentState = store.getState().scene;
      const zip = new JSZip();
      const assetMap = new Map();

      const projectAssets = collectProjectAssets(currentState);

      for (const assetUrl of projectAssets) {
        const extension = getFileExtension(assetUrl);
        const assetId = generateAssetId(assetUrl);
        const savedFilename = await addAssetToZip(zip, assetUrl, assetId, extension);

        if (savedFilename) {
          assetMap.set(assetUrl, savedFilename);
        }
      }

      const completeProjectData = {
        scenes: currentState.scenes?.map(scene => ({
          ...scene,
          actors: scene.actors?.map(actor => ({
            ...actor,
            image: assetMap.get(actor.image) || actor.image,
            scripts: actor.scripts || []
          }))
        })),
        currentSceneIndex: currentState.currentSceneIndex || 0,
        sceneUndoStack: currentState.sceneUndoStack || [],
        sceneRedoStack: currentState.sceneRedoStack || [],
        selectedBlockCategory: currentState.selectedBlockCategory || 'motion',
        categoryPanelOpen: currentState.categoryPanelOpen || false,
        sounds: currentState.sounds ? Object.fromEntries(
          Object.entries(currentState.sounds).map(([key, value]) => [
            key, assetMap.get(value) || value
          ])
        ) : { pop: 'pop.mp3' },
        backgroundGallery: currentState.backgroundGallery?.map(bg =>
          assetMap.get(bg) || bg
        ),
        customSounds: currentState.customSounds || [],
        projectMetadata: {
          fileType: 'blockziejr-sb3',
          format: 'scratchjr',
          version: '1.0.0',
          generator: 'blockzie-jr-web',
          savedAt: new Date().toISOString(),
          projectName: defaultFilename
        }
      };

      zip.file('project.json', JSON.stringify(completeProjectData, null, 2));
      zip.file('scratchjr.marker', JSON.stringify({
        type: 'Blockzie-Jr Web Project',
        version: '1.0.0',
        created: new Date().toISOString(),
        projectName: defaultFilename
      }, null, 2));

      if (currentState.customSounds && currentState.customSounds.length > 0) {
        for (const sound of currentState.customSounds) {
          if (sound.audioBlob) {
            zip.file(`sounds/${sound.id}.wav`, sound.audioBlob);
          }
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });

      if ('showSaveFilePicker' in window) {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: `${defaultFilename}.sb3`,
            types: [{
              accept: { 'application/zip': ['.sb3'] }
            }],
            excludeAcceptAllOption: true
          });

          const writable = await fileHandle.createWritable();
          await writable.write(content);
          await writable.close();

          console.log('✅ Project saved successfully!');
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.error('Save picker error:', err);
            downloadFile(content, defaultFilename);
          }
        }
      } else {
        downloadFile(content, defaultFilename);
      }

    } catch (error) {
      console.error('❌ Save error:', error);
      alert('Error saving project. Please try again.');
    }
  };

  // Updated fallback download function
  const downloadFile = (content, filename) => {
    if (!filename.endsWith('.sb3')) {
      filename += '.sb3';
    }

    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // helper function: normalize filename
  function normalizeKey(key = "") {
    return key.split('/').pop();
  }

  // Update handleLoad to show splash with custom message
  const handleLoad = async (file) => {
    if (!file) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.sb3,.json';
      input.onchange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
          handleLoad(selectedFile);
        }
      };
      input.click();
      return;
    }

    try {
      if (file.name.endsWith('.sb3')) {
        // Show splash with loading message
        setSplashMessage("Your project is being loaded...");
        setShowSplash(true);

        setTimeout(handleSplashComplete, 3000);
        const zip = new JSZip();
        const contents = await zip.loadAsync(file);

        const zipFiles = Object.keys(contents.files);
        const projectJsonFile = contents.file('project.json');

        if (!projectJsonFile) {
          throw new Error('Invalid SB3 file: project.json not found');
        }

        const projectJsonText = await projectJsonFile.async('text');
        const projectData = JSON.parse(projectJsonText);

        const markerFile = contents.file('scratchjr.marker');
        const isScratchJrFormat = (
          markerFile ||
          projectData.projectMetadata?.fileType === 'scratchjr-sb3' ||
          projectData.fileType === 'scratchjr-sb3' ||
          (projectData.scenes && Array.isArray(projectData.scenes))
        );

        if (isScratchJrFormat) {
          console.log('🎯 Loading Blockzie-Jr project with Electron-compatible images...');

          const assetDataMap = new Map();
          let assetsLoaded = 0;

          for (const filePath of zipFiles) {
            if (filePath.match(/\.(svg|png|jpg|jpeg|gif|bmp|webp)$/i) && !filePath.startsWith('sounds/')) {
              const assetFile = contents.file(filePath);
              if (assetFile) {
                try {
                  const blob = await assetFile.async('blob');
                  const base64DataUrl = await blobToBase64(blob, filePath);
                  const key = normalizeKey(filePath);
                  assetDataMap.set(key, base64DataUrl);
                  assetsLoaded++;
                  console.log(`✅ Image converted to base64: ${filePath}`);
                } catch (error) {
                  console.warn('Image conversion failed:', filePath, error);
                }
              }
            }
          }

          const customSounds = [];
          const soundFiles = zipFiles.filter(name => name.startsWith('sounds/'));
          for (const soundPath of soundFiles) {
            const soundFile = contents.file(soundPath);
            if (soundFile) {
              try {
                const blob = await soundFile.async('blob');
                const base64DataUrl = await blobToBase64(blob);
                const soundId = soundPath.replace('sounds/', '').replace('.wav', '');
                customSounds.push({
                  id: soundId,
                  name: `Custom Sound ${soundId.slice(-4)}`,
                  audioURL: base64DataUrl,
                  audioBlob: blob,
                  type: 'custom'
                });
              } catch (error) {
                console.warn('Sound conversion failed:', soundPath);
              }
            }
          }

          const restoredProject = {
            scenes: projectData.scenes?.map(scene => ({
              ...scene,
              actors: scene.actors?.map(actor => {
                const key = normalizeKey(actor.image);
                const resolvedImage = assetDataMap.get(key) || actor.image;
                return {
                  ...actor,
                  image: resolvedImage,
                  scripts: actor.scripts || []
                };
              })
            })) || [],
            currentSceneIndex: projectData.currentSceneIndex || 0,
            sceneUndoStack: projectData.sceneUndoStack || [],
            sceneRedoStack: projectData.sceneRedoStack || [],
            selectedBlockCategory: projectData.selectedBlockCategory || 'motion',
            categoryPanelOpen: projectData.categoryPanelOpen || false,
            sounds: projectData.sounds ? Object.fromEntries(
              Object.entries(projectData.sounds).map(([key, value]) => [
                key, assetDataMap.get(normalizeKey(value)) || value
              ])
            ) : { pop: './assets/sounds/pop.mp3' },
            backgroundGallery: projectData.backgroundGallery?.map(bg =>
              assetDataMap.get(normalizeKey(bg)) || bg
            ) || [],
            customSounds: [...(projectData.customSounds || []), ...customSounds]
          };

          console.log('📊 Assets loaded:', assetsLoaded);

          dispatch({ type: 'scene/overwrite', payload: restoredProject });

          setTimeout(() => {
            const firstActor = restoredProject.scenes[restoredProject.currentSceneIndex]?.actors?.[0];
            if (firstActor) {
              setSelectedActorId(null);
              setTimeout(() => {
                setSelectedActorId(firstActor.id);
                console.log('🎭 Actor selected with base64 image');
              }, 100);
            }
          }, 200);

        }

      } else if (file.name.endsWith('.json')) {
        const text = await file.text();
        const data = JSON.parse(text);
        dispatch({ type: 'scene/overwrite', payload: data });

        const firstActor = data.scenes?.[data.currentSceneIndex || 0]?.actors?.[0];
        if (firstActor) {
          setSelectedActorId(firstActor.id);
        }
      }

    } catch (error) {
      console.error('❌ Load error:', error);
      alert('Error loading project. Please check the file format.');
    }
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => alert('Fullscreen request denied'));
    } else {
      document.exitFullscreen();
    }
  };

  const handleGridToggle = () => {
    setShowGrid(g => !g);
  };

  const handleGreenFlag = () => {
    if (!selectedActorId) return;
    const currentScene = scenes[currentSceneIndex];
    if (!currentScene) return;

    const actor = currentScene.actors.find(a => a.id === selectedActorId);
    if (!actor || !actor.scripts?.length) return;

    actor.scripts.forEach((script) => {
      if (script.execute && typeof script.execute === 'function') {
        script.execute();
      } else if (script.soundData && script.soundData.audioURL) {
        const audio = new Audio(script.soundData.audioURL);
        audio.play().catch(err => console.error('Sound execution error:', err));
      }

      if (script.blocks && script.blocks.length > 0 && script.blocks[0].type === "green_flag") {
        dispatch({
          type: 'script/run',
          payload: { actorId: actor.id, scriptId: script.id }
        });
      }
    });
  };

  const handleBrush = (actor) => {
    // Paint editor functionality
  };

  const handleAddCharacter = () => {
    // Add character functionality
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} message={splashMessage} />;
  }


  return (
    <div className="sjr-root">
      {/* Top Navbar with simplified Toolbar */}
      <header className="top-navbar">
        <Toolbar
          selectedActorId={selectedActorId}
          onSave={handleSave}
          onLoad={handleLoad}
          heading={heading}
        />
      </header>

      {/* Background and Heading Modals */}
      <BackgroundGallery open={bgModalOpen} onClose={() => setBgModalOpen(false)} />
      <HeadingModal
        open={headingModalOpen}
        onClose={() => setHeadingModalOpen(false)}
        onSave={h => { setHeading(h); setHeadingModalOpen(false); }}
        initial={heading}
      />

      {/* Main Content - 3 Column Layout */}
      <main className="middle-section">
        <section className="script-area-section">
          <ScriptArea selectedActorId={selectedActorId} />
        </section>

        <section className="stage-area-section">
          <Stage
            selectedActorId={selectedActorId}
            setSelectedActorId={setSelectedActorId}
            heading={heading}
            showGrid={showGrid}
          />
        </section>

        <section className="right-panel-section">
          <RightPanelControls
            onFullScreen={handleFullscreen}
            onGridToggle={handleGridToggle}
            onHeading={() => setHeadingModalOpen(true)}
            onGreenFlag={handleGreenFlag}
            selectedActorId={selectedActorId}
          />

          <div className="scene-manager-container">
            <SceneManager />
          </div>

          <div className="character-gallery-container">
            <CharacterGallery
              selectedActorId={selectedActorId}
              setSelectedActorId={setSelectedActorId}
              onBrush={handleBrush}
              onAdd={handleAddCharacter}
            />
          </div>
        </section>
      </main>

      <footer className="blocks-footer">
        <div className="blocks-container">
          <div className="category-selector-container">
            <CategorySelector />
          </div>
          <div className="block-palette-container">
            <BlockPalette />
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <BlockzieJrShell />
    </Provider>
  );
}
