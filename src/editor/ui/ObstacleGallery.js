import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { addObstacleToScene } from '../../utils/runScript'; // Import from runScript
import '../../css/ObstacleGallery.css';

const ObstacleGallery = ({ open, onClose }) => {
  console.log("ObstacleGallery rendered with open:", open);
  
  const dispatch = useDispatch();

  // Available obstacle shapes with more options
  const obstacles = [
    { id: 'square', name: 'Square', shape: 'square', color: '#ff6b6b' },
    { id: 'triangle', name: 'Triangle', shape: 'triangle', color: '#4ecdc4' },
    { id: 'circle', name: 'Circle', shape: 'circle', color: '#45b7d1' },
    { id: 'rectangle', name: 'Rectangle', shape: 'rectangle', color: '#96ceb4' },
  ];

  // Add obstacle to scene directly when clicked
  const handleAddObstacle = (obstacle) => {
    console.log('Adding obstacle:', obstacle);
    
    try {
      // Create obstacle with all required properties
      const obstacleData = {
        id: `obstacle_${Date.now()}`,
        shape: obstacle.shape,
        name: obstacle.name,
        color: obstacle.color,
        x: Math.random() * 300 + 50,
        y: Math.random() * 200 + 50,
        width: 50,
        height: 50,
        type: 'obstacle'
      };
      
      console.log('Final obstacle data being dispatched:', obstacleData);
      
      // Use the function from runScript.js
      addObstacleToScene(obstacleData, dispatch);
      
      console.log('Obstacle dispatched successfully');
      onClose();
    } catch (error) {
      console.error('Error in handleAddObstacle:', error);
    }
  };

  if (!open) {
    console.log("ObstacleGallery not rendering - open is false");
    return null;
  }

  console.log("ObstacleGallery rendering modal");

  return (
    <div className="obstacle-gallery-overlay">
      <div className="obstacle-gallery-modal">
        <div className="obstacle-gallery-header">
          <h3>Select Obstacle</h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="obstacle-gallery-content">
          <div className="obstacles-grid">
            {obstacles.map((obstacle) => (
              <div 
                key={obstacle.id}
                className="obstacle-item"
                onClick={() => handleAddObstacle(obstacle)}
              >
                <div className="obstacle-preview">
                  <div 
                    className={`obstacle-shape ${obstacle.shape}`}
                    style={{ backgroundColor: obstacle.color }}
                  ></div>
                </div>
                <span className="obstacle-name">{obstacle.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ObstacleGallery;
