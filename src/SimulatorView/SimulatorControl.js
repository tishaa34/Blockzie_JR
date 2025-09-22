import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ObstacleGallery from '../editor/ui/ObstacleGallery';
import ColoredAreaGallery from '../editor/ui/ColoredAreaGallery';
import { 
  cycleSimulatorBackground,
  uploadSimulatorBackground,
  saveProjectFromSimulator, 
  loadProjectFromSimulator,
  cycleSimulatorRobotType
} from '../utils/runScript';
import "../css/RightPanelControls.css";
import "../css/SimulatorView.css";

// Draw Line Configuration Modal Component - Define it at the top
function DrawLineModal({ onClose, dispatch }) {
  const [lineSettings, setLineSettings] = useState(() => {
    // Load existing settings from localStorage
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
      // Apply settings to localStorage
      localStorage.setItem('simulatorDrawLineSettings', JSON.stringify(lineSettings));
      
      // Dispatch event to notify simulator components
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
      
      // Immediately apply toggle state
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
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      borderBottom: '1px solid #eee',
      paddingBottom: '10px'
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: '#666',
      padding: 0,
      width: '30px',
      height: '30px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%'
    },
    content: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    },
    settingGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    toggleContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      cursor: 'pointer'
    },
    slider: {
      width: '100%',
      height: '6px',
      borderRadius: '3px',
      background: '#ddd',
      outline: 'none',
      cursor: 'pointer'
    },
    colorPickerContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    colorPicker: {
      width: '50px',
      height: '35px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    },
    previewSection: {
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef'
    },
    footer: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '10px',
      marginTop: '20px',
      borderTop: '1px solid #eee',
      paddingTop: '15px'
    },
    btn: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '500',
      transition: 'all 0.2s ease'
    },
    applyBtn: {
      backgroundColor: '#4A90E2',
      color: 'white'
    },
    cancelBtn: {
      backgroundColor: '#6c757d',
      color: 'white'
    }
  };

  return (
    <div style={modalStyles.modalBackdrop} onClick={onClose}>
      <div style={modalStyles.modal} onClick={e => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h3 style={{ margin: 0, color: '#333', fontSize: '18px' }}>✏️ Draw Line Configuration</h3>
          <button style={modalStyles.closeBtn} onClick={onClose}>×</button>
        </div>
        
        <div style={modalStyles.content}>
          <div style={modalStyles.settingGroup}>
            <label style={modalStyles.toggleContainer}>
              <input 
                type="checkbox"
                checked={lineSettings.enabled}
                onChange={handleToggleDrawing}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>Enable Drawing Trail</span>
            </label>
          </div>

          <div style={modalStyles.settingGroup}>
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
              style={modalStyles.slider}
            />
          </div>

          <div style={modalStyles.settingGroup}>
            <label style={{ fontWeight: '500', color: '#333', fontSize: '14px' }}>
              Line Size: {lineSettings.size}px
            </label>
            <input 
              type="range"
              min="5"
              max="20"
              value={lineSettings.size}
              onChange={(e) => setLineSettings({
                ...lineSettings, 
                size: parseInt(e.target.value)
              })}
              style={modalStyles.slider}
            />
          </div>

          <div style={modalStyles.settingGroup}>
            <label style={{ fontWeight: '500', color: '#333', fontSize: '14px' }}>Line Color:</label>
            <div style={modalStyles.colorPickerContainer}>
              <input 
                type="color"
                value={lineSettings.color}
                onChange={(e) => setLineSettings({
                  ...lineSettings, 
                  color: e.target.value
                })}
                style={modalStyles.colorPicker}
              />
              <span style={{
                backgroundColor: lineSettings.color,
                width: '30px',
                height: '30px',
                borderRadius: '4px',
                display: 'inline-block',
                marginLeft: '10px',
                border: '1px solid #ccc'
              }}></span>
            </div>
          </div>

          <div style={modalStyles.previewSection}>
            <label style={{ fontWeight: '500', color: '#333', fontSize: '14px' }}>Preview:</label>
            <div style={{
              width: `${lineSettings.size * 2}px`,
              height: `${lineSettings.thickness}px`,
              backgroundColor: lineSettings.color,
              borderRadius: `${lineSettings.thickness / 2}px`,
              margin: '10px 0',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}></div>
          </div>
        </div>
        
        <div style={modalStyles.footer}>
          <button 
            style={{...modalStyles.btn, ...modalStyles.applyBtn}} 
            onClick={handleApplySettings}
          >
            Apply Settings
          </button>
          <button 
            style={{...modalStyles.btn, ...modalStyles.cancelBtn}} 
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SimulatorControls({ onBackgroundChange }) {
  const [showObstacleGallery, setShowObstacleGallery] = useState(false);
  const [showColoredAreaGallery, setShowColoredAreaGallery] = useState(false);
  const [showDrawLineModal, setShowDrawLineModal] = useState(false);
  
  const dispatch = useDispatch();
  const getState = useSelector(state => state);

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

  const closeDrawLineModal = () => {
    console.log("Closing draw line modal");
    setShowDrawLineModal(false);
  };

  return (
    <>
      <div className="right-panel-controls">
        <button className="rp-btn" onClick={handleBackgroundSelection} title="Background Selection">
          <img src="./assets/ui/backgrounds.png" alt="Background Selection" />
        </button>
        
        <button className="rp-btn" onClick={handleRobotSelection} title="Add Robot">
          <img src="./assets/ui/robot.png" alt="Add Robot" />
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
      </div>
      
      {/* Draw Line Configuration Modal */}
      {showDrawLineModal && (
        <DrawLineModal 
          onClose={closeDrawLineModal}
          dispatch={dispatch}
        />
      )}
      
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
