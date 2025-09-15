import React, { useState, useRef } from "react";
import { useSelector, useDispatch, useStore} from "react-redux";
import {
  addBlockToScript,
  clearScript,
  pushUndoState,
  updateBlockCount,
} from "../../store/sceneSlice";
import NumberPicker from "./NumberPicker";
import "../../css/ScriptArea.css";
import { setCameraState } from "../../store/sceneSlice";
import { run } from "../../utils/runScript";

export default function ScriptArea({ selectedActorId }) {
  const dispatch = useDispatch();
  const { scenes, currentSceneIndex } = useSelector((s) => s.scene);
  const globalCameraState = useSelector((s) => s.scene.globalCameraState);
  const scene = scenes[currentSceneIndex];
  const actor = scene?.actors.find((a) => a.id === selectedActorId);
  const store = useStore(); // Initialize useStore
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

    // Set a default opacity for the new block type
    if (block.type === 'video_transparency' && !block.hasOwnProperty('opacity')) {
      block.opacity = 100;
    }

    // Preserve camera state if it exists
    if (block.type === 'camera_control' && block.cameraState) {
      block.cameraState = block.cameraState;
    }

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
        await run(actor, dispatch, scene?.sounds, actor.id, store.getState);
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

    // For Video Transparency block, show the number picker
    if (block.name === "Set Video Transparency") {
      setTapBlock(block);
      setPickerOpen(true);
      return;
    }

    setTapBlock(block);
    setPickerOpen(true);
  };

  const setCount = (n) => {
    if (!actor || !tapBlock) return;
    dispatch(pushUndoState());

    // Check if the block is a video transparency block and update its opacity
    if (tapBlock.name === "Set Video Transparency") {
      dispatch(updateBlockCount({ actorId: actor.id, blockId: tapBlock.id, newCount: n, property: 'opacity' }));
    } else {
      dispatch(updateBlockCount({ actorId: actor.id, blockId: tapBlock.id, newCount: n }));
    }
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

  const handleOpacityChange = (blockId, newOpacity) => {
    dispatch(updateBlockCount({ actorId: actor.id, blockId, newCount: newOpacity, property: 'opacity' }));
  };

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
            actor.scripts.map((b, i) => {
              // Camera control block rendering
              if (b.type === 'camera_control') {
                return (
                  <div
                    key={b.id}
                    className={`block-palette-title ${draggedBlock?.index === i ? 'dragging' : ''}`}
                    onClick={() => clickBlock(b)}
                    title="Camera Control - Click dropdown to turn on/off camera"
                    draggable
                    onDragStart={(e) => handleBlockDragStart(e, b, i)}
                    onDragEnd={handleBlockDragEnd}
                  >
                    <img className="block-bg" src={b.puzzleBg} alt="" draggable={false} />
                    <select
                      className="camera-select-dropdown"
                      value={globalCameraState}
                      onChange={(e) => {
                        e.stopPropagation();
                        const newState = e.target.value;

                        // Update global camera state in Redux
                        dispatch(setCameraState(newState));

                        // Trigger camera functionality
                        if (newState === 'on') {
                          window.humanDetectionController?.startCamera();
                        } else {
                          window.humanDetectionController?.stopCamera();
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    // style={{
                    //   position: 'absolute',
                    //   top: '50%',
                    //   left: '50%',
                    //   transform: 'translate(-50%, -50%)',
                    //   width: '50px',
                    //   height: '24px',
                    //   background: 'rgba(255, 255, 255, 0.9)',
                    //   border: '1px solid rgba(0,0,0,0.3)',
                    //   borderRadius: '4px',
                    //   color: 'black',
                    //   fontSize: '10px',
                    //   zIndex: 2,
                    //   cursor: 'pointer'
                    // }}
                    >
                      <option value="off">off</option>
                      <option value="on">on</option>
                    </select>
                    <img src="./assets/ui/camera.png"
                      style={{
                        position: 'absolute',
                        top: '42%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '35px',
                        height: '35px',
                        zIndex: 2,
                      }}
                    />
                  </div>
                );
              }

              // Video transparency block rendering
              if (b.type === 'video_transparency') {
                return (
                  <div
                    key={b.id}
                    className={`block-palette-title ${draggedBlock?.index === i ? 'dragging' : ''}`}
                    onClick={() => clickBlock(b)}
                    title="Set Video Transparency - Click to change opacity"
                    draggable
                    onDragStart={(e) => handleBlockDragStart(e, b, i)}
                    onDragEnd={handleBlockDragEnd}
                  >
                    <img className="block-bg" src={b.puzzleBg} alt="" draggable={false} />
                    <img className="block-icon" src={b.icon} alt={b.name} draggable={false} />
                    <span className="block-label">{b.opacity}%</span>
                  </div>
                );
              }

              // Regular block rendering (unchanged)
              return (
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
              );
            })
          )}
        </div>
      </div>
      <NumberPicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={setCount}
        currentValue={tapBlock?.name === "Set Video Transparency" ? tapBlock?.opacity : (tapBlock?.count || (tapBlock?.name === "Wait" ? 3 : 1))}
        blockType={tapBlock?.type}
      />
    </div>
  );
}
