import React, { useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { moveActor, pushUndoState } from '../../store/sceneSlice';
import '../../css/Stage.css';

const GRID_WIDTH = 20;
const GRID_HEIGHT = 17;
const CELL_SIZE = 32;

export default function Stage({ selectedActorId, setSelectedActorId, heading, showGrid }) {
  const dispatch = useDispatch();
  const { scenes, currentIndex } = useSelector(state => ({
    scenes: state.scene.scenes,
    currentIndex: state.scene.currentSceneIndex,
  }));
  const scene = scenes[currentIndex];
  const actors = scene?.actors ?? [];
  const containerRef = useRef();

  const [draggedId, setDraggedId] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const background = scene?.background || "#ffffff";
  const bgStyle = background.startsWith("#")
    ? { backgroundColor: background }
    : {
        backgroundImage: `url(${background})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      };

  function calculateGridPosition(clientX, clientY) {
    const rect = containerRef.current.getBoundingClientRect();
    let left = clientX - rect.left - dragOffset.x;
    let top = clientY - rect.top - dragOffset.y;
    left = Math.min(Math.max(left, CELL_SIZE / 2), (GRID_WIDTH - 0.5) * CELL_SIZE);
    top = Math.min(Math.max(top, CELL_SIZE / 2), (GRID_HEIGHT - 0.5) * CELL_SIZE);
    return { x: left, y: top };
  }

  function onDragStart(e, actor) {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const actorLeft = (actor.x + 0.5) * CELL_SIZE;
    const actorTop = (actor.y + 0.5) * CELL_SIZE;
    const clientX = e.clientX ?? e.touches[0].clientX;
    const clientY = e.clientY ?? e.touches[0].clientY;
    setDraggedId(actor.id);
    setDragOffset({ x: clientX - rect.left - actorLeft, y: clientY - rect.top - actorTop });
    setDragPosition({ x: actorLeft, y: actorTop });
    setSelectedActorId(actor.id);

    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
    window.addEventListener('touchmove', onDragMove, { passive: false });
    window.addEventListener('touchend', onDragEnd);
  }

  function onDragMove(e) {
    e.preventDefault();
    if (!draggedId || !containerRef.current) return;
    const clientX = e.clientX ?? e.touches[0].clientX;
    const clientY = e.clientY ?? e.touches[0].clientY;
    const pos = calculateGridPosition(clientX, clientY);
    setDragPosition(pos);
  }

  function onDragEnd(e) {
    e.preventDefault();
    if (!draggedId) return;
    
    const clientX = e.clientX ?? (e.changedTouches ? e.changedTouches[0].clientX : 0);
    const clientY = e.clientY ?? (e.changedTouches ? e.changedTouches[0].clientY : 0);
    const pos = calculateGridPosition(clientX, clientY);
    const gridX = Math.round(pos.x / CELL_SIZE - 0.5);
    const gridY = Math.round(pos.y / CELL_SIZE - 0.5);
    const actor = actors.find(actor => actor.id === draggedId);
    if (!actor) return;
    if (gridX !== actor.x || gridY !== actor.y) {
      dispatch(pushUndoState());
      dispatch(moveActor({ actorId: actor.id, dx: gridX - actor.x, dy: gridY - actor.y }));
    }
    setDraggedId(null);
    setDragOffset({ x: 0, y: 0 });
    setDragPosition({ x: 0, y: 0 });
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', onDragEnd);
    window.removeEventListener('touchmove', onDragMove);
    window.removeEventListener('touchend', onDragEnd);
  }

  return (
    <div
      ref={containerRef}
      id="stage-area"
      style={{
        ...bgStyle,
        position: 'relative',
        width: `${GRID_WIDTH * CELL_SIZE}px`,
        height: `${GRID_HEIGHT * CELL_SIZE}px`,
        border: 'none', // Removed border
        margin: 'auto',
        borderRadius: '0', // Removed border radius
        boxShadow: 'none', // Removed shadow
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {showGrid && <GridOverlay cols={GRID_WIDTH} rows={GRID_HEIGHT} cellSize={CELL_SIZE} />}

      {heading?.text && (
        <div
          style={{
            position: "absolute",
            width: "100%",
            textAlign: "center",
            left: 0,
            top: 8,
            color: heading.color,
            fontSize: heading.size,
            fontWeight: "bold",
            textShadow: heading.color === "#fff" ? "0 2px 7px #20398880" : "0 1px 3px #ffffff70",
            pointerEvents: "none",
            zIndex: 8,
          }}
        >
          {heading.text}
        </div>
      )}

      {actors.map(actor => {
        const isDragging = draggedId === actor.id;
        const left = isDragging ? dragPosition.x : (actor.x + 0.5) * CELL_SIZE;
        const top = isDragging ? dragPosition.y : (actor.y + 0.5) * CELL_SIZE;
        const isSelected = actor.id === selectedActorId;
        return (
          <img
            key={actor.id}
            src={actor.image}
            alt={actor.name}
            draggable={false}
            className={`actor${isSelected ? ' selected' : ''}`}
            onMouseDown={e => onDragStart(e, actor)}
            onTouchStart={e => onDragStart(e, actor)}
            style={{
              position: 'absolute',
              width: CELL_SIZE * 4,
              height: CELL_SIZE * 4,
              left: left,
              top: top,
              transform: `translate(-50%, -50%) rotate(${actor.direction || 0}deg)`,
              cursor: 'grab',
              transition: isDragging ? 'none' : 'left 0.1s linear, top 0.1s linear',
              zIndex: isSelected ? 10 : 1,
              userSelect: 'none',
            }}
          />
        );
      })}
    </div>
  );
}

function GridOverlay({ cols, rows, cellSize }) {
  return (
    <svg
      className="stage-grid"
      width="100%"
      height="100%"
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", zIndex: 5 }}
    >
      {[...Array(cols + 1)].map((_, i) => (
        <line
          key={`v${i}`}
          x1={(i * 100) / cols + '%'}
          y1="0"
          x2={(i * 100) / cols + '%'}
          y2="100%"
          stroke="#bbb"
          strokeWidth="1"
        />
      ))}
      {[...Array(rows + 1)].map((_, i) => (
        <line
          key={`h${i}`}
          x1="0"
          y1={(i * 100) / rows + '%'}
          x2="100%"
          y2={(i * 100) / rows + '%'}
          stroke="#bbb"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}
