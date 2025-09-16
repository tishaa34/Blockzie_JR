import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { addObstacle } from '../../store/sceneSlice'; // Import the action
import '../../css/ObstacleGallery.css';

const ObstacleGallery = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const [selectedObstacle, setSelectedObstacle] = useState(null);

  // Available obstacle shapes
  const obstacles = [
    { id: 'square', name: 'Square', shape: 'square' },
    { id: 'triangle', name: 'Triangle', shape: 'triangle' },
    { id: 'circle', name: 'Circle', shape: 'circle' }
  ];

  // Add obstacle to scene
  const handleAddObstacle = (obstacle) => {
    console.log('Adding obstacle:', obstacle);
    setSelectedObstacle(obstacle);
  };

  // Add to scene and close
  const handleAddToScene = () => {
    if (selectedObstacle) {
      dispatch(addObstacle({ obstacle: selectedObstacle }));
      setSelectedObstacle(null);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="obstacle-gallery-overlay">
      <div className="obstacle-gallery">
        <div className="obstacle-gallery-header">
          <h3>Add Obstacles</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="obstacle-gallery-content">
          <div className="obstacle-shapes">
            {obstacles.map((obstacle) => (
              <div 
                key={obstacle.id} 
                className={`obstacle-item ${selectedObstacle?.id === obstacle.id ? 'selected' : ''}`}
                onClick={() => handleAddObstacle(obstacle)}
              >
                <div className={`obstacle-shape ${obstacle.shape}`}></div>
                <span>{obstacle.name}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="obstacle-gallery-footer">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="add-btn" onClick={handleAddToScene} disabled={!selectedObstacle}>
            Add to Scene
          </button>
        </div>
      </div>
    </div>
  );
};

export default ObstacleGallery;
