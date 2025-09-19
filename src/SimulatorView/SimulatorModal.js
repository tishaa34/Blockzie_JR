import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  removeObstacleFromScene, 
  moveObstacleInScene, 
  getCurrentSimulatorBackground,
  removeColoredAreaFromScene,
  moveColoredAreaInScene
} from '../utils/runScript';
import '../css/SimulatorView.css';

const SimulatorModal = ({ onClose, background }) => {
  const [stageRect, setStageRect] = useState(null);
  const [draggedObstacle, setDraggedObstacle] = useState(null);
  const [draggedColoredArea, setDraggedColoredArea] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoveredObstacle, setHoveredObstacle] = useState(null);
  const [hoveredColoredArea, setHoveredColoredArea] = useState(null);
  const [simulatorBg, setSimulatorBg] = useState(getCurrentSimulatorBackground());
  
  const dispatch = useDispatch();
  
  // Get obstacles from Redux store
  const currentSceneIndex = useSelector(state => state.scene.currentSceneIndex);
  const obstacles = useSelector(state => {
    const scene = state.scene.scenes[currentSceneIndex];
    return scene?.obstacles || [];
  });

  // Get colored areas from Redux store
  const coloredAreas = useSelector(state => {
    const scene = state.scene.scenes[currentSceneIndex];
    return scene?.coloredAreas || [];
  });

  console.log('SimulatorModal obstacles:', obstacles);
  console.log('SimulatorModal coloredAreas:', coloredAreas);

  // Listen for background changes from localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      setSimulatorBg(getCurrentSimulatorBackground());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('simulatorBackgroundChanged', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('simulatorBackgroundChanged', handleStorageChange);
    };
  }, []);

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

  // Handle obstacle dragging
  const handleMouseDown = (e, obstacle) => {
    e.preventDefault();
    setDraggedObstacle(obstacle);
    const rect = e.target.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // Handle colored area dragging
  const handleColoredAreaMouseDown = (e, coloredArea) => {
    e.preventDefault();
    setDraggedColoredArea(coloredArea);
    const rect = e.target.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // Updated handleMouseMove to handle both obstacles and colored areas
  const handleMouseMove = useCallback((e) => {
    if (draggedObstacle && stageRect) {
      const newX = e.clientX - stageRect.left - dragOffset.x;
      const newY = e.clientY - stageRect.top - dragOffset.y;
      
      const boundedX = Math.max(0, Math.min(newX, stageRect.width - 50));
      const boundedY = Math.max(0, Math.min(newY, stageRect.height - 50));
      
      moveObstacleInScene(draggedObstacle.id, boundedX, boundedY, dispatch);
    } else if (draggedColoredArea && stageRect) {
      const newX = e.clientX - stageRect.left - dragOffset.x;
      const newY = e.clientY - stageRect.top - dragOffset.y;
      
      const boundedX = Math.max(0, Math.min(newX, stageRect.width - 60));
      const boundedY = Math.max(0, Math.min(newY, stageRect.height - 60));
      
      moveColoredAreaInScene(draggedColoredArea.id, boundedX, boundedY, dispatch);
    }
  }, [draggedObstacle, draggedColoredArea, stageRect, dragOffset, dispatch]);

  // Updated handleMouseUp to handle both
  const handleMouseUp = useCallback(() => {
    setDraggedObstacle(null);
    setDraggedColoredArea(null);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (draggedObstacle || draggedColoredArea) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedObstacle, draggedColoredArea, handleMouseMove, handleMouseUp]);

  // Handle obstacle removal
  const handleRemoveObstacle = (obstacleId, e) => {
    e.stopPropagation();
    console.log('Removing obstacle:', obstacleId);
    removeObstacleFromScene(obstacleId, dispatch);
  };

  // Handle colored area removal
  const handleRemoveColoredArea = (coloredAreaId, e) => {
    e.stopPropagation();
    console.log('Removing colored area:', coloredAreaId);
    removeColoredAreaFromScene(coloredAreaId, dispatch);
  };

  // Handle mouse enter/leave for obstacles
  const handleObstacleMouseEnter = (obstacleId) => {
    setHoveredObstacle(obstacleId);
  };

  const handleObstacleMouseLeave = () => {
    setHoveredObstacle(null);
  };

  // Handle mouse enter/leave for colored areas
  const handleColoredAreaMouseEnter = (coloredAreaId) => {
    setHoveredColoredArea(coloredAreaId);
  };

  const handleColoredAreaMouseLeave = () => {
    setHoveredColoredArea(null);
  };

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
  };

  // Use simulator-specific background
  console.log('Using simulator background:', simulatorBg);
  modalStyle.backgroundImage = `url(${simulatorBg})`;
  modalStyle.backgroundSize = 'cover';
  modalStyle.backgroundPosition = 'center';

  return (
    <div style={modalStyle}>
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(255, 255, 255, 0.8)',
          border: 'none',
          borderRadius: '50%',
          width: '30px',
          height: '30px',
          cursor: 'pointer',
          fontSize: '18px',
          zIndex: 15
        }}
      >
        ×
      </button>

      {/* Render obstacles */}
      {obstacles.map((obstacle) => {
        console.log('Rendering obstacle:', obstacle);
        const isHovered = hoveredObstacle === obstacle.id;
        
        return (
          <div
            key={obstacle.id}
            className="simulator-obstacle"
            style={{
              position: 'absolute',
              left: `${obstacle.x || 0}px`,
              top: `${obstacle.y || 0}px`,
              width: `${obstacle.width || 50}px`,
              height: `${obstacle.height || 50}px`,
              cursor: draggedObstacle?.id === obstacle.id ? 'grabbing' : 'grab',
              zIndex: 12
            }}
            onMouseDown={(e) => handleMouseDown(e, obstacle)}
            onMouseEnter={() => handleObstacleMouseEnter(obstacle.id)}
            onMouseLeave={handleObstacleMouseLeave}
          >
            <div 
              className={`obstacle-shape ${obstacle.shape || 'square'}`}
              style={{ 
                backgroundColor: obstacle.color || '#ff6b6b',
                width: '100%',
                height: '100%',
                position: 'relative',
                borderRadius: obstacle.shape === 'circle' ? '50%' : 
                           obstacle.shape === 'square' || obstacle.shape === 'rectangle' ? '4px' : '0'
              }}
            >
              {/* Triangle shape */}
              {obstacle.shape === 'triangle' && (
                <div style={{
                  width: 0,
                  height: 0,
                  borderLeft: '25px solid transparent',
                  borderRight: '25px solid transparent',
                  borderBottom: `45px solid ${obstacle.color}`,
                  position: 'absolute',
                  top: '5px',
                  left: '0'
                }} />
              )}
              
              {/* Pentagon shape */}
              {obstacle.shape === 'pentagon' && (
                <div style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: obstacle.color,
                  clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
                  position: 'absolute',
                  top: 0,
                  left: 0
                }} />
              )}
              
              {/* Hexagon shape */}
              {obstacle.shape === 'hexagon' && (
                <div style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: obstacle.color,
                  clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
                  position: 'absolute',
                  top: 0,
                  left: 0
                }} />
              )}

              {/* Remove button - Only visible on hover */}
              {isHovered && (
                <button
                  className="obstacle-remove-btn"
                  onClick={(e) => handleRemoveObstacle(obstacle.id, e)}
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: '#ff4757',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 13,
                    transition: 'all 0.2s ease-in-out',
                    transform: 'scale(1.1)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Render colored areas (NO TEXT - just colored blocks) */}
      {coloredAreas.map((coloredArea) => {
        console.log('Rendering colored area:', coloredArea);
        const isHovered = hoveredColoredArea === coloredArea.id;
        
        return (
          <div
            key={coloredArea.id}
            className="simulator-colored-area"
            style={{
              position: 'absolute',
              left: `${coloredArea.x || 0}px`,
              top: `${coloredArea.y || 0}px`,
              width: `${coloredArea.width || 60}px`,
              height: `${coloredArea.height || 60}px`,
              cursor: draggedColoredArea?.id === coloredArea.id ? 'grabbing' : 'grab',
              zIndex: 11
            }}
            onMouseDown={(e) => handleColoredAreaMouseDown(e, coloredArea)}
            onMouseEnter={() => handleColoredAreaMouseEnter(coloredArea.id)}
            onMouseLeave={handleColoredAreaMouseLeave}
          >
            <div 
              style={{ 
                backgroundColor: coloredArea.color || '#ffeb3b',
                width: '100%',
                height: '100%',
                position: 'relative',
                borderRadius: '4px',
                boxSizing: 'border-box',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                border: '1px solid rgba(0,0,0,0.1)'
              }}
            >
              {/* NO TEXT - Just a colored block */}
              
              {/* Remove button - Only visible on hover */}
              {isHovered && (
                <button
                  className="colored-area-remove-btn"
                  onClick={(e) => handleRemoveColoredArea(coloredArea.id, e)}
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: '#ff4757',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 13,
                    transition: 'all 0.2s ease-in-out',
                    transform: 'scale(1.1)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SimulatorModal;
