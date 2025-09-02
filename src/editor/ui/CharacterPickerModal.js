import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { nanoid } from "@reduxjs/toolkit";
import { addActor, pushUndoState } from "../../store/sceneSlice";
import "../../css/CharacterPickerModal.css";

const categories = [
  { id: "all", name: "All" },
  { id: "animals", name: "Animals" },
  { id: "people", name: "People" },
  { id: "fantasy", name: "Fantasy" },
  { id: "dance", name: "Dance" },
  { id: "music", name: "Music" },
  { id: "sports", name: "Sports" },
  { id: "food", name: "Food" },
  { id: "fashion", name: "Fashion" },
  { id: "letters", name: "Letters" },
  { id: "robot", name: "Robot" }
];

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
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Enhanced function to categorize characters based on their tags and names
  const categorizeCharacter = (sprite) => {
    const tags = sprite.tags || [];
    const name = sprite.name.toLowerCase();

    // Convert tags to lowercase for easier matching
    const lowerTags = tags.map(tag => tag.toLowerCase());

    // Check for dance characters first (most specific)
    if (
      name.includes('dance') ||
      name.includes('dancer') ||
      name.includes('dancing') ||
      name.includes('ballerina') ||
      name.includes('amon') ||
      name.includes('anina') ||
      name.includes('cassy') ||
      name.includes('champ99') ||
      name.includes('d-money') ||
      name.includes('jouvi') ||
      name.includes('lb dance') ||
      name.includes('ten80') ||
      lowerTags.some(tag => tag.includes('dance') || tag.includes('dancer') || tag.includes('dancing') || tag.includes('ballerina'))
    ) {
      return 'dance';
    }

    // Animals
    if (lowerTags.some(tag => ['animals', 'animal', 'cat', 'dog', 'bird', 'fish', 'bear', 'lion', 'tiger', 'elephant', 'monkey', 'rabbit', 'fox', 'wolf', 'deer', 'horse', 'cow', 'pig', 'sheep', 'duck', 'chicken', 'owl', 'frog', 'butterfly', 'dinosaur', 'mammals', 'insect', 'bug'].includes(tag))) {
      return 'animals';
    }

    // Fantasy
    if (lowerTags.some(tag => ['fantasy', 'wizard', 'witch', 'fairy', 'dragon', 'unicorn', 'magic', 'spooky', 'halloween', 'monster', 'ghost'].includes(tag))) {
      return 'fantasy';
    }

    // Music
    if (lowerTags.some(tag => ['music', 'musician', 'instrument', 'guitar', 'piano', 'drum', 'trumpet', 'saxophone'].includes(tag))) {
      return 'music';
    }

    // Sports
    if (lowerTags.some(tag => ['sports', 'basketball', 'soccer', 'football', 'baseball', 'tennis', 'athlete'].includes(tag))) {
      return 'sports';
    }

    // Food
    if (lowerTags.some(tag => ['food', 'fruit', 'eating', 'drink'].includes(tag))) {
      return 'food';
    }

    // Fashion
    if (lowerTags.some(tag => ['fashion', 'clothing', 'dress', 'shirt', 'hat', 'shoes'].includes(tag))) {
      return 'fashion';
    }

    // Letters
    if (lowerTags.some(tag => ['letters', 'alphabet', 'letter'].includes(tag))) {
      return 'letters';
    }

    // Robot
    if (name.includes('robot') || name.includes('stembot') || lowerTags.some(tag => ['robot', 'stembot'].includes(tag))) {
      return 'robot';
    }

    // People (default)
    if (lowerTags.some(tag => ['people', 'person', 'boy', 'girl', 'kid', 'character', 'man', 'woman', 'child'].includes(tag))) {
      return 'people';
    }

    // Default fallback
    return 'people';
  };

  // Filter characters by search and category
  const filteredCharacters = characters.filter(char => {
    const matchesSearch = char.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || (char.category === selectedCategory);
    return matchesSearch && matchesCategory;
  });

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

        // Use the enhanced categorization function
        const characterCategory = categorizeCharacter(sprite);

        return {
          src: `https://raw.githubusercontent.com/devstembotix9892/Blockzie-assets/refs/heads/main/assets/${sprite.costumes[0]?.md5ext}`,
          name: sprite.name,
          category: characterCategory,
          tags: sprite.tags || [],
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

      // Log dance characters specifically
      const danceChars = characterList.filter(char => char.category === 'dance');
      console.log('Dance characters found:', danceChars.map(char => ({ name: char.name, tags: char.tags })));

    } catch (err) {
      console.error('Error fetching characters:', err);
      setError('Failed to load characters.');
    } finally {
      setLoading(false);
    }
  };

  const handleCharacterSelect = (character) => {
    console.log('=== Character Selected ===');
    console.log('Asset ID:', character.assetId);
    console.log('Character Name:', character.name);
    console.log('Category:', character.category);
    console.log('Original Tags:', character.tags);
    console.log('========================');

    const newId = nanoid();
    dispatch(pushUndoState());
    dispatch(
      addActor({
        id: newId,
        name: character.name,
        image: character.src,
        assetId: character.assetId,
        category: character.category,
        tags: character.tags
      })
    );

    setSelectedActorId?.(newId);
    onSelect?.(character);
    onClose?.();
  };

  const handleRetry = () => {
    setCharacters([]);
    fetchCharacters();
  };

  const handleCategoryClick = (selectedCategory) => {
    setSelectedCategory(selectedCategory);
    console.log(`Filtering by category: ${selectedCategory}`);

    // Log how many characters match this category
    const matchingChars = characters.filter(char =>
      selectedCategory === "all" || char.category === selectedCategory
    );
    console.log(`Found ${matchingChars.length} characters in ${selectedCategory} category`);
  };

  if (!open) return null;

  return (
    <div className="character-picker-modal" role="dialog" aria-modal="true">
      <div className="picker-backdrop" onClick={onClose} />

      <div className="picker-modal-content">
        {/* Header */}
        <div className="picker-modal-header">
          <button className="picker-back-btn" onClick={onClose} title="Back">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>

          <h2 className="modal-title">Choose a Sprite</h2>


          <div className="picker-search-container">
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="picker-search-input"
            />
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

        {/* Category Navigation */}
        <div className="picker-categories">
          {categories.map(category => (
            <button
              key={category.id}
              className={`picker-category-btn ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => handleCategoryClick(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Character Content */}
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
                <p>No characters found in "{selectedCategory}" category</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>
                  Try a different category or search term
                </p>
              </div>
            )}

            {!loading && !error && filteredCharacters.map((character, idx) => (
              <div
                key={idx}
                className="picker-char-cell"
                title={`${character.name} (${character.category}) - Tags: ${character.tags.join(', ')}`}
                onClick={() => handleCharacterSelect(character)}
              >
                <img src={character.src} alt={character.name} />
                <span className="picker-char-label">{character.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
