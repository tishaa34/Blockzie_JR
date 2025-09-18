import React, { useState, useEffect, useCallback } from 'react';
import '../css/SimulatorView.css';

const SimulatorModal = ({ onClose, background }) => {
  const [stageRect, setStageRect] = useState(null);

  const updateStageRect = useCallback(() => {
    const stageElement = document.querySelector('.stage-area-section');
    if (stageElement) {
      setStageRect(stageElement.getBoundingClientRect());
    }
  }, []);

  useEffect(() => {
    updateStageRect();
    window.addEventListener('resize', updateStageRect);
    return () => window.removeEventListener('resize', updateStageRect);
  }, [updateStageRect]);

  if (!stageRect) return null;

  const modalStyle = {
    position: 'fixed',
    top: `${stageRect.top}px`,
    left: `${stageRect.left}px`,
    width: `${stageRect.width}px`,
    height: `${stageRect.height}px`,
    zIndex: 10,
    borderRadius: '12px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    // backgroundColor: '#000' // fallback
  };

  // Background applied directly to the STAGE AREA
  const stageStyle = {
    flexGrow: 1,
    width: '100%',
    height: '100%',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  if (background && (background.startsWith('#') || background.startsWith('rgb'))) {
    stageStyle.backgroundColor = background;
  } else if (background) {
    stageStyle.backgroundImage = `url(${background})`;
  }

  return (
    <div className="simulator-modal" style={modalStyle}>
      <button className="simulator-close-btn" onClick={onClose}>
        <img src="./assets/ui/closeit.svg" alt="Close" />
      </button>

      <div className="simulator-stage-area" style={stageStyle}>
        {/* Background shows here */}
      </div>
    </div>
  );
};

export default SimulatorModal;
