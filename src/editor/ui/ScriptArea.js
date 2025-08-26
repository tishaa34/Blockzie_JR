import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  addBlockToScript,
  clearScript,
  moveActor,
  rotateActor,
  pushUndoState,
  updateBlockCount,
} from "../../store/sceneSlice";
import NumberPicker from "./NumberPicker";
import "../../css/ScriptArea.css";

export default function ScriptArea({ selectedActorId }) {
  const dispatch = useDispatch();
  const { scenes, currentSceneIndex, sounds } = useSelector((s) => s.scene);
  const scene = scenes[currentSceneIndex];
  const actor = scene?.actors.find((a) => a.id === selectedActorId);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [tapBlock, setTapBlock] = useState(null);

  // const onDrop = (e) => {
  //   e.preventDefault();
  //   const raw = e.dataTransfer.getData("application/block");
  //   if (!raw || !actor) return;
  //   const block = JSON.parse(raw);
  //   dispatch(pushUndoState());
  //   dispatch(addBlockToScript({ actorId: actor.id, block }));
  // };

  const onDrop = (e) => {
  e.preventDefault();
  const raw = e.dataTransfer.getData("application/block");
  if (!raw || !actor) return;
  const block = JSON.parse(raw);
  console.log(block);
  dispatch(pushUndoState());

  // Decide position based on category
  if (block.category === "start") {
    // put at the beginning
    dispatch(addBlockToScript({ actorId: actor.id, block, index: 0 }));
  } else if (block.category === "end") {
    // put at the end
    dispatch(addBlockToScript({ actorId: actor.id, block, index: actor.scripts.length }));
  } else {
    // default (append to end for now, or later use "drop index" if you allow mid-insertion)
    dispatch(addBlockToScript({ actorId: actor.id, block }));
  }
};

  const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; };

  const clickBlock = (block) => {
    setTapBlock(block);
    setPickerOpen(true);
  };
  const setCount = (n) => {
    if (!actor || !tapBlock) return;
    dispatch(pushUndoState());
    dispatch(updateBlockCount({ actorId: actor.id, blockId: tapBlock.id, newCount: n }));
  };

  async function run() {
    if (!actor || !actor.scripts.length) return;
    const delay = (ms) => new Promise(res => setTimeout(res, ms));
    const loops = [];
    for (let i = 0; i < actor.scripts.length;) {
      const b = actor.scripts[i];
      const c = Math.max(1, Math.min(99, b.count || 1));
      console.log("Executing:", b.type, "count:", c);
      switch (b.type) {
        case 'Move Right': for (let k = 0; k < c; k++) { dispatch(moveActor({ actorId: actor.id, dx: 1, dy: 0, fromScript: true })); await delay(180); } break;
        case 'Move Left':  for (let k = 0; k < c; k++) { dispatch(moveActor({ actorId: actor.id, dx: -1, dy: 0, fromScript: true })); await delay(180); } break;
        case 'Move Up':    for (let k = 0; k < c; k++) { dispatch(moveActor({ actorId: actor.id, dx: 0, dy: -1, fromScript: true })); await delay(120); dispatch(moveActor({ actorId: actor.id, dx: 0, dy: 2, fromScript: true })); await delay(120); } break;
        case 'Move Down':  for (let k = 0; k < c; k++) { dispatch(moveActor({ actorId: actor.id, dx: 0, dy: 1, fromScript: true })); await delay(180); } break;
        case 'Rotate Left': for (let k = 0; k < c; k++) { dispatch(rotateActor({ actorId: actor.id, degrees: -90, fromScript: true })); await delay(140); } break;
        case 'Rotate Right': for (let k = 0; k < c; k++) { dispatch(rotateActor({ actorId: actor.id, degrees: 90, fromScript: true })); await delay(140); } break;
        case 'Wait':      await delay(1000 * c); break;
        case 'Pop':   if (sounds?.pop) { try { await new Audio(sounds.pop).play(); } catch {} } await delay(120); break;
        case 'loop':      loops.push({ start: i + 1, left: c }); break;
        case 'end':
        case 'endLoop':
          if (loops.length) {
            const L = loops[loops.length - 1];
            L.left -= 1;
            if (L.left > 0) { i = L.start - 1; continue; } else loops.pop();
          }
          break;
        default: break;
      }
      i++;
      await delay(80);
    }
  }

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
        <button className="s-btn run" onClick={run} disabled={!actor.scripts.length}>▶ Run</button>
        <button className="s-btn clear" onClick={() => dispatch(clearScript({ actorId: actor.id }))} disabled={!actor.scripts.length}>🗑 Clear</button>
      </div>
      <div className="scriptarea-noborder"
           onDrop={onDrop}
           onDragOver={onDragOver}>
        <div className="script-chain">
          {actor.scripts.length === 0 ? (
            <div className="s-hint">Drop blocks here to build your script</div>
          ) : (
            
            actor.scripts.map((b, i) => (
              <div
                key={b.id}
                className="block-palette-title"
                onClick={() => clickBlock(b)}
                title="Click to set count"
              >
                <img
                  className="block-bg"
                  src={b.puzzleBg}
                  alt=""
                  draggable={false}
                  aria-hidden="true"
                />
                {/* Icon overlay (only if provided) - same logic as palette */}
                {b.icon && (
                  <img
                    className="block-icon"
                    src={b.icon}
                    alt={b.name}
                    draggable={false}
                  />
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
        currentValue={tapBlock?.count || 1}
        blockType={tapBlock?.type}
      />
    </div>
  );
}
