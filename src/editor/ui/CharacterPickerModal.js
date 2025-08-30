import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { nanoid } from "@reduxjs/toolkit";
import { addActor, pushUndoState } from "../../store/sceneSlice";
import "../../css/CharacterPickerModal.css";

export default function CharacterPickerModal({
  open,
  onClose,
  onPaint,
  onSelect,
  setSelectedActorId,
}) {
  const dispatch = useDispatch();
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateCharacterImage = (name) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', 
      '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = colors[Math.abs(hash) % colors.length];
    
    const svg = `
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="${color}" rx="10"/>
        <text x="50" y="50" font-family="Arial" font-size="12" fill="white" text-anchor="middle" dy="0.3em">${name.substring(0, 3)}</text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  useEffect(() => {
    if (open && characters.length === 0) {
      fetchCharacters();
    }
  }, [open, characters.length]);

const fetchCharacters = async () => {
  try {
    setLoading(true);
    setError(null);
    
    const spritesUrl = '/sprites.json';
    const response = await fetch(spritesUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    
    const spritesData = await response.json();
    console.log('Raw sprites data:', spritesData);
    
    const characterList = spritesData.map((sprite, index) => {
      // 🔧 FIX: Access the first costume for asset details
      const firstCostume = sprite.costumes && sprite.costumes[0];
      console.log("Sprite :  ", sprite);
      const assetId = firstCostume?.assetId || 
                     sprite.id ||
                     `${sprite.name.toLowerCase().replace(/\s+/g, '-')}-${index + 1}`;
      
      console.log(`Processing "${sprite.name}":`, {
        hasFirstCostume: !!firstCostume,
        hasAssetId: !!firstCostume?.assetId,
        originalAssetId: firstCostume?.assetId,
        finalAssetId: assetId
      });
      
      return {
        src: `https://raw.githubusercontent.com/devstembotix9892/Blockzie-assets/refs/heads/main/assets/${sprite.costumes[0]?.md5ext}`,
        name: sprite.name,
        assetId: assetId,
        md5ext: firstCostume?.md5ext || `${sprite.name.toLowerCase()}.svg`,
        dataFormat: firstCostume?.dataFormat || 'svg',
        bitmapResolution: firstCostume?.bitmapResolution || 1,
        rotationCenterX: firstCostume?.rotationCenterX || 50,
        rotationCenterY: firstCostume?.rotationCenterY || 50
      };
    });
    
    setCharacters(characterList);
    console.log('All characters with costume data:', characterList.map(c => ({
      name: c.name, 
      assetId: c.assetId,
      md5ext: c.md5ext,
      dataFormat: c.dataFormat
    })));
    
  } catch (err) {
    console.error('Error fetching characters:', err);
    setError('Failed to load characters.');
    
    const DEMO_CHAR_LIST = [
      { src: generateCharacterImage("Demo"), name: "Demo", assetId: "demo-fallback-001" }
    ];
    setCharacters(DEMO_CHAR_LIST);
  } finally {
    setLoading(false);
  }
};


  if (!open) return null;

  const handlePick = (char) => {
    // 🎯 This will ALWAYS show a valid assetId now
    console.log('=== Character Clicked ===');
    console.log('Asset ID:', char.assetId);
    console.log('Character Name:', char.name);
    console.log('MD5 Extension:', char.md5ext);
    console.log('Data Format:', char.dataFormat);
    console.log('========================');

    const newId = nanoid();
    dispatch(pushUndoState());
    dispatch(
      addActor({
        id: newId,
        name: char.name,
        image: char.src,
        assetId: char.assetId, // Always has a value now
      })
    );

    setSelectedActorId?.(newId);
    onSelect?.(char);
    onClose?.();
  };

  const handleRetry = () => {
    setCharacters([]);
    fetchCharacters();
  };

  return (
    <div className="character-picker-modal" role="dialog" aria-modal="true">
      <div className="picker-backdrop" onClick={onClose} />
      <div className="picker-modal-content">
        <div className="picker-modal-header">
          <button className="picker-brush-btn" onClick={() => onPaint?.()} aria-label="Paint">
            <img src="./assets/ui/paintbrush.png" alt="Paint" />
          </button>
          <button className="picker-close-btn" onClick={onClose} aria-label="Close">
            <img src="./assets/ui/closeit.svg" alt="Close" />
          </button>
        </div>

        <div className="picker-char-grid">
          {loading && (
            <div className="loading-message">Loading characters...</div>
          )}
          
          {error && (
            <div className="error-message">
              <p>{error}</p>
              <button onClick={handleRetry}>Retry</button>
            </div>
          )}
          
          {!loading && !error && characters.map((char, idx) => (
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
