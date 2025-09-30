import React, { useState, useRef } from "react";
import { useSelector, useDispatch, useStore } from "react-redux";
import {
  addBlockToScript,
  clearScript,
  pushUndoState,
  updateBlockCount,
  addBlockToSimulatorScript,
  clearSimulatorScript,
  updateSimulatorBlockCount,
  setCameraState,
} from "../../store/sceneSlice";
import NumberPicker from "./NumberPicker";
import "../../css/ScriptArea.css";
import { run } from "../../utils/runScript";

export default function ScriptArea({ selectedActorId }) {
  const dispatch = useDispatch();
  const store = useStore();
  const { scenes, currentSceneIndex, simulatorRobots, selectedSimRobotId } = useSelector((s) => s.scene);
  const globalCameraState = useSelector((s) => s.scene.globalCameraState);

  const scene = scenes[currentSceneIndex];
  const stageActor = scene?.actors.find((a) => a.id === selectedActorId);

  // If a simulator robot is selected for editing, we will edit that robot's scripts.
  const selectedSimRobot = (simulatorRobots || []).find(r => r.id === selectedSimRobotId) || null;

  // editableTarget is either a stage actor (if no sim robot selected) or the selected simulator robot
  const editableTarget = selectedSimRobot || stageActor;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [tapBlock, setTapBlock] = useState(null);
  const [draggedBlock, setDraggedBlock] = useState(null);
  const [dragStarted, setDragStarted] = useState(false);
  const scriptAreaRef = useRef(null);

  const onDrop = (e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/block");
    if (!raw || !editableTarget) return;
    const block = JSON.parse(raw);

    // Set a default opacity for the new block type
    if (block.type === 'video_transparency' && !block.hasOwnProperty('opacity')) {
      block.opacity = 100;
    }

    dispatch(pushUndoState());

    if (editableTarget.type === 'simulatorRobot') {
      // Add block to simulator robot scripts
      dispatch(addBlockToSimulatorScript({ robotId: editableTarget.id, block }));
    } else {
      // Add block to stage actor scripts
      if (block.category === "start") {
        dispatch(addBlockToScript({ actorId: editableTarget.id, block, index: 0 }));
      } else if (block.category === "end") {
        dispatch(addBlockToScript({ actorId: editableTarget.id, block, index: editableTarget.scripts.length }));
      } else {
        dispatch(addBlockToScript({ actorId: editableTarget.id, block }));
      }
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
      actorId: editableTarget.id,
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
        if (editableTarget.type === 'simulatorRobot') {
          const newScripts = editableTarget.scripts.filter((_, i) => i !== draggedBlock.index);
          dispatch(clearSimulatorScript({ robotId: editableTarget.id }));
          newScripts.forEach((block) => {
            dispatch(addBlockToSimulatorScript({ robotId: editableTarget.id, block }));
          });
        } else {
          const newScripts = editableTarget.scripts.filter((_, i) => i !== draggedBlock.index);
          dispatch(clearScript({ actorId: editableTarget.id }));
          newScripts.forEach((block) => {
            dispatch(addBlockToScript({ actorId: editableTarget.id, block }));
          });
        }
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

  // Handling block clicks (configuration)
  const clickBlock = async (block) => {
    if (!block) return;

    if (block.category === "start" && block.name === "Start on Green Flag") {
      try {
        const isSimulatorVisible = document.querySelector('.simulator-robot') !== null;
        const currentState = store.getState();
        const simRobots = currentState.scene?.simulatorRobots || [];

        if (isSimulatorVisible && simRobots.length > 0) {
          // If simulator open, run all simulator robots (their own scripts)
          for (const robot of simRobots) {
            if (robot.scripts && robot.scripts.length > 0) {
              console.log('🤖 Running simulator robot script:', robot.name);
              await run(robot, dispatch, scene?.sounds, robot.id, store.getState);
            } else {
              console.warn('🤖 Simulator robot has no scripts to run:', robot.name);
            }
          }
        } else if (stageActor) {
          console.log('🎭 Running stage actor script:', stageActor.name);
          await run(stageActor, dispatch, scene?.sounds, stageActor.id, store.getState);
        }
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
    if (!editableTarget || !tapBlock) return;
    dispatch(pushUndoState());

    if (editableTarget.type === 'simulatorRobot') {
      // Update block count for simulator robot
      dispatch(updateSimulatorBlockCount({ robotId: editableTarget.id, blockId: tapBlock.id, newCount: n, property: tapBlock.name === "Set Video Transparency" ? 'opacity' : 'count' }));
    } else {
      // Update stage actor block
      if (tapBlock.name === "Set Video Transparency") {
        dispatch(updateBlockCount({ actorId: editableTarget.id, blockId: tapBlock.id, newCount: n, property: 'opacity' }));
      } else {
        dispatch(updateBlockCount({ actorId: editableTarget.id, blockId: tapBlock.id, newCount: n }));
      }
    }
  };

  const handleOpacityChange = (blockId, newOpacity) => {
    if (!editableTarget) return;
    if (editableTarget.type === 'simulatorRobot') {
      dispatch(updateSimulatorBlockCount({ robotId: editableTarget.id, blockId, newCount: newOpacity, property: 'opacity' }));
    } else {
      dispatch(updateBlockCount({ actorId: editableTarget.id, blockId, newCount: newOpacity, property: 'opacity' }));
    }
  };

  // Run button: respects either selected simulator robot (if selected) or stage actor
  const handleRunClick = async () => {
    try {
      const currentState = store.getState();
      const isSimulatorVisible = document.querySelector('.simulator-robot') !== null;
      const simRobots = currentState.scene?.simulatorRobots || [];

      if (isSimulatorVisible && simRobots.length > 0) {
        // If a sim robot is selected for editing, run only that robot.
        if (selectedSimRobot) {
          if (selectedSimRobot.scripts && selectedSimRobot.scripts.length > 0) {
            console.log('🤖 Running selected simulator robot script:', selectedSimRobot.name);
            await run(selectedSimRobot, dispatch, scene?.sounds, selectedSimRobot.id);
          } else {
            console.warn('🤖 Selected simulator robot has no scripts:', selectedSimRobot);
          }
        } else {
          // Otherwise run all simulator robots (that have scripts)
          for (const robot of simRobots) {
            if (robot.scripts && robot.scripts.length > 0) {
              console.log('🤖 Running simulator robot script:', robot.name);
              await run(robot, dispatch, scene?.sounds, robot.id);
            } else {
              console.warn('🤖 Simulator robot has no scripts to run:', robot.name);
            }
          }
        }
      } else if (stageActor) {
        console.log('🎭 Running stage actor script:', stageActor.name);
        await run(stageActor, dispatch, scene?.sounds, stageActor.id);
      } else {
        console.log('❌ No actor or robot available to run');
      }
    } catch (err) {
      console.error('Error while running script:', err);
    }
  };

  if (!editableTarget) {
    return (
      <div className="scriptarea-root">
        <div className="scriptarea-buttons">
          <button className="s-btn run" disabled>▶ Run</button>
          <button className="s-btn clear" disabled>🗑 Clear</button>
        </div>
        <div className="scriptarea-noborder">
          <div className="s-hint">Select an actor (stage) or a robot (simulator) to edit scripts</div>
        </div>
      </div>
    );
  }

  const scripts = editableTarget.scripts || [];

  return (
    <div className="scriptarea-root">
      <div className="scriptarea-buttons">
        <button
          className="s-btn run"
          onClick={handleRunClick}
          disabled={!scripts.length}
        >
          ▶ Run
        </button>
        <button
          className="s-btn clear"
          onClick={() => {
            dispatch(pushUndoState());
            if (editableTarget.type === 'simulatorRobot') {
              dispatch(clearSimulatorScript({ robotId: editableTarget.id }));
            } else {
              dispatch(clearScript({ actorId: editableTarget.id }));
            }
          }}
          disabled={!scripts.length}
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
          {scripts.length === 0 ? (
            <div className="s-hint">Drop blocks here to build your script</div>
          ) : (
            scripts.map((b, i) => {
              // Camera control block rendering
              if (b.type === 'camera') {
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

                        dispatch(setCameraState(newState));

                        if (newState === 'on') {
                          window.humanDetectionController?.startCamera();
                        } else {
                          window.humanDetectionController?.stopCamera();
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
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
