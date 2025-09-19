import React from 'react';
import { useDispatch } from 'react-redux';
import { addColoredAreaToScene } from '../../utils/runScript';
import '../../css/ColoredAreaGallery.css';

const ColoredAreaGallery = ({ open, onClose }) => {
  console.log("ColoredAreaGallery rendered with open:", open);
  
  const dispatch = useDispatch();

  // Available colored area options (just colors, no text)
  const coloredAreas = [
    { id: 'yellow', name: 'Yellow Area', color: '#ffeb3b' },
    { id: 'green', name: 'Green Area', color: '#4caf50' },
    { id: 'blue', name: 'Blue Area', color: '#2196f3' },
    { id: 'red', name: 'Red Area', color: '#f44336' },
    { id: 'purple', name: 'Purple Area', color: '#9c27b0' },
    { id: 'orange', name: 'Orange Area', color: '#ff9800' },
    { id: 'pink', name: 'Pink Area', color: '#e91e63' },
    { id: 'teal', name: 'Teal Area', color: '#009688' }
  ];

  const handleAddColoredArea = (coloredArea) => {
    console.log('Adding colored area:', coloredArea);
    
    try {
      const coloredAreaData = {
        id: `coloredArea_${Date.now()}`,
        color: coloredArea.color,
        x: Math.random() * 300 + 50,
        y: Math.random() * 200 + 50,
        width: 60,
        height: 60,
        type: 'coloredArea',
        blocking: false // Non-blocking for character movement
      };
      
      console.log('Final colored area data being dispatched:', coloredAreaData);
      
      addColoredAreaToScene(coloredAreaData, dispatch);
      
      console.log('Colored area dispatched successfully');
      onClose();
    } catch (error) {
      console.error('Error in handleAddColoredArea:', error);
    }
  };

  if (!open) {
    console.log("ColoredAreaGallery not rendering - open is false");
    return null;
  }

  console.log("ColoredAreaGallery rendering modal");

  return (
    <div className="colored-area-gallery-overlay">
      <div className="colored-area-gallery-modal">
        <div className="colored-area-gallery-header">
          <h3>Add Colored Area</h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="colored-area-gallery-content">
          <div className="colored-areas-grid">
            {coloredAreas.map((coloredArea) => (
              <div 
                key={coloredArea.id}
                className="colored-area-item"
                onClick={() => handleAddColoredArea(coloredArea)}
              >
                <div className="colored-area-preview">
                  <div 
                    className="colored-area-sample"
                    style={{ 
                      backgroundColor: coloredArea.color,
                      width: '50px',
                      height: '50px',
                      borderRadius: '4px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  />
                </div>
                <span className="colored-area-name">{coloredArea.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColoredAreaGallery;
