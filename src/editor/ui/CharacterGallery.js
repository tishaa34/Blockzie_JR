import React, { useState } from "react";
import { useSelector } from "react-redux";
import "../../css/CharacterTile.css";
import CharacterTile from "./CharacterTile";
import CharacterPlusTile from "./CharacterPlusTile";
import CharacterPickerModal from "./CharacterPickerModal";

export default function CharacterGallery({ 
  selectedActorId, 
  setSelectedActorId, 
  onBrush, 
  onAdd 
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  
  // CRITICAL FIX: Get actors from Redux, not from props
  const { scenes, currentSceneIndex } = useSelector(s => s.scene);
  const reduxActors = scenes[currentSceneIndex]?.actors || [];

  const handleAdd = () => {
    setPickerOpen(true);
    if (onAdd) onAdd();
  };

  const handleClose = () => setPickerOpen(false);

  const handleSelect = (char) => {
    setPickerOpen(false);
  };

  const handleActorClick = (actor) => {
    if (setSelectedActorId) {
      setSelectedActorId(actor.id);
    }
  };

  const handleBrushClick = (actor) => {
    if (onBrush) {
      onBrush(actor);
    }
  };

  return (
    <div className="character-gallery-panel">
      {/* RENDER REDUX ACTORS INSTEAD OF DEMO ACTORS */}
      {reduxActors.map((actor, idx) => (
        <CharacterTile
          key={`${actor.id}-${idx}`}
          name={actor.name}
          imageSrc={actor.image} // This will be the base64 data URL
          onClick={() => handleActorClick(actor)}
          onBrush={() => handleBrushClick(actor)}
          isSelected={selectedActorId === actor.id}
          bgSrc={selectedActorId === actor.id ? "/assets/ui/hilight.png" : null}
        />
      ))}

      <CharacterPlusTile onClick={handleAdd} />

      <CharacterPickerModal
        open={pickerOpen}
        onClose={handleClose}
        onPaint={() => {}}
        onSelect={handleSelect}
      />
    </div>
  );
}
