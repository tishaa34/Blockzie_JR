import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { addScene, removeScene, switchScene } from "../../store/sceneSlice";
import "../../css/SceneManager.css";

const STAGE_WIDTH = 640;
const STAGE_HEIGHT = 480;
const GRID_SIZE = 32;  // real grid size (main stage)
const ACTOR_SIZE = 350; // <--- Set your desired actor size here

const SCALE = 0.25; // shrink to 25% for preview
const PREVIEW_WIDTH = STAGE_WIDTH * SCALE;
const PREVIEW_HEIGHT = STAGE_HEIGHT * SCALE;
const CELL_SIZE = GRID_SIZE * SCALE;
const ACTOR_PREVIEW_SIZE = ACTOR_SIZE * SCALE; // This makes the actor size scale with thumbnail

export default function SceneManager() {
  const dispatch = useDispatch();
  const { scenes, currentSceneIndex } = useSelector((state) => state.scene);
  const basePath = "/assets/";

  return (
    <div className="scene-manager-xscroll">
      {scenes.map((scene, idx) => {
        const background = scene.background || "#ffffff";
        const bgStyle = background.startsWith("#")
          ? { backgroundColor: background }
          : {
              backgroundImage: `url(${background})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat"
            };

        return (
          <div
            key={scene.id}
            className={`scene-thumb-h ${idx === currentSceneIndex ? "selected" : ""}`}
            onClick={() => dispatch(switchScene(idx))}
            title={`Page ${idx + 1}`}
          >
            <div
              className="scene-thumb-preview"
              style={{
                ...bgStyle,
                width: PREVIEW_WIDTH,
                height: PREVIEW_HEIGHT,
                position: "relative",
                border: "1px solid #ddd",
                borderRadius: "6px",
                overflow: "hidden",
                boxSizing: "border-box"
              }}
            >
              {scene.actors?.map(actor => (
                <img
                  className="scene-thumb-character"
                  key={actor.id}
                  src={actor.image || basePath + "characters/stembot.png"}
                  alt={actor.name}
                  draggable={false}
                  style={{
                    position: "absolute",
                    width: ACTOR_PREVIEW_SIZE,
                    height: ACTOR_PREVIEW_SIZE,
                    left: actor.x * CELL_SIZE,
                    top: actor.y * CELL_SIZE,
                    transform: `translate(-50%, -50%) rotate(${actor.direction || 0}deg)`,
                    pointerEvents: "none",
                  }}
                />
              ))}
            </div>

            <span className="scene-badge">{idx + 1}</span>

            {scenes.length > 1 && (
              <button
                className="scene-remove-btn"
                onClick={e => {
                  e.stopPropagation();
                  dispatch(removeScene(idx));
                }}
                title="Delete page"
                tabIndex={-1}
                aria-label={`Delete page ${idx + 1}`}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
      <div
        className="scene-plus-h"
        onClick={() => dispatch(addScene())}
        title="Add page"
      >
        <img src={basePath + "ui/newpage.png"} alt="Add New Scene" draggable={false} />
      </div>
    </div>
  );
}