import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { run } from "../../utils/runScript";
import BackgroundGallery from "./BackgroundGallery";
import SimulatorModal from "../../SimulatorView/SimulatorModal";
import ObstacleGallery from "../../editor/ui/ObstacleGallery";
import ColoredAreaGallery from "../../editor/ui/ColoredAreaGallery";
import { 
  cycleSimulatorBackground,
  uploadSimulatorBackground,
  saveProjectFromSimulator, 
  loadProjectFromSimulator,
  cycleSimulatorRobotType
} from "../../utils/runScript";
import "../../css/RightPanelControls.css";
import "../../css/SimulatorView.css";

// Draw Line Configuration Modal Component
function DrawLineModal({ onClose, dispatch }) {
  const [lineSettings, setLineSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('simulatorDrawLineSettings');
      return stored ? JSON.parse(stored) : {
        enabled: false,
        thickness: 3,
        size: 10,
        color: '#FF0000'
      };
    } catch (error) {
      return {
        enabled: false,
        thickness: 3,
        size: 10,
        color: '#FF0000'
      };
    }
  });

  const handleApplySettings = () => {
    try {
      localStorage.setItem('simulatorDrawLineSettings', JSON.stringify(lineSettings));
      window.dispatchEvent(new CustomEvent('drawLineSettingsChanged', {
        detail: lineSettings
      }));
      console.log("✅ Draw line settings applied:", lineSettings);
      onClose();
    } catch (error) {
      console.error("Error applying settings:", error);
    }
  };

  const handleToggleDrawing = () => {
    try {
      const newSettings = { ...lineSettings, enabled: !lineSettings.enabled };
      setLineSettings(newSettings);
      localStorage.setItem('simulatorDrawLineSettings', JSON.stringify(newSettings));
      window.dispatchEvent(new CustomEvent('drawLineSettingsChanged', {
        detail: newSettings
      }));
    } catch (error) {
      console.error("Error toggling drawing:", error);
    }
  };

  const modalStyles = {
    modalBackdrop: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    modal: {
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      maxWidth: '400px',
      width: '90%',
      maxHeight: '80vh',
      overflow: 'auto',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
    }
  };

  return (
    <div style={modalStyles.modalBackdrop} onClick={onClose}>
      <div style={modalStyles.modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#333', fontSize: '18px' }}>✏️ Draw Line Configuration</h3>
          <button style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }} onClick={onClose}>×</button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input 
                type="checkbox"
                checked={lineSettings.enabled}
                onChange={handleToggleDrawing}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>Enable Drawing Trail</span>
            </label>
          </div>

          <div>
            <label style={{ fontWeight: '500', color: '#333', fontSize: '14px' }}>
              Line Thickness: {lineSettings.thickness}px
            </label>
            <input 
              type="range"
              min="1"
              max="10"
              value={lineSettings.thickness}
              onChange={(e) => setLineSettings({
                ...lineSettings, 
                thickness: parseInt(e.target.value)
              })}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontWeight: '500', color: '#333', fontSize: '14px' }}>Line Color:</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input 
                type="color"
                value={lineSettings.color}
                onChange={(e) => setLineSettings({
                  ...lineSettings, 
                  color: e.target.value
                })}
                style={{ width: '50px', height: '35px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button 
            style={{ padding: '10px 20px', backgroundColor: '#4A90E2', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            onClick={handleApplySettings}
          >
            Apply Settings
          </button>
          <button 
            style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RightPanelControls({
  onFullScreen,
  onGridToggle,
  onHeading,
  onGreenFlag,
  selectedActorId,
  onSimulator,
  onBackgroundChange
}) {
  const dispatch = useDispatch();
  const { scenes, currentSceneIndex } = useSelector((s) => s.scene);
  const scene = scenes[currentSceneIndex];
  const actor = scene?.actors.find((a) => a.id === selectedActorId);

  // FIXED: Get the state at component level, not inside callback
  const getState = useSelector(state => state);

  const [backgroundModalOpen, setBackgroundModalOpen] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Your simulator control states
  const [showObstacleGallery, setShowObstacleGallery] = useState(false);
  const [showColoredAreaGallery, setShowColoredAreaGallery] = useState(false);
  const [showDrawLineModal, setShowDrawLineModal] = useState(false);

  // Your original handler functions
  const handleBackgroundSelection = () => {
    console.log("Background selection clicked - cycling simulator background only");
    cycleSimulatorBackground();
  };

  const handleRobotSelection = () => {
    console.log("Robot selection clicked - cycling to next robot type");
    cycleSimulatorRobotType(dispatch);
  };

  const handleDrawTailLine = () => {
    console.log("Draw tail line clicked");
    setShowDrawLineModal(true);
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

  // FIXED: Remove useSelector from inside callback
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

  // Handle opening simulator with slide animation
  const handleSimulatorToggle = () => {
    if (isAnimating) return;

    if (!simulatorOpen) {
      setIsAnimating(true);
      setSimulatorOpen(true);
      
      setTimeout(() => {
        setIsAnimating(false);
      }, 400);

      if (onSimulator) {
        onSimulator();
      }
    } else {
      setIsAnimating(true);
      
      setTimeout(() => {
        setSimulatorOpen(false);
        setIsAnimating(false);
      }, 400);
    }
  };

  const closeSimulator = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    
    setTimeout(() => {
      setSimulatorOpen(false);
      setIsAnimating(false);
    }, 400);
  };

  useEffect(() => {
    return () => {
      // Cleanup
    };
  }, []);

  return (
    <>
      <div className="right-panel-controls">
             <button className="rp-btn" onClick={onFullScreen} title="Fullscreen">
              <img src="./assets/ui/FullOff.svg" alt="Fullscreen" />
            </button>
            <button className="rp-btn" onClick={onGridToggle} title="Grid Toggle">
              <img src="./assets/ui/gridOn.svg" alt="Grid" />
            </button>
            <button className="rp-btn" onClick={onHeading} title="Add Heading">
              <img src="./assets/ui/addText.svg" alt="Add Heading" />
            </button>
            <button className="rp-btn" onClick={() => setBackgroundModalOpen(true)} title="Choose Background">
              <img src="./assets/ui/scene1.svg" alt="Background" />
            </button>
            <button className="rp-btn" onClick={() => run(actor, dispatch, scene?.sounds, actor.id)} title="Green Flag">
              <img src="./assets/ui/go.svg" alt="Green Flag" />
            </button>
        {/* Modified Simulator Button - Now with sliding functionality */}
            <button className="rp-btn" onClick={handleSimulatorToggle} disabled={isAnimating} title="Simulator">
              <img src="./assets/ui/simulator.png" alt="Simulator" />
            </button>
      </div>

      {/* Sliding Simulator with YOUR VERTICAL BUTTONS */}
      {simulatorOpen && (
        <>
          <div 
            className={`simulator-partial-overlay ${simulatorOpen ? 'active' : ''}`}
            onClick={closeSimulator}
          />
          
          <div className={`simulator-partial-container ${simulatorOpen ? 'open' : ''}`}>
            <div className="simulator-header">
              <h3 className="simulator-title">🤖 Robot Simulator</h3>
              <button 
                className="simulator-close-btn"
                onClick={closeSimulator}
              >
                ×
              </button>
            </div>

            <div className="simulator-content">
              {/* YOUR VERTICAL BUTTONS - EXACT SAME AS YOUR SIMULATOR CONTROL */}
              <div className="simulator-controls-vertical">
                <button className="simulator-control-btn" onClick={handleBackgroundSelection} title="Background Selection">
                  <img src="./assets/ui/backgrounds.png" alt="Background Selection" />
                </button>
                
                <button className="simulator-control-btn" onClick={handleRobotSelection} title="Add Robot">
                  <img src="./assets/ui/robot.png" alt="Add Robot" />
                </button>
                
                <button className="simulator-control-btn" onClick={handleDrawTailLine} title="Draw Tail Line">
                  <img src="./assets/ui/drawTailLine.svg" alt="Draw Tail Line" />
                </button>
                
                <button className="simulator-control-btn" onClick={handleUploadBackground} title="Upload Background">
                  <img src="./assets/ui/uploadBg.svg" alt="Upload Background" />
                </button>
                
                <button className="simulator-control-btn" onClick={handleSaveProject} title="Save Project">
                  <img src="./assets/ui/save.png" alt="Save Project" />
                </button>
                
                <button className="simulator-control-btn" onClick={handleLoadProject} title="Load Project">
                  <img src="./assets/ui/load.png" alt="Load Project" />
                </button>
                
                <button className="simulator-control-btn" onClick={handleObstacle} title="Obstacle">
                  <img src="./assets/ui/Obstacle.png" alt="Obstacle" />
                </button>
                
                <button className="simulator-control-btn" onClick={handleColoredArea} title="Colored Area">
                  <img src="./assets/ui/coloredArea.svg" alt="Colored Area" />
                </button>
              </div>

              {/* Stage container */}
              <div className="simulator-stage-wrapper">
                <div className="stage-area-section" style={{ width: '100%', height: '100%', position: 'relative' }}>
                  <SimulatorModal onClose={closeSimulator} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Your Modals */}
      {showDrawLineModal && (
        <DrawLineModal 
          onClose={() => setShowDrawLineModal(false)}
          dispatch={dispatch}
        />
      )}
      
      {showObstacleGallery && (
        <ObstacleGallery 
          onClose={() => setShowObstacleGallery(false)} 
        />
      )}
      
      {showColoredAreaGallery && (
        <ColoredAreaGallery 
          onClose={() => setShowColoredAreaGallery(false)} 
        />
      )}
    </>
  );
}
