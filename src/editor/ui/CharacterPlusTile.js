import React from "react";
import "../../css/CharacterTile.css";

export default function CharacterPlusTile({ onClick }) {
return (
<button className="character-plus-tile" onClick={onClick} aria-label="Add character">
<img src="/assets/ui/newsprite2.png" alt="Add" />
</button>
);
}