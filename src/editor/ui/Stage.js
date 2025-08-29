import React, { useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { moveActor, pushUndoState } from "../../store/sceneSlice";
import { run } from "../../utils/runScript";
import "../../css/Stage.css";

const GRID_WIDTH     = 20;
const GRID_HEIGHT    = 17;
const CELL_SIZE      = 32;
const DRAG_THRESHOLD = 5;      // px before we call it a drag

export default function Stage({
  selectedActorId,
  setSelectedActorId,
  heading,
  showGrid,
}) {
  const dispatch = useDispatch();

  // scene/actor state
  const { scenes, currentSceneIndex } = useSelector((s) => s.scene);
  const scene  = scenes[currentSceneIndex];
  const actors = scene?.actors ?? [];

  // drag refs/state
  const containerRef  = useRef(null);
  const draggingRef   = useRef(false);   // live "am I dragging?"
  const movedRef      = useRef(false);   // remembers if threshold crossed

  const [draggedId,     setDraggedId]   = useState(null);
  const [dragStartPos,  setDragStart]   = useState({ x: 0, y: 0 });
  const [dragOffset,    setDragOffset]  = useState({ x: 0, y: 0 });
  const [dragPosition,  setDragPos]     = useState({ x: 0, y: 0 });

  const background = scene?.background || "#ffffff";
  const bgStyle = background.startsWith("#")
    ? { backgroundColor: background }
    : {
        backgroundImage: `url(${background})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      };

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function stageCoords(clientX, clientY) {
    const rect = containerRef.current.getBoundingClientRect();
    const left = clamp(
      clientX - rect.left - dragOffset.x,
      CELL_SIZE / 2,
      (GRID_WIDTH - 0.5) * CELL_SIZE
    );
    const top = clamp(
      clientY - rect.top - dragOffset.y,
      CELL_SIZE / 2,
      (GRID_HEIGHT - 0.5) * CELL_SIZE
    );
    return { x: left, y: top };
  }

  /* -------- Start On Bump logic -------- */
  function checkForStartOnBump(movedActor) {
    actors.forEach(other => {
      if (
        other.id !== movedActor.id &&
        other.visible !== false &&
        movedActor.visible !== false
      ) {
        // collision logic (rect overlap)
        // Actor bounding box: (x, y) is grid center; size = (actor.size || 1) cells
        const halfSizeA = 2 * (movedActor.size || 1); // (CELL_SIZE * 4 * size = covers 4 grid cells)
        const halfSizeB = 2 * (other.size || 1);
        const dx = movedActor.x - other.x;
        const dy = movedActor.y - other.y;
        if (Math.abs(dx) < halfSizeA + halfSizeB && Math.abs(dy) < halfSizeA + halfSizeB) {
          // If the moved actor has a "Start On Bump" script, run it
          const hasBumpScript = movedActor.scripts?.some(
            block => block.category === "start" && block.name === "Start On Bump"
          );
          if (hasBumpScript) {
            run(movedActor, dispatch, scene?.sounds, movedActor.id).catch(err => {
              console.error("Error running Start On Bump script:", err);
            });
          }
        }
      }
    });
  }

  /* -------- drag handlers -------- */
  function onDragStart(e, actor) {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const actorLeft = (actor.x + 0.5) * CELL_SIZE;
    const actorTop  = (actor.y + 0.5) * CELL_SIZE;
    const clientX   = e.clientX ?? e.touches[0].clientX;
    const clientY   = e.clientY ?? e.touches[0].clientY;
    setDraggedId(actor.id);
    setSelectedActorId(actor.id);
    setDragOffset({ x: clientX - rect.left - actorLeft, y: clientY - rect.top - actorTop });
    setDragPos({ x: actorLeft, y: actorTop });
    setDragStart({ x: clientX, y: clientY });
    draggingRef.current = false;
    movedRef.current    = false;
    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup",   onDragEnd);
    window.addEventListener("touchmove", onDragMove, { passive: false });
    window.addEventListener("touchend",  onDragEnd);
  }

  function onDragMove(e) {
    e.preventDefault();
    if (!draggedId) return;
    const clientX = e.clientX ?? e.touches[0].clientX;
    const clientY = e.clientY ?? e.touches[0].clientY;
    const dx = Math.abs(clientX - dragStartPos.x);
    const dy = Math.abs(clientY - dragStartPos.y);
    if (!draggingRef.current && (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD)) {
      draggingRef.current = true;
      movedRef.current    = true;
    }
    if (draggingRef.current) {
      setDragPos(stageCoords(clientX, clientY));
    }
  }

  function onDragEnd(e) {
    e.preventDefault();
    if (!draggedId) return;
    if (draggingRef.current) {
      const clientX = e.clientX ?? e.changedTouches?.[0]?.clientX;
      const clientY = e.clientY ?? e.changedTouches?.[0]?.clientY;
      const pos = stageCoords(clientX, clientY);
      const gridX = Math.round(pos.x / CELL_SIZE - 0.5);
      const gridY = Math.round(pos.y / CELL_SIZE - 0.5);
      const actor = actors.find((a) => a.id === draggedId);
      if (actor && (gridX !== actor.x || gridY !== actor.y)) {
        dispatch(pushUndoState());
        dispatch(moveActor({ actorId: actor.id, dx: gridX - actor.x, dy: gridY - actor.y }));
        // Check for Start On Bump after move
        const bumpedActor = { ...actor, x: gridX, y: gridY }; // simulate new position
        checkForStartOnBump(bumpedActor);
      }
    }
    draggingRef.current = false;
    setDraggedId(null);
    setDragOffset({ x: 0, y: 0 });
    setDragPos({ x: 0, y: 0 });
    window.removeEventListener("mousemove", onDragMove);
    window.removeEventListener("mouseup",   onDragEnd);
    window.removeEventListener("touchmove", onDragMove);
    window.removeEventListener("touchend",  onDragEnd);
  }

  /* -------- tap handler -------- */
  const handleActorTap = (actor, e) => {
    e.stopPropagation();
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    setSelectedActorId(actor.id);
    const hasTap = actor.scripts?.some(
      (b) => b.category === "start" && b.name === "Start On Tap"
    );
    if (hasTap) {
      run(actor, dispatch, scene?.sounds, actor.id).catch((err) =>
        console.error("tap-script error:", err)
      );
    }
  };

  /* -------- render -------- */
  return (
    <div
      ref={containerRef}
      id="stage-area"
      style={{
        ...bgStyle,
        position: "relative",
        width:  GRID_WIDTH  * CELL_SIZE,
        height: GRID_HEIGHT * CELL_SIZE,
        margin: "auto",
        userSelect: "none",
        overflow: "hidden",
      }}
    >
      {showGrid && <GridOverlay cols={GRID_WIDTH} rows={GRID_HEIGHT} cellSize={CELL_SIZE} />}

      {heading?.text && (
        <div
          style={{
            position: "absolute",
            width: "100%",
            top: 8,
            left: 0,
            textAlign: "center",
            color: heading.color,
            fontSize: heading.size,
            fontWeight: "bold",
            pointerEvents: "none",
            textShadow:
              heading.color === "#fff"
                ? "0 2px 7px #20398880"
                : "0 1px 3px #ffffff70",
            zIndex: 8,
          }}
        >
          {heading.text}
        </div>
      )}

      {actors.map((actor) => {
        if (actor.visible === false) return null;
        const isDragged  = draggedId === actor.id && draggingRef.current;
        const left = isDragged ? dragPosition.x : (actor.x + 0.5) * CELL_SIZE;
        const top  = isDragged ? dragPosition.y : (actor.y + 0.5) * CELL_SIZE;
        const size = CELL_SIZE * 4 * (actor.size || 1);
        const isSelected = actor.id === selectedActorId;
        return (
          <img
            key={actor.id}
            src={actor.image}
            alt={actor.name}
            draggable={false}
            className={`actor${isSelected ? " selected" : ""}`}
            onMouseDown={(e) => onDragStart(e, actor)}
            onTouchStart={(e) => onDragStart(e, actor)}
            onClick={(e) => handleActorTap(actor, e)}
            style={{
              position: "absolute",
              width: size,
              height: size,
              left,
              top,
              transform: `translate(-50%, -50%) rotate(${actor.direction || 0}deg)`,
              cursor: "grab",
              transition: isDragged ? "none" : "left 0.1s linear, top 0.1s linear",
              zIndex: isSelected ? 10 : 1,
              userSelect: "none",
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
          x1={`${(i * 100) / cols}%`}
          y1="0"
          x2={`${(i * 100) / cols}%`}
          y2="100%"
          stroke="#bbb"
          strokeWidth="1"
        />
      ))}
      {[...Array(rows + 1)].map((_, i) => (
        <line
          key={`h${i}`}
          x1="0"
          y1={`${(i * 100) / rows}%`}
          x2="100%"
          y2={`${(i * 100) / rows}%`}
          stroke="#bbb"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}
