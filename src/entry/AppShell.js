import React, { useState } from "react";
import Toolbar from "./Toolbar";
import SceneManager from "./SceneManager";
import ScriptArea from "./ScriptArea";
import Stage from "./Stage";
import CharacterGallery from "./CharacterGallery";
import CategorySelector from "./CategorySelector";
import HeadingModal from "./HeadingModal";
import Block from "../blocks/Block";
import PaintEditorModal from "../../painteditor/PaintEditorModal";

export default function AppShell() {
  const [paintEditorOpen, setPaintEditorOpen] = useState(false);

  return (
    <div className="scratchjr-root">
      <Toolbar />
      <div className="main-row" style={{ display: 'flex', height: '85vh' }}>
        <aside className="left-bar">
          <CharacterGallery openPaintEditor={() => setPaintEditorOpen(true)} />
        </aside>
        <main className="center-panel">
          <SceneManager />
          <Stage />
          <ScriptArea />
          <CategorySelector />
        </main>
        <aside className="right-bar">
          {/* Additional UI as needed */}
        </aside>
      </div>
      <BlockPalette />
      <HeadingModal />
      <PaintEditorModal
        open={paintEditorOpen}
        onClose={() => setPaintEditorOpen(false)}
        onSave={() => setPaintEditorOpen(false)}
      />
    </div>
  );
}
