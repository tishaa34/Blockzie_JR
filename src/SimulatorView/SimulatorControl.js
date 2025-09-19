import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ObstacleGallery from '../editor/ui/ObstacleGallery';
import ColoredAreaGallery from '../editor/ui/ColoredAreaGallery';
import { 
  cycleSimulatorBackground,
  uploadSimulatorBackground,
  saveProjectFromSimulator, 
  loadProjectFromSimulator,
} from '../utils/runScript';
import "../css/RightPanelControls.css";
import "../css/SimulatorView.css";

export default function SimulatorControls({ onBackgroundChange }) {
  const [showObstacleGallery, setShowObstacleGallery] = useState(false);
  const [showColoredAreaGallery, setShowColoredAreaGallery] = useState(false);
  const dispatch = useDispatch();
  const getState = useSelector(state => state);

  const handleBackgroundSelection = () => {
    console.log("Background selection clicked - cycling simulator background only");
    cycleSimulatorBackground();
  };

  const handleDrawTailLine = () => {
    console.log("Draw tail line clicked");
  };

  const handleUploadBackground = async () => {
    console.log("Upload your own background clicked");
    const success = await uploadSimulatorBackground();
    if (success) {
      console.log("✅ Background uploaded successfully");
    } else {
      console.log("❌ Background upload failed or cancelled");
    }
  };

  const handleSaveProject = () => {
    console.log("Save project clicked");
    saveProjectFromSimulator(dispatch, () => getState);
  };

  const handleLoadProject = async () => {
    console.log("Load project clicked");
    await loadProjectFromSimulator(dispatch);
  };

  const handleObstacle = () => {
    console.log("Obstacle button clicked");
    setShowObstacleGallery(true);
  };

  const handleColoredArea = () => {
    console.log("Colored area button clicked");
    setShowColoredAreaGallery(true);
  };

  const closeObstacleGallery = () => {
    console.log("Closing obstacle gallery");
    setShowObstacleGallery(false);
  };

  const closeColoredAreaGallery = () => {
    console.log("Closing colored area gallery");
    setShowColoredAreaGallery(false);
  };

  return (
    <>
      <div className="right-panel-controls">
        <button className="rp-btn" onClick={handleBackgroundSelection} title="Background Selection">
          <img src="./assets/ui/backgrounds.png" alt="Background Selection" />
        </button>
        <button className="rp-btn" onClick={handleDrawTailLine} title="Draw Tail Line">
          <img src="./assets/ui/drawTailLine.svg" alt="Draw Tail Line" />
        </button>
        <button className="rp-btn" onClick={handleUploadBackground} title="Upload Background">
          <img src="./assets/ui/upload.png" alt="Upload Background" />
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
      </div>
      
      <ObstacleGallery 
        open={showObstacleGallery} 
        onClose={closeObstacleGallery} 
      />
      
      <ColoredAreaGallery 
        open={showColoredAreaGallery} 
        onClose={closeColoredAreaGallery} 
      />
    </>
  );
}
