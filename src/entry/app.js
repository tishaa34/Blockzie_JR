import React, { useEffect, useState } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import store from './store/store';

import SceneManager from './editor/ui/SceneManager';
import Stage from './editor/ui/Stage';
import BlockPalette from './editor/blocks/Block';
import ScriptArea from './editor/ui/ScriptArea';
import CharacterGallery from './editor/ui/CharacterGallery';
import CategorySelector from './editor/ui/CategorySelector';
import Toolbar from './editor/ui/Toolbar';
import BackgroundGallery from './editor/ui/BackgroundGallery';
import HeadingModal from './editor/ui/HeadingModal';
import { UndoRedoProvider } from '../editor/UndoRedoContext';

import { clearScript } from './store/sceneSlice'; // Redux action

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

  useEffect(() => {
    if (actorIdFromScene) setSelectedActorId(actorIdFromScene);
  }, [actorIdFromScene, currentSceneIndex]);

  const handleSave = () => {
    let filename = heading?.text?.trim() ? heading.text.trim() : 'untitled';
    filename = filename.replace(/[\\/:?"<>|]+/g, '').slice(0,50) || 'untitled';
    const data = store.getState().scene;
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleLoad = (newSceneData) => {
    if (newSceneData) {
      dispatch({ type: 'scene/overwrite', payload: newSceneData });
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

    actor.scripts.forEach(script => {
      if (script.blocks && script.blocks.length > 0 && script.blocks[0].type === "green_flag") {
        dispatch({
          type: 'script/run',
          payload: { actorId: actor.id, scriptId: script.id }
        });
      }
    });
  };

  const handleBrush = (actor) => {
    alert(`Paint editor for ${actor.name} to be implemented`);
  };

  const handleAddCharacter = () => {
    alert("Add new character action to be implemented");
  };

  function App() {
    return (
        <UndoRedoProvider>
            <div className="app">
                {/* Your existing app components */}
                {/* All your existing JSX content stays the same */}
            </div>
        </UndoRedoProvider>
    );
}

  return (
    <div className="sjr-root">
      {/* Nav Bar / Toolbar */}
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

      {/* Popups */}
      <BackgroundGallery open={bgModalOpen} onClose={() => setBgModalOpen(false)} />
      <HeadingModal
        open={headingModalOpen}
        onClose={() => setHeadingModalOpen(false)}
        onSave={h => { setHeading(h); setHeadingModalOpen(false); }}
        initial={heading}
      />

      {/* MAIN LAYOUT (4 columns) */}
      <main className="sjr-main">
        {/* Char Picker */}
        <aside className="col col-left">
          <CharacterGallery
            actors={demoActors}
            selectedActorId={selectedActorId}
            setSelectedActorId={setSelectedActorId}
            onBrush={handleBrush}
            onAdd={handleAddCharacter}
          />
        </aside>

        {/* Script Area */}
        <section className="col col-script">
          <ScriptArea selectedActorId={selectedActorId} />
        </section>

        {/* Divider */}
        <div className="divider"></div>

        {/* Stage Area */}
        <section className="col col-stage">
          <div className="stage-wrap">
            <Stage
              selectedActorId={selectedActorId}
              setSelectedActorId={setSelectedActorId}
              heading={heading}
              showGrid={showGrid}
            />
          </div>
        </section>

        {/* Scene Manager */}
        <aside className="col col-scene">
          <SceneManager />
        </aside>
      </main>

      {/* FOOTER (Blocks) */}
      <footer className="sjr-footer">
        <div className="dock-strip-fullwidth">
          <div className="catblock-holder"><CategorySelector /></div>
          <BlockPalette />
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <ScratchJrShell />
    </Provider>
  );
}
