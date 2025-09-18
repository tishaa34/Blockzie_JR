import React from 'react';
import "../css/RightPanelControls.css";
import "../css/SimulatorView.css";

export default function SimulatorControls({ onBackgroundChange }) {
  const handleBackgroundSelection = () => {
    console.log("Background selection clicked");
    if (onBackgroundChange) {
      onBackgroundChange();
    }
  };

  const handleDrawTailLine = () => {
    console.log("Draw tail line clicked");
  };

  const handleUploadBackground = () => {
    console.log("Upload your own background clicked");
  };

  const handleSaveProject = () => {
    console.log("Save project clicked");
  };

  const handleLoadProject = () => {
    console.log("Load project clicked");
  };

  const handleObstacle = () => {
    console.log("Obstacle button clicked");
  };

  const handleColoredArea = () => {
    console.log("Colored area button clicked");
  };

  return (
    <>
      <button className="rp-btn" onClick={handleBackgroundSelection} title="Background Selection">
        <img src="./assets/ui/backgrounds.png" alt="Background Selection" />
      </button>
      <button className="rp-btn" onClick={handleDrawTailLine} title="Draw Tail Line">
        <img src="./assets/ui/drawTailLine.svg" alt="Draw Tail Line" />
      </button>
      <button className="rp-btn" onClick={handleUploadBackground} title="Upload Background">
        <img src="./assets/ui/uploadBg.svg" alt="Upload Background" />
      </button>
      <button className="rp-btn" onClick={handleSaveProject} title="Save Project">
        <img src="./assets/ui/save.png" alt="Save Project" />
      </button>
      <button className="rp-btn" onClick={handleLoadProject} title="Load Project">
        <img src="./assets/ui/load.png" alt="Load Project" />
      </button>
      <button className="rp-btn" onClick={handleObstacle} title="Obstacle">
        <img src="./assets/ui/Obstacle.png" alt="Obstacle" />
      </button>
      <button className="rp-btn" onClick={handleColoredArea} title="Colored Area">
        <img src="./assets/ui/coloredArea.svg" alt="Colored Area" />
      </button>
    </>
  );
}
