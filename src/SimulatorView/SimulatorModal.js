import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  removeObstacleFromScene,
  moveObstacleInScene,
  getCurrentSimulatorBackground,
  removeColoredAreaFromScene,
  moveColoredAreaInScene,
  removeSimulatorRobotFromScene,
  moveSimulatorRobotInScene,
} from '../utils/runScript';
import { run } from '../utils/runScript';
import '../css/SimulatorView.css';
import { setSelectedSimRobot, removeSimulatorRobot } from '../store/sceneSlice';

const SimulatorModal = ({ onClose, background }) => {
  const [stageRect, setStageRect] = useState(null);
  const [draggedObstacle, setDraggedObstacle] = useState(null);
  const [draggedColoredArea, setDraggedColoredArea] = useState(null);
  const [draggedRobot, setDraggedRobot] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoveredObstacle, setHoveredObstacle] = useState(null);
  const [hoveredColoredArea, setHoveredColoredArea] = useState(null);
  const [hoveredRobot, setHoveredRobot] = useState(null);
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

  // Get simulator robots from Redux store
  const simulatorRobots = useSelector(state => state.scene.simulatorRobots || []);
  const selectedSimRobotId = useSelector(state => state.scene.selectedSimRobotId);
  const sounds = useSelector(state => {
    const scene = state.scene.scenes[currentSceneIndex];
    return scene?.sounds || { pop: './assets/sounds/pop.mp3' };
  });

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

  // Force re-render when simulatorRobots change (for debug)
  useEffect(() => {
    // no-op other than letting React re-render and logging
    console.log('🤖 SimulatorModal detected robot changes:', simulatorRobots.length);
    simulatorRobots.forEach((robot, index) => {
      console.log(`🤖 Robot ${index}: ${robot.name} at (${robot.x}, ${robot.y})`);
    });
  }, [simulatorRobots]);

  // Convert pixel coordinates to grid coordinates
  const pixelToGrid = (pixelX, pixelY) => {
    if (!stageRect) return { x: 0, y: 0 };
    const gridX = Math.floor((pixelX / stageRect.width) * 20);
    const gridY = Math.floor((pixelY / stageRect.height) * 15);
    return {
      x: Math.max(0, Math.min(19, gridX)),
      y: Math.max(0, Math.min(14, gridY))
    };
  };

  // Convert grid coordinates to pixel coordinates
  const gridToPixel = (gridX, gridY) => {
    if (!stageRect) return { x: 0, y: 0 };
    const pixelX = (gridX / 20) * stageRect.width;
    const pixelY = (gridY / 15) * stageRect.height;
    return { x: pixelX, y: pixelY };
  };

  // Handle obstacle dragging
  const handleMouseDown = (e, obstacle) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedObstacle(obstacle);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // Handle colored area dragging
  const handleColoredAreaMouseDown = (e, coloredArea) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedColoredArea(coloredArea);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // Handle robot dragging
  const handleRobotMouseDown = (e, robot) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedRobot(robot);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // Improved mouse move handling with proper coordinate conversion
  const handleMouseMove = useCallback((e) => {
    if (!stageRect) return;

    if (draggedObstacle) {
      const newPixelX = e.clientX - stageRect.left - dragOffset.x;
      const newPixelY = e.clientY - stageRect.top - dragOffset.y;

      const boundedPixelX = Math.max(0, Math.min(newPixelX, stageRect.width - 50));
      const boundedPixelY = Math.max(0, Math.min(newPixelY, stageRect.height - 50));

      moveObstacleInScene(draggedObstacle.id, boundedPixelX, boundedPixelY, dispatch);
    } else if (draggedColoredArea) {
      const newPixelX = e.clientX - stageRect.left - dragOffset.x;
      const newPixelY = e.clientY - stageRect.top - dragOffset.y;

      const boundedPixelX = Math.max(0, Math.min(newPixelX, stageRect.width - 60));
      const boundedPixelY = Math.max(0, Math.min(newPixelY, stageRect.height - 60));

      moveColoredAreaInScene(draggedColoredArea.id, boundedPixelX, boundedPixelY, dispatch);
    } else if (draggedRobot) {
      // Robot movement uses grid coordinates but displays as pixels
      const newPixelX = e.clientX - stageRect.left - dragOffset.x;
      const newPixelY = e.clientY - stageRect.top - dragOffset.y;

      const boundedPixelX = Math.max(0, Math.min(newPixelX, stageRect.width - 50));
      const boundedPixelY = Math.max(0, Math.min(newPixelY, stageRect.height - 50));

      const gridPos = pixelToGrid(boundedPixelX, boundedPixelY);
      moveSimulatorRobotInScene(draggedRobot.id, gridPos.x, gridPos.y, dispatch);
    }
  }, [draggedObstacle, draggedColoredArea, draggedRobot, stageRect, dragOffset, dispatch]);

  // Updated handleMouseUp
  const handleMouseUp = useCallback(() => {
    setDraggedObstacle(null);
    setDraggedColoredArea(null);
    setDraggedRobot(null);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (draggedObstacle || draggedColoredArea || draggedRobot) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedObstacle, draggedColoredArea, draggedRobot, handleMouseMove, handleMouseUp]);

  const handleRemoveObstacle = (obstacleId, e) => {
    e.stopPropagation();
    removeObstacleFromScene(obstacleId, dispatch);
  };

  const handleRemoveColoredArea = (coloredAreaId, e) => {
    e.stopPropagation();
    removeColoredAreaFromScene(coloredAreaId, dispatch);
  };

  const handleRemoveRobot = (robotId, e) => {
    e.stopPropagation();
    dispatch(removeSimulatorRobot(robotId));
  };

  const handleObstacleMouseEnter = (obstacleId) => {
    setHoveredObstacle(obstacleId);
  };

  const handleObstacleMouseLeave = () => {
    setHoveredObstacle(null);
  };

  const handleColoredAreaMouseEnter = (coloredAreaId) => {
    setHoveredColoredArea(coloredAreaId);
  };

  const handleColoredAreaMouseLeave = () => {
    setHoveredColoredArea(null);
  };

  const handleRobotMouseEnter = (robotId) => {
    setHoveredRobot(robotId);
  };

  const handleRobotMouseLeave = () => {
    setHoveredRobot(null);
  };

  // When robot is clicked: set it as the selectedSimRobot (for editing in ScriptArea)
  // and also run its script (preserving previous behavior).
  const handleRobotClick = async (robot, e) => {
    e.stopPropagation();

    // select this robot for editing
    dispatch(setSelectedSimRobot(robot.id));

    if (robot.scripts && robot.scripts.length > 0) {
      console.log('🤖 Running robot script:', robot.name);
      try {
        await run(robot, dispatch, sounds, robot.id);
      } catch (err) {
        console.error('Error running robot script:', err);
      }
    } else {
      console.log('🤖 Robot has no scripts to run:', robot.name);
    }
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

  modalStyle.backgroundImage = `url(${simulatorBg})`;
  modalStyle.backgroundSize = 'cover';
  modalStyle.backgroundPosition = 'center';

  return (
    <div className="simulator-modal-container" style={modalStyle}>
      <button
        onClick={() => {
          // clear selection when closing simulator
          dispatch(setSelectedSimRobot(null));
          onClose();
        }}
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

      {/* Obstacles */}
      {obstacles.map((obstacle) => {
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
              zIndex: 12,
              userSelect: 'none',
              pointerEvents: 'auto'
            }}
            onMouseDown={(e) => handleMouseDown(e, obstacle)}
            onMouseEnter={() => handleObstacleMouseEnter(obstacle.id)}
            onMouseLeave={handleObstacleMouseLeave}
          >
            <div
              className={`obstacle-shape ${obstacle.shape || 'square'}`}
              style={{
                backgroundColor: obstacle.color || '#4A9FD7',
                width: '100%',
                height: '100%',
                position: 'relative',
                borderRadius: obstacle.shape === 'circle' ? '50%' : '3px',
                border: '2px solid #2A7FB7',
                boxShadow: `
                  inset 1px 1px 3px rgba(255, 255, 255, 0.3),
                  inset -1px -1px 3px rgba(0, 0, 0, 0.2),
                  2px 2px 6px rgba(0, 0, 0, 0.3)
                `,
                transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
                transition: 'all 0.1s ease-in-out'
              }}
            >
              {obstacle.shape === 'triangle' && (
                <div style={{
                  width: 0,
                  height: 0,
                  borderLeft: '23px solid transparent',
                  borderRight: '23px solid transparent',
                  borderBottom: `40px solid ${obstacle.color || '#4A9FD7'}`,
                  position: 'absolute',
                  top: '6px',
                  left: '2px',
                  filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))'
                }} />
              )}

              {obstacle.shape === 'pentagon' && (
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: `linear-gradient(135deg, 
                    ${obstacle.color || '#5BB0E8'} 0%, 
                    ${obstacle.color || '#4A9FD7'} 50%, 
                    ${obstacle.color || '#3A8FC7'} 100%
                  )`,
                  clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.2))'
                }} />
              )}

              {obstacle.shape === 'hexagon' && (
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: `linear-gradient(135deg, 
                    ${obstacle.color || '#5BB0E8'} 0%, 
                    ${obstacle.color || '#4A9FD7'} 50%, 
                    ${obstacle.color || '#3A8FC7'} 100%
                  )`,
                  clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.2))'
                }} />
              )}

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
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Colored areas (flat colored blocks) */}
      {coloredAreas.map((coloredArea) => {
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
              zIndex: 11,
              userSelect: 'none',
              pointerEvents: 'auto'
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
                border: '1px solid rgba(0, 0, 0, 0.1)'
              }}
            >
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

      {/* Simulator robots */}
      {simulatorRobots.map((robot) => {
        console.log('Rendering simulator robot:', robot);
        const isHovered = hoveredRobot === robot.id;

        const pixelPos = gridToPixel(robot.x || 0, robot.y || 0);

        return (
          <div
            key={robot.id}
            className={`simulator-robot ${selectedSimRobotId === robot.id ? 'selected-sim-robot' : ''}`}
            style={{
              position: 'absolute',
              left: `${pixelPos.x}px`,
              top: `${pixelPos.y}px`,
              width: '50px',
              height: '50px',
              cursor: draggedRobot?.id === robot.id ? 'grabbing' : 'grab',
              zIndex: 13,
              userSelect: 'none',
              pointerEvents: 'auto'
            }}
            onMouseDown={(e) => handleRobotMouseDown(e, robot)}
            onMouseEnter={() => handleRobotMouseEnter(robot.id)}
            onMouseLeave={handleRobotMouseLeave}
            onClick={(e) => handleRobotClick(robot, e)}
            title={`${robot.name} - Click to select & run script, drag to move`}
          >
            <img
              src={robot.image}
              alt={robot.name}
              style={{
                width: '100%',
                height: '100%',
                transform: `rotate(${robot.direction || 0}deg) scale(${robot.size || 1})`,
                transition: 'transform 0.2s ease',
                filter: isHovered ? 'brightness(1.2)' : 'none',
                pointerEvents: 'none'
              }}
              draggable={false}
            />

            {isHovered && (
              <button
                className="robot-remove-btn"
                onClick={(e) => handleRemoveRobot(robot.id, e)}
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
                  zIndex: 15,
                  transition: 'all 0.2s ease-in-out',
                  transform: 'scale(1.1)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SimulatorModal;
