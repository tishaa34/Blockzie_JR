import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { addScene, removeScene, switchScene } from "../../store/sceneSlice";
import "../../css/SceneManager.css";

const STAGE_WIDTH = 640;
const STAGE_HEIGHT = 480;
const GRID_SIZE = 32;  // real grid size (main stage) // <--- Set your desired actor size here

const SCALE = 0.25; // shrink to 25% for preview
const PREVIEW_WIDTH = STAGE_WIDTH * SCALE;
const PREVIEW_HEIGHT = STAGE_HEIGHT * SCALE;
const CELL_SIZE = GRID_SIZE * SCALE;

export default function SceneManager() {
  const dispatch = useDispatch();
  const { scenes, currentSceneIndex } = useSelector((state) => state.scene);
  const basePath = "./assets/";

  // Obstacle renderer for preview
  const renderObstaclePreview = (obstacle) => {
    const size = CELL_SIZE * 2; // Obstacles are 2 cells in preview
    
    let obstacleElement;
    switch (obstacle.shape) {
      case 'square':
        obstacleElement = (
          <div
            style={{
              width: size,
              height: size,
              backgroundColor: '#4a90e2',
              borderRadius: '2px',
            }}
          />
        );
        break;
      case 'triangle':
        obstacleElement = (
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: `${size/2}px solid transparent`,
              borderRight: `${size/2}px solid transparent`,
              borderBottom: `${size}px solid #28a745`,
            }}
          />
        );
        break;
      case 'circle':
        obstacleElement = (
          <div
            style={{
              width: size,
              height: size,
              backgroundColor: '#ffc107',
              borderRadius: '50%',
            }}
          />
        );
        break;
      default:
        obstacleElement = (
          <div
            style={{
              width: size,
              height: size,
              backgroundColor: '#6c757d',
              borderRadius: '2px',
            }}
          />
        );
    }

    return (
      <div
        key={obstacle.id}
        className="scene-thumb-obstacle"
        style={{
          position: 'absolute',
          left: obstacle.x * CELL_SIZE,
          top: obstacle.y * CELL_SIZE,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      >
        {obstacleElement}
      </div>
    );
  };

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
              {/* Render obstacles in preview */}
              {scene.obstacles?.map(renderObstaclePreview)}
              
              {/* Render actors in preview */}
              {scene.actors?.map(actor => {
                if (actor.visible === false) return null;
                const actorSize = 5 * CELL_SIZE * (actor.size || 1)
                return(
                  <img
                  className="scene-thumb-character"
                  key={actor.id}
                  src={actor.image || basePath + "characters/stembot.png"}
                  alt={actor.name}
                  draggable={false}
                  visible={actor.visible}
                  style={{
                    position: "absolute",
                    width: actorSize,
                      height: actorSize,
                    left: actor.x * CELL_SIZE,
                    top: actor.y * CELL_SIZE,
                    transform: `translate(-50%, -50%) rotate(${actor.direction || 0}deg)`,
                    pointerEvents: "none",
                  }}
                />
                )
           })}
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
