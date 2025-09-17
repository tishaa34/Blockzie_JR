import React from 'react';

const SimulatorModal = ({ onClose }) => {
  return (
    <div className="simulator-modal">
      <div className="simulator-modal-content">
        <button className="simulator-close-btn" onClick={onClose}>
          <img src="./assets/ui/closeit.svg" alt="Close" />
        </button>
        <div className="simulator-stage-area">
          {/* Your simulator's stage content goes here */}
          <p>Simulator Mode Active</p>
        </div>
      </div>
    </div>
  );
};

export default SimulatorModal;
