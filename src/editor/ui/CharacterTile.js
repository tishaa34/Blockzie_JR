import React from "react";
import "../../css/CharacterTile.css";

export default function CharacterTile({
name = "Stembot",
imageSrc,
onBrush,
onClick,
bgSrc = "/assets/ui/hilight.png",
}) {
return (
<div className="character-tile-main" onClick={onClick}>
{bgSrc ? <img className="tile-bg-img" src={bgSrc} alt="" aria-hidden="true" /> : null}
  <img 
        className="char-tile-img" 
        src={imageSrc} 
        alt={name}
        onError={(e) => {
          console.warn('Character image failed to load:', imageSrc);
          if (e.target.src !== '/assets/characters/stembot.svg') {
            e.target.src = '/assets/characters/stembot.svg';
          }
        }}
      />
  <div className="char-tile-label" title={name}>{name}</div>

  <button
    type="button"
    className="char-tile-brush"
    onClick={(e) => {
      e.stopPropagation();
      onBrush?.();
    }}
    aria-label={`Paint ${name}`}
  >
    <img src="/assets/ui/paintbrush.png" alt="" />
  </button>
</div>
);
}