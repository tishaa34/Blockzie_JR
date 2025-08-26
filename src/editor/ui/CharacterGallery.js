import React, { useState } from "react";
import "../../css/CharacterTile.css";
import CharacterTile from "./CharacterTile";
import CharacterPlusTile from "./CharacterPlusTile";
import CharacterPickerModal from "./CharacterPickerModal";

const INITIAL_CHARACTERS = [
{ name: "Stembot", src: "/assets/characters/stembot.svg" },
];

export default function CharacterGallery() {
const [characters, setCharacters] = useState(INITIAL_CHARACTERS);
const [pickerOpen, setPickerOpen] = useState(false);

const handleAdd = () => setPickerOpen(true);
const handleClose = () => setPickerOpen(false);

const handleSelect = (char) => {
setCharacters((prev) => [...prev, char]);
setPickerOpen(false);
};

return (
<div className="character-gallery-panel">
{characters.map((c, idx) => (
<CharacterTile
key={`${c.name}-${idx}`}
name={c.name}
imageSrc={c.src}
onClick={() => {}}
onBrush={() => {}}
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