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
import BackgroundGallery from './editor/ui/BackgroundGallery';
import HeadingModal from './editor/ui/HeadingModal';

import { clearScript } from './store/sceneSlice';

import './App.css';

const demoActors = [
  {
    id: 'actor1',
    name: 'Stembot',
    image: '/assets/characters/stembot.svg',
  },
];

function ScratchJrShell() {
  const dispatch = useDispatch();
  const { scenes, currentSceneIndex } = useSelector(s => s.scene);
  const actorIdFromScene = scenes[currentSceneIndex]?.actors?.[0]?.id;

  const [selectedActorId, setSelectedActorId] = useState(actorIdFromScene || demoActors?.id);
  const [bgModalOpen, setBgModalOpen] = useState(false);
  const [heading, setHeading] = useState({ text: "", color: "#222", size: 38 });
  const [headingModalOpen, setHeadingModalOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (actorIdFromScene) setSelectedActorId(actorIdFromScene);
  }, [actorIdFromScene, currentSceneIndex]);

  // Helper function to convert blob to base64 data URL (Electron-compatible)
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
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

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      let filename = heading?.text?.trim() ? heading.text.trim() : 'untitled';
      filename = filename.replace(/[\\/:?"<>|]+/g, '').slice(0, 50) || 'untitled';
      
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
          fileType: 'scratchjr-sb3',
          format: 'scratchjr',
          version: '1.0.0',
          generator: 'scratchjr-web-clone',
          savedAt: new Date().toISOString()
        }
      };
      
      zip.file('project.json', JSON.stringify(completeProjectData, null, 2));
      zip.file('scratchjr.marker', JSON.stringify({
        type: 'ScratchJr Web Project',
        version: '1.0.0',
        created: new Date().toISOString()
      }, null, 2));
      
      if (currentState.customSounds && currentState.customSounds.length > 0) {
        for (const sound of currentState.customSounds) {
          if (sound.audioBlob) {
            zip.file(`sounds/${sound.id}.wav`, sound.audioBlob);
          }
        }
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.sb3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // alert('Project saved successfully!');
      
    } catch (error) {
      console.error('❌ Save error:', error);
      // alert('Error saving project: ' + error.message);

    } finally {
      setIsLoading(false);
    }
  };

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
      setIsLoading(true);

      if (file.name.endsWith('.sb3')) {
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
          console.log('🎯 Loading ScratchJr project with Electron-compatible images...');
          
          // Convert all assets to base64 data URLs (works reliably in Electron)
          const assetDataMap = new Map();
          let assetsLoaded = 0;
          
          for (const filePath of zipFiles) {
            if (filePath.match(/\.(svg|png|jpg|jpeg|gif|bmp|webp)$/i) && !filePath.startsWith('sounds/')) {
              const assetFile = contents.file(filePath);
              if (assetFile) {
                try {
                  const blob = await assetFile.async('blob');
                  const base64DataUrl = await blobToBase64(blob);
                  assetDataMap.set(filePath, base64DataUrl);
                  assetsLoaded++;
                  console.log(`✅ Image converted to base64: ${filePath}`);
                } catch (error) {
                  console.warn('Image conversion failed:', filePath, error);
                }
              }
            }
          }
          
          // Load custom sounds
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
          
          // Create restored project with base64 data URLs
          const restoredProject = {
            scenes: projectData.scenes?.map(scene => ({
              ...scene,
              actors: scene.actors?.map(actor => ({
                ...actor,
                image: assetDataMap.get(actor.image) || actor.image,
                scripts: actor.scripts || []
              }))
            })) || [],
            currentSceneIndex: projectData.currentSceneIndex || 0,
            sceneUndoStack: projectData.sceneUndoStack || [],
            sceneRedoStack: projectData.sceneRedoStack || [],
            selectedBlockCategory: projectData.selectedBlockCategory || 'motion',
            categoryPanelOpen: projectData.categoryPanelOpen || false,
            sounds: projectData.sounds ? Object.fromEntries(
              Object.entries(projectData.sounds).map(([key, value]) => [
                key, assetDataMap.get(value) || value
              ])
            ) : { pop: '/assets/sounds/pop.mp3' },
            backgroundGallery: projectData.backgroundGallery?.map(bg => 
              assetDataMap.get(bg) || bg
            ) || [],
            customSounds: [...(projectData.customSounds || []), ...customSounds]
          };
          
          console.log('📊 Assets loaded:', assetsLoaded);
          console.log('🖼️ Sample image type:', restoredProject.scenes[0]?.actors?.[0]?.image?.substring(0, 30));
          
          // Dispatch to Redux and force multiple updates
          dispatch({ type: 'scene/overwrite', payload: restoredProject });
          
          // Multiple state updates to ensure rendering
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
          
          // alert(`✅ Project loaded with ${assetsLoaded} images!\nImages are now Electron-compatible.`);
          
        } else {
          // alert('Standard Scratch file detected. Converting...');
        }
        
      } else if (file.name.endsWith('.json')) {
        const text = await file.text();
        const data = JSON.parse(text);
        dispatch({ type: 'scene/overwrite', payload: data });
        
        const firstActor = data.scenes?.[data.currentSceneIndex || 0]?.actors?.[0];
        if (firstActor) {
          setSelectedActorId(firstActor.id);
        }
        
        // alert('JSON project loaded successfully!');
      }
      
    } catch (error) {
      console.error('❌ Load error:', error);
      // alert(`Error loading project: ${error.message}`);
    } finally {
      setIsLoading(false);
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

  const handleRefresh = () => {
    if (!selectedActorId) return;
    dispatch(clearScript({ actorId: selectedActorId }));
  };

  const handleGreenFlag = () => {
    if (!selectedActorId) return;
    const currentScene = scenes[currentSceneIndex];
    if (!currentScene) return;

    const actor = currentScene.actors.find(a => a.id === selectedActorId);
    if (!actor || !actor.scripts?.length) return;

    actor.scripts.forEach((script, index) => {
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
    // alert(`Paint editor for ${actor.name} to be implemented`);
  };

  const handleAddCharacter = () => {
    // alert("Add new character action to be implemented");
  };

  return (
    <div className="sjr-root">
      {isLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '15px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '15px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            minWidth: '250px'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '5px solid #f3f3f3',
              borderTop: '5px solid #3498db',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', textAlign: 'center' }}>
              Converting images for Electron...
            </div>
          </div>
        </div>
      )}

      <header className="top-navbar">
        <Toolbar
          onSave={handleSave}
          onLoad={handleLoad}
          onFullScreen={handleFullscreen}
          onGridToggle={handleGridToggle}
          onRefresh={handleRefresh}
          onBgGallery={() => setBgModalOpen(true)}
          onHeading={() => setHeadingModalOpen(true)}
          onGreenFlag={handleGreenFlag}
        />
      </header>

      <BackgroundGallery open={bgModalOpen} onClose={() => setBgModalOpen(false)} />
      <HeadingModal
        open={headingModalOpen}
        onClose={() => setHeadingModalOpen(false)}
        onSave={h => { setHeading(h); setHeadingModalOpen(false); }}
        initial={heading}
      />

      <main className="middle-section">
        <section className="character-gallery-section">
      <CharacterGallery
        selectedActorId={selectedActorId}
        setSelectedActorId={setSelectedActorId}
        onBrush={handleBrush}
        onAdd={handleAddCharacter}
      />
        </section>

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

        <section className="scene-management-section">
          <SceneManager />
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
      <ScratchJrShell />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Provider>
  );
}
