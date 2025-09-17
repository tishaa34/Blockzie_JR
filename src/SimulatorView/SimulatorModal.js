import React, { useState, useEffect, useCallback } from 'react';
import '../css/SimulatorView.css';

const SimulatorModal = ({ onClose }) => {
  const [stageRect, setStageRect] = useState(null);

  // 🔹 Update rect whenever window resizes
  const updateStageRect = useCallback(() => {
    const stageElement =
      document.querySelector('.stage-area-section') ||
      document.querySelector('[class*="stage"]') ||
      document.querySelector('.stage') ||
      document.querySelector('.middle-section .stage-area-section');

    if (stageElement) {
      const rect = stageElement.getBoundingClientRect();
      setStageRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    }
  }, []);

  useEffect(() => {
    updateStageRect();
    window.addEventListener('resize', updateStageRect);
    return () => window.removeEventListener('resize', updateStageRect);
  }, [updateStageRect]);

  if (!stageRect) return null; // wait until rect is ready

  return (
    <div
      className="simulator-modal"
      style={{
        position: 'fixed',
        top: `${stageRect.top}px`,
        left: `${stageRect.left}px`,
        width: `${stageRect.width}px`,
        height: `${stageRect.height}px`,
        backgroundColor: '#000',
        zIndex: 10,
        borderRadius: '12px',
        overflow: 'hidden',
        border: 'none',
      }}
    >
      {/* Close Button */}
      <button className="simulator-close-btn" onClick={onClose}>
        <img src="./assets/ui/closeit.svg" alt="Close" />
      </button>

      {/* Simulator Stage Area */}
      <div className="simulator-stage-area">
        <p>Simulator Mode Active</p>
      </div>
    </div>
  );
};

export default SimulatorModal;