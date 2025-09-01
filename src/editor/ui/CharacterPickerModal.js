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
  onBack,
  setSelectedActorId,
}) {
  const dispatch = useDispatch();
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Add search and category state
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const CATEGORY_LIST = [
    "all", "animals", "people", "fantasy", "dance", "music", "sports", "food", "fashion", "letters", "robot"
  ];

  // Function to categorize characters based on their tags
  const categorizeCharacter = (tags) => {
    if (!tags || tags.length === 0) return 'people'; // default fallback
    
    // Convert tags to lowercase for easier matching
    const lowerTags = tags.map(tag => tag.toLowerCase());
    
    // Check each category against the tags
    if (lowerTags.some(tag => ['animals', 'animal', 'cat', 'dog', 'bird', 'fish', 'bear', 'lion', 'tiger', 'elephant', 'monkey', 'rabbit', 'fox', 'wolf', 'deer', 'horse', 'cow', 'pig', 'sheep', 'duck', 'chicken', 'owl', 'frog', 'butterfly', 'dinosaur', 'mammals', 'insect', 'bug'].includes(tag))) {
      return 'animals';
    }
    
    if (lowerTags.some(tag => ['people', 'person', 'boy', 'girl', 'kid', 'character', 'man', 'woman', 'child'].includes(tag))) {
      return 'people';
    }
    
    if (lowerTags.some(tag => ['fantasy', 'wizard', 'witch', 'fairy', 'dragon', 'unicorn', 'magic', 'spooky', 'halloween', 'monster', 'ghost'].includes(tag))) {
      return 'fantasy';
    }
    
    if (lowerTags.some(tag => ['dance', 'dancer', 'dancing', 'amon', 'anina dance', 'ballerina', 'cassy dance', 'champ99', 
    'd-money dance', 'jouvi dance', 'lb dance', 'ten80 dance'].includes(tag)) || (tags && tags.some(tag => tag.toLowerCase().includes('dance')))) {
      return 'dance';
    }
    
    if (lowerTags.some(tag => ['music', 'musician', 'instrument', 'guitar', 'piano', 'drum', 'trumpet', 'saxophone'].includes(tag))) {
      return 'music';
    }
    
    if (lowerTags.some(tag => ['sports', 'basketball', 'soccer', 'football', 'baseball', 'tennis', 'athlete'].includes(tag))) {
      return 'sports';
    }
    
    if (lowerTags.some(tag => ['food', 'fruit', 'eating', 'drink'].includes(tag))) {
      return 'food';
    }
    
    if (lowerTags.some(tag => ['fashion', 'clothing', 'dress', 'shirt', 'hat', 'shoes'].includes(tag))) {
      return 'fashion';
    }
    
    if (lowerTags.some(tag => ['letters', 'alphabet', 'letter'].includes(tag))) {
      return 'letters';
    }
    
    if (lowerTags.some(tag => ['robot', 'stembot'].includes(tag))) {
      return 'robot';
    }
    
    // Default fallback
    return 'people';
  };

  // Filter characters by search and category
  const filteredCharacters = characters.filter(char => {
    const matchesSearch = char.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || (char.category === category);
    return matchesSearch && matchesCategory;
  });

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
        const firstCostume = sprite.costumes && sprite.costumes[0];
        const assetId = firstCostume?.assetId || 
                       sprite.id ||
                       `${sprite.name.toLowerCase().replace(/\s+/g, '-')}-${index + 1}`;
        
        // Use the existing tags to categorize
        const characterCategory = categorizeCharacter(sprite.tags || []);
        
        return {
          src: `https://raw.githubusercontent.com/devstembotix9892/Blockzie-assets/refs/heads/main/assets/${sprite.costumes[0]?.md5ext}`,
          name: sprite.name,
          category: characterCategory,
          tags: sprite.tags || [], // Keep original tags for reference
          assetId: assetId,
          md5ext: firstCostume?.md5ext || `${sprite.name.toLowerCase()}.svg`,
          dataFormat: firstCostume?.dataFormat || 'svg',
          bitmapResolution: firstCostume?.bitmapResolution || 1,
          rotationCenterX: firstCostume?.rotationCenterX || 50,
          rotationCenterY: firstCostume?.rotationCenterY || 50
        };
      });
      
      setCharacters(characterList);
      
      // LOG CATEGORY DISTRIBUTION
      const categoryCount = {};
      characterList.forEach(char => {
        categoryCount[char.category] = (categoryCount[char.category] || 0) + 1;
      });
      console.log('Category distribution:', categoryCount);
      
    } catch (err) {
      console.error('Error fetching characters:', err);
      setError('Failed to load characters.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const handlePick = (char) => {
    console.log('=== Character Clicked ===');
    console.log('Asset ID:', char.assetId);
    console.log('Character Name:', char.name);
    console.log('Category:', char.category);
    console.log('Original Tags:', char.tags);
    console.log('========================');

    const newId = nanoid();
    dispatch(pushUndoState());
    dispatch(
      addActor({
        id: newId,
        name: char.name,
        image: char.src,
        assetId: char.assetId,
        category: char.category,
        tags: char.tags
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

  const handleBack = () => {
    onBack?.();
  };

  const handleCategoryClick = (selectedCategory) => {
    setCategory(selectedCategory);
    console.log(`Filtering by category: ${selectedCategory}`);
    
    // Log how many characters match this category
    const matchingChars = characters.filter(char => 
      selectedCategory === "all" || char.category === selectedCategory
    );
    console.log(`Found ${matchingChars.length} characters in ${selectedCategory} category`);
  };

  return (
    <div className="character-picker-modal" role="dialog" aria-modal="true">
      <div className="picker-backdrop" onClick={onClose} />
      <div className="picker-modal-content">
        <div className="picker-modal-header">
          <button 
            className="picker-back-btn" 
            onClick={handleBack} 
            aria-label="Go back to main page"
          >
            <svg viewBox="0 0 24 24">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>

          <div className="picker-search-container">
            <input 
              type="text" 
              className="picker-search-input" 
              placeholder="Search"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="picker-categories">
            {CATEGORY_LIST.map(cat => (
              <button
                key={cat}
                className={`picker-category-btn ${cat} ${category === cat ? "active" : ""}`}
                onClick={() => handleCategoryClick(cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          <div className="picker-header-actions">
            <button className="picker-brush-btn" onClick={() => onPaint?.()} aria-label="Paint">
              <img src="./assets/ui/paintbrush.png" alt="Paint" />
            </button>
            <button className="picker-close-btn" onClick={onClose} aria-label="Close">
              <img src="./assets/ui/closeit.svg" alt="Close" />
            </button>
          </div>
        </div>

        <div className="picker-content-area">
          <div className="picker-char-grid">
            {loading && (
              <div className="loading-message">
                <div className="loading-spinner"></div>
                Loading characters...
              </div>
            )}
            
            {error && (
              <div className="error-message">
                <p>{error}</p>
                <button onClick={handleRetry}>Retry</button>
              </div>
            )}
            
            {!loading && !error && filteredCharacters.length === 0 && (
              <div className="picker-empty">
                <p>No characters found in "{category}" category</p>
                <p style={{fontSize: '12px', color: '#999', marginTop: '8px'}}>
                  Try a different category or search term
                </p>
              </div>
            )}
            
            {!loading && !error && filteredCharacters.map((char, idx) => (
              <button
                key={idx}
                type="button"
                className="picker-char-cell"
                title={`${char.name} (${char.category}) - Tags: ${char.tags.join(', ')}`}
                onClick={() => handlePick(char)}
              >
                <img src={char.src} alt={char.name} />
                <span className="picker-char-label">
                  {char.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
