import React, { useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  addBlockToScript,
  clearScript,
  pushUndoState,
  updateBlockCount,
} from "../../store/sceneSlice";
import NumberPicker from "./NumberPicker";
import "../../css/ScriptArea.css";

import { run } from "../../utils/runScript";

export default function ScriptArea({ selectedActorId }) {
  const dispatch = useDispatch();
  const { scenes, currentSceneIndex } = useSelector((s) => s.scene);
  const scene = scenes[currentSceneIndex];
  const actor = scene?.actors.find((a) => a.id === selectedActorId);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [tapBlock, setTapBlock] = useState(null);
  const [draggedBlock, setDraggedBlock] = useState(null);
  const [dragStarted, setDragStarted] = useState(false);
  const scriptAreaRef = useRef(null);

  const onDrop = (e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/block");
    if (!raw || !actor) return;
    const block = JSON.parse(raw);
    dispatch(pushUndoState());

    if (block.category === "start") {
      dispatch(addBlockToScript({ actorId: actor.id, block, index: 0 }));
    } else if (block.category === "end") {
      dispatch(addBlockToScript({ actorId: actor.id, block, index: actor.scripts.length }));
    } else {
      dispatch(addBlockToScript({ actorId: actor.id, block }));
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleBlockDragStart = (e, block, index) => {
    e.stopPropagation();
    setDraggedBlock({ block, index });
    setDragStarted(true);

    e.dataTransfer.setData("application/script-block", JSON.stringify({
      blockId: block.id,
      actorId: actor.id,
      index: index
    }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleBlockDragEnd = (e) => {
    if (dragStarted && draggedBlock && scriptAreaRef.current) {
      const rect = scriptAreaRef.current.getBoundingClientRect();
      const { clientX, clientY } = e;
      const isOutside = (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      );

      if (isOutside) {
        dispatch(pushUndoState());
        const newScripts = actor.scripts.filter((_, i) => i !== draggedBlock.index);
        dispatch(clearScript({ actorId: actor.id }));
        newScripts.forEach((block) => {
          dispatch(addBlockToScript({ actorId: actor.id, block }));
        });
      }
    }
    setDraggedBlock(null);
    setDragStarted(false);
  };

  const handleScriptAreaDragOver = (e) => {
    if (dragStarted && draggedBlock) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "none";
    } else {
      onDragOver(e);
    }
  };

  const clickBlock = async (block) => {
    if (block.category === "start" && block.name === "Start on Green Flag") {
      try {
        await run(actor, dispatch, scene?.sounds, actor.id);
      } catch (err) {
        console.error("Error while running script:", err);
      }
      return;
    }

    if (block.category === "start") return;

    // For Wait block, show the number picker
    if (block.name === "Wait") {
      setTapBlock(block);
      setPickerOpen(true);
      return;
    }

    // Stop block doesn't need configuration
    if (block.name === "Stop") {
      return;
    }

    // Speed block doesn't need configuration
    if (block.name === "Speed") {
      return;
    }

    setTapBlock(block);
    setPickerOpen(true);
  };

  const setCount = (n) => {
    if (!actor || !tapBlock) return;
    dispatch(pushUndoState());
    dispatch(updateBlockCount({ actorId: actor.id, blockId: tapBlock.id, newCount: n }));
  };

  if (!actor) {
    return (
      <div className="scriptarea-root">
        <div className="scriptarea-buttons">
          <button className="s-btn run" disabled>▶ Run</button>
          <button className="s-btn clear" disabled>🗑 Clear</button>
        </div>
        <div className="scriptarea-noborder">
          <div className="s-hint">Drop blocks here to build your script</div>
        </div>
      </div>
    );
  }

  return (
    <div className="scriptarea-root">
      <div className="scriptarea-buttons">
        <button
          className="s-btn run"
          onClick={() => run(actor, dispatch, scene?.sounds, actor.id)}
          disabled={!actor.scripts.length}
        >
          ▶ Run
        </button>
        <button
          className="s-btn clear"
          onClick={() => dispatch(clearScript({ actorId: actor.id }))}
          disabled={!actor.scripts.length}
        >
          🗑 Clear
        </button>
      </div>
      <div 
        className="scriptarea-noborder"
        ref={scriptAreaRef}
        onDrop={onDrop}
        onDragOver={handleScriptAreaDragOver}
      >
        <div className="script-chain">
          {actor.scripts.length === 0 ? (
            <div className="s-hint">Drop blocks here to build your script</div>
          ) : (
            actor.scripts.map((b, i) => (
              <div
                key={b.id}
                className={`block-palette-title ${draggedBlock?.index === i ? 'dragging' : ''}`}
                onClick={() => clickBlock(b)}
                title={
                  b.name === "Wait" 
                    ? `Wait ${b.count || 3} seconds - Click to change duration, drag out to remove`
                    : b.name === "Stop"
                    ? "Stop execution - Drag out to remove"
                    : b.name === "Speed"
                    ? "Increase speed by 1.5x - Drag out to remove"
                    : "Click to set count, drag out to remove"
                }
                draggable
                onDragStart={(e) => handleBlockDragStart(e, b, i)}
                onDragEnd={handleBlockDragEnd}
              >
                <img className="block-bg" src={b.puzzleBg} alt="" draggable={false} />
                {b.icon && (
                  <img className="block-icon" src={b.icon} alt={b.name} draggable={false} />
                )}
                {b.soundData && (
                  <div className="custom-sound-script-indicator"></div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      <NumberPicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={setCount}
        currentValue={tapBlock?.count || (tapBlock?.name === "Wait" ? 3 : 1)}
        blockType={tapBlock?.type}
      />
    </div>
  );
}
