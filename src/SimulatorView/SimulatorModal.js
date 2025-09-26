import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  removeObstacleFromScene,
  moveObstacleInScene,
  getCurrentSimulatorBackground,
  removeColoredAreaFromScene,
  moveColoredAreaInScene,
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
  const [drawLineSettings, setDrawLineSettings] = useState({
    enabled: false,
    thickness: 3,
    size: 10,
    color: '#FF0000'
  });
  const [drawnPaths, setDrawnPaths] = useState(new Map());
  
  // ADDED: Force re-render when robot positions change
  const [tick, setTick] = useState(0);
  
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

  // ADDED: Force re-render on script events
  useEffect(() => {
    const forceUpdate = () => setTick(t => t + 1);
    window.addEventListener('robotMoved', forceUpdate);
    window.addEventListener('simulatorStateChanged', forceUpdate);
    return () => {
      window.removeEventListener('robotMoved', forceUpdate);
      window.removeEventListener('simulatorStateChanged', forceUpdate);
    };
  }, []);

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


  // Listen for draw line settings changes
  useEffect(() => {
    const loadDrawLineSettings = () => {
      try {
        const stored = localStorage.getItem('simulatorDrawLineSettings');
        if (stored) {
          const settings = JSON.parse(stored);
          setDrawLineSettings(settings);
        }
      } catch (error) {
        console.error('Error loading draw line settings:', error);
      }
    };


    loadDrawLineSettings();


    const handleSettingsChange = (event) => {
      if (event.detail) {
        setDrawLineSettings(event.detail);
      }
    };


    const handleClearPaths = () => {
      setDrawnPaths(new Map());
    };


    const handleRobotMoved = (event) => {
      if (drawLineSettings.enabled && event.detail) {
        const { robotId, x, y, timestamp } = event.detail;


        setDrawnPaths(prevPaths => {
          const newPaths = new Map(prevPaths);
          const robotPath = newPaths.get(robotId) || [];


          const lastPoint = robotPath[robotPath.length - 1];
          const currentPoint = { x, y, timestamp };


          if (!lastPoint || lastPoint.x !== x || lastPoint.y !== y) {
            robotPath.push(currentPoint);


            if (robotPath.length > 500) {
              robotPath.shift();
            }


            newPaths.set(robotId, robotPath);
          }


          return newPaths;
        });
      }
    };



    window.addEventListener('drawLineSettingsChanged', handleSettingsChange);
    window.addEventListener('clearDrawnPaths', handleClearPaths);
    window.addEventListener('robotMoved', handleRobotMoved);


    return () => {
      window.removeEventListener('drawLineSettingsChanged', handleSettingsChange);
      window.removeEventListener('clearDrawnPaths', handleClearPaths);
      window.removeEventListener('robotMoved', handleRobotMoved);
    };
  }, [drawLineSettings.enabled]);


  // Track robot positions for drawing ONLY when moved by scripts (not manual drag)
  useEffect(() => {
    if (!drawLineSettings.enabled) return;


    simulatorRobots.forEach(robot => {
      if (robot.visible !== false) {
        // ONLY add to path if robot is NOT being dragged
        if (!draggedRobot || draggedRobot.id !== robot.id) {
          setDrawnPaths(prevPaths => {
            const newPaths = new Map(prevPaths);
            const robotPath = newPaths.get(robot.id) || [];


            const lastPoint = robotPath[robotPath.length - 1];
            const currentPoint = { x: robot.x, y: robot.y, timestamp: Date.now() };


            if (!lastPoint || lastPoint.x !== robot.x || lastPoint.y !== robot.y) {
              robotPath.push(currentPoint);


              if (robotPath.length > 500) {
                robotPath.shift();
              }


              newPaths.set(robot.id, robotPath);
            }


            return newPaths;
          });
        }
      }



    });
  }, [simulatorRobots, drawLineSettings.enabled, draggedRobot]);


  // Clear paths when drawing is disabled
  useEffect(() => {
    if (!drawLineSettings.enabled) {
      setDrawnPaths(new Map());
    }
  }, [drawLineSettings.enabled]);


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


  // Render drawn paths
  const renderDrawnPaths = () => {
    if (!drawLineSettings.enabled || drawnPaths.size === 0) {
      return null;
    }


    return Array.from(drawnPaths.entries()).map(([robotId, pathPoints]) => {
      if (pathPoints.length < 2) {
        return null;
      }


      // Create SVG path string
      let pathString = '';
      pathPoints.forEach((point, index) => {
        const pixelPos = gridToPixel(point.x, point.y);
        const centerX = pixelPos.x + 5; // Center of robot
        const centerY = pixelPos.y + 5; // Center of robot


        if (index === 0) {
          pathString += `M ${centerX} ${centerY}`;
        } else {
          pathString += ` L ${centerX} ${centerY}`;
        }
      });


      return (
        <svg
          key={`path-${robotId}`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1
          }}
        >
          <path
            d={pathString}
            stroke={drawLineSettings.color}
            strokeWidth={drawLineSettings.thickness}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.8}
          />
        </svg>
      );
    });
  };


  if (!stageRect) return null;


  // UPDATED: Check if we're inside the sliding simulator container
  const isInSlidingSimulator = document.querySelector('.simulator-stage-wrapper');


  // UPDATED: Different modal style based on context
  // Update the modalStyle in SimulatorModal.js:
  const modalStyle = {
    position: isInSlidingSimulator ? 'relative' : 'fixed',
    top: isInSlidingSimulator ? 'auto' : `${stageRect.top}px`,
    left: isInSlidingSimulator ? 'auto' : `${stageRect.left}px`,
    width: isInSlidingSimulator ? '100%' : `${stageRect.width}px`,
    height: isInSlidingSimulator ? '100%' : `${stageRect.height}px`,
    zIndex: isInSlidingSimulator ? 'auto' : 10,
    borderRadius: isInSlidingSimulator ? '0' : '12px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    // ENABLE: Background image fully covered
    backgroundImage: `url(${simulatorBg})`,
    backgroundColor: isInSlidingSimulator ? '#f8f8f8' : 'transparent',
    backgroundSize: isInSlidingSimulator ? 'cover' : 'cover', // CHANGED: Full cover
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    margin: 0,
    padding: 0,
    border: 'none',
    boxShadow: 'none'
  };




  return (
    <div className="simulator-modal-container" style={modalStyle}>
      {renderDrawnPaths()}
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
              width: `${(obstacle.width || 50) * 0.4}px`,
              height: `${(obstacle.height || 50) * 0.4}px`,
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
                  borderLeft: '16px solid transparent', // CHANGED: Made smaller to fit 35px container
                  borderRight: '16px solid transparent', // CHANGED: Made smaller
                  borderBottom: `28px solid ${obstacle.color || '#4A9FD7'}`, // CHANGED: Made smaller
                  position: 'absolute',
                  top: '4px', // CHANGED: Adjusted positioning
                  left: '2px', // CHANGED: Adjusted positioning
                  filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))'
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
                    width: '8px',
                    height: '8px',
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
              width: `${(coloredArea.width || 60) * 0.4}px`,
              height: `${(coloredArea.height || 60) * 0.4}px`,
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


      {/* FIXED: Simulator robots with proper grid-to-pixel conversion and transitions */}
      {simulatorRobots.map((robot) => {
        console.log('Rendering simulator robot:', robot);
        const isHovered = hoveredRobot === robot.id;

        const pixelPos = gridToPixel(robot.x || 0, robot.y || 0);

        return (
          <div
            key={`${robot.id}-${tick}`} // ADDED: Force re-render with tick
            className={`simulator-robot ${selectedSimRobotId === robot.id ? 'selected-sim-robot' : ''}`}
            style={{
              position: 'absolute',
              left: `${pixelPos.x}px`,
              top: `${pixelPos.y}px`,
              width: '20px',
              height: '20px',
              cursor: draggedRobot?.id === robot.id ? 'grabbing' : 'grab',
              zIndex: 13,
              userSelect: 'none',
              pointerEvents: 'auto',
              // ADDED: Smooth transition for script movement
              transition: draggedRobot?.id === robot.id ? 'none' : 'left 200ms ease, top 200ms ease',
              willChange: 'left, top, transform'
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
