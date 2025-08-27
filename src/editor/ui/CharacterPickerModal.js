import React from "react";
import { useDispatch } from "react-redux";
import { nanoid } from "@reduxjs/toolkit";
import { addActor, pushUndoState } from "../../store/sceneSlice";
import "../../css/CharacterPickerModal.css";

const DEMO_CHAR_LIST = [
{src: "/assets/characters/stembot.svg", name: "Stembot" },
{ src: "/assets/characters/Apple.svg", name: "Apple" },
{ src: "/assets/characters/Baby.svg", name: "Baby" },
{ src: "/assets/characters/Bed.svg", name: "Bed" },
{ src: "/assets/characters/Basketball.svg", name: "Basketball" },
// ...more characters
];
export default function CharacterPickerModal({
open,
onClose,
onPaint,
onSelect,
setSelectedActorId, // optional
}) {
const dispatch = useDispatch();
if (!open) return null;

const handlePick = (char) => {
// Optional: create a known id so UI can select it immediately
const newId = nanoid();

// Save per-scene undo state
dispatch(pushUndoState());

// Add actor. Coordinates are optional; the reducer centers by default.
dispatch(
  addActor({
    id: newId,            // pass id so caller can select it if desired
    name: char.name,
    image: char.src,
    // x, y omitted: slice will use CENTER_X, CENTER_Y
  })
);

// If parent tracks selection, mark this one selected
setSelectedActorId?.(newId);

// Keep legacy callback if used elsewhere
onSelect?.(char);

onClose?.();
};

return (
<div className="character-picker-modal" role="dialog" aria-modal="true">
<div className="picker-backdrop" onClick={onClose} />
<div className="picker-modal-content">
{/* Header with paint + close */}
<div className="picker-modal-header">
<button className="picker-brush-btn" onClick={() => onPaint?.()} aria-label="Paint">
<img src="/assets/ui/paintbrush.png" alt="Paint" />
</button>
<button className="picker-close-btn" onClick={onClose} aria-label="Close">
<img src="/assets/ui/closeit.svg" alt="Close" />
</button>
</div>
    {/* Character grid */}
    <div className="picker-char-grid">
      {DEMO_CHAR_LIST.map((char, idx) => (
        <button
          key={idx}
          type="button"
          className="picker-char-cell"
          title={char.name}
          onClick={() => handlePick(char)}
        >
          <img src={char.src} alt={char.name} />
          <span className="picker-char-label" aria-hidden="true">
            {char.name}
          </span>
        </button>
      ))}
    </div>
  </div>
</div>
);
}