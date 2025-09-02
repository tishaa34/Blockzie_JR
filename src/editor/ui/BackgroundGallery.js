import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setBackground, pushUndoState } from "../../store/sceneSlice";
import "../../css/BackgroundGallery.css";

const categories = [
  { id: "all", name: "All" },
  { id: "fantasy", name: "Fantasy" },
  { id: "music", name: "Music" },
  { id: "sports", name: "Sports" },
  { id: "outdoors", name: "Outdoors" },
  { id: "indoors", name: "Indoors" },
  { id: "space", name: "Space" },
  { id: "underwater", name: "Underwater" },
  { id: "patterns", name: "Patterns" }
];

export default function BackgroundGallery({ open, onClose, onPaint }) {
  const dispatch = useDispatch();
  const { scenes, currentSceneIndex } = useSelector(s => s.scene);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [backgrounds, setBackgrounds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const currentBG = scenes[currentSceneIndex]?.background || "#ffffff";

  // Function to categorize backgrounds based on their tags
  const categorizeBackground = (tags) => {
    if (!tags || tags.length === 0) return 'outdoors'; // default fallback

    // Convert tags to lowercase for easier matching
    const lowerTags = tags.map(tag => tag.toLowerCase());

    // Check each category against the tags
    if (lowerTags.some(tag => ['fantasy', 'castle', 'witch', 'magic', 'spooky', 'halloween'].includes(tag))) {
      return 'fantasy';
    }

    if (lowerTags.some(tag => ['music', 'concert', 'theater', 'theatre', 'spotlight', 'dance'].includes(tag))) {
      return 'music';
    }

    if (lowerTags.some(tag => ['sports', 'baseball', 'basketball', 'soccer', 'football', 'playing field', 'pool', 'swim'].includes(tag))) {
      return 'sports';
    }

    if (lowerTags.some(tag => ['outdoors', 'nature', 'forest', 'beach', 'mountain', 'hill', 'garden', 'farm', 'desert', 'arctic', 'jungle', 'savanna'].includes(tag))) {
      return 'outdoors';
    }

    if (lowerTags.some(tag => ['indoors', 'bedroom', 'room', 'hall', 'school', 'chalkboard', 'party', 'refrigerator'].includes(tag))) {
      return 'indoors';
    }

    if (lowerTags.some(tag => ['space', 'galaxy', 'moon', 'stars', 'nasa', 'nebula', 'planet', 'spaceship', 'science fiction'].includes(tag))) {
      return 'space';
    }

    if (lowerTags.some(tag => ['underwater', 'ocean', 'water'].includes(tag))) {
      return 'underwater';
    }

    if (lowerTags.some(tag => ['patterns', 'circles', 'hearts', 'light', 'rays', 'stripes'].includes(tag))) {
      return 'patterns';
    }

    // Default fallback
    return 'outdoors';
  };

  // Filter backgrounds by search and category
  const filteredBackgrounds = backgrounds.filter(bg => {
    const matchesSearch = bg.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || (bg.category === selectedCategory);
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    if (open && backgrounds.length === 0) {
      fetchBackgrounds();
    }
  }, [open, backgrounds.length]);

  const fetchBackgrounds = async () => {
    try {
      setLoading(true);
      setError(null);

      const backdropUrl = './backdrops.json';
      const response = await fetch(backdropUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const backdropData = await response.json();
      console.log('Raw backdrop data:', backdropData);

      const backgroundList = backdropData.map((backdrop, index) => {
        const assetId = backdrop.assetId || `${backdrop.name.toLowerCase().replace(/\s+/g, '-')}-${index + 1}`;

        // Use the existing tags to categorize
        const backgroundCategory = categorizeBackground(backdrop.tags || []);

        return {
          src: `https://raw.githubusercontent.com/devstembotix9892/Blockzie-assets/refs/heads/main/assets/${backdrop.md5ext}`,
          name: backdrop.name,
          category: backgroundCategory,
          tags: backdrop.tags || [],
          assetId: assetId,
          md5ext: backdrop.md5ext,
          dataFormat: backdrop.dataFormat || 'png',
          bitmapResolution: backdrop.bitmapResolution || 2,
          rotationCenterX: backdrop.rotationCenterX || 480,
          rotationCenterY: backdrop.rotationCenterY || 360
        };
      });

      setBackgrounds(backgroundList);

      // Log category distribution
      const categoryCount = {};
      backgroundList.forEach(bg => {
        categoryCount[bg.category] = (categoryCount[bg.category] || 0) + 1;
      });
      console.log('Background category distribution:', categoryCount);

    } catch (err) {
      console.error('Error fetching backgrounds:', err);
      setError('Failed to load backgrounds.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackgroundSelect = (background) => {
    console.log('=== Background Selected ===');
    console.log('Asset ID:', background.assetId);
    console.log('Background Name:', background.name);
    console.log('Category:', background.category);
    console.log('Original Tags:', background.tags);
    console.log('========================');

    dispatch(pushUndoState());
    dispatch(setBackground(background.src));
    onClose();
  };

  const handleRetry = () => {
    setBackgrounds([]);
    fetchBackgrounds();
  };

  const handleCategoryClick = (selectedCategory) => {
    setSelectedCategory(selectedCategory);
    console.log(`Filtering by category: ${selectedCategory}`);

    // Log how many backgrounds match this category
    const matchingBgs = backgrounds.filter(bg =>
      selectedCategory === "all" || bg.category === selectedCategory
    );
    console.log(`Found ${matchingBgs.length} backgrounds in ${selectedCategory} category`);
  };

  if (!open) return null;

  return (
    <div className="background-gallery-modal" role="dialog" aria-modal="true">
      <div className="background-modal-backdrop" onClick={onClose} />

      <div className="background-modal-content">
        {/* Header */}
        <div className="background-modal-header">
          <button className="back-btn" onClick={onClose} title="Back">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>

          <h2 className="modal-title">Choose a Backdrop</h2>

          <div className="picker-header-content">
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />

            <div className="picker-header-buttons">
              <button className="picker-btn" onClick={() => onPaint?.()} aria-label="Paint" title="Paint">
                <img src="./assets/ui/paintbrush.png" alt="Paint" />
              </button>
              <button className="picker-btn" onClick={onClose} aria-label="Close" title="Close">
                <img src="./assets/ui/closeit.svg" alt="Close" />
              </button>
            </div>
          </div>
        </div>


        {/* Category Navigation */}
        <div className="category-nav">
          {categories.map(category => (
            <button
              key={category.id}
              className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => handleCategoryClick(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Background Content */}
        <div className="background-content">
          <div className="background-grid">
            {loading && (
              <div className="loading-message">
                <div className="loading-spinner"></div>
                Loading backgrounds...
              </div>
            )}

            {error && (
              <div className="error-message">
                <p>{error}</p>
                <button onClick={handleRetry}>Retry</button>
              </div>
            )}

            {!loading && !error && filteredBackgrounds.length === 0 && (
              <div className="bg-empty">
                <p>No backgrounds found in "{selectedCategory}" category</p>
                <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                  Try a different category or search term
                </p>
              </div>
            )}

            {!loading && !error && filteredBackgrounds.map((background, idx) => (
              <div
                key={idx}
                className={`background-item ${currentBG === background.src ? 'selected' : ''}`}
                title={`${background.name} (${background.category}) - Tags: ${background.tags.join(', ')}`}
                onClick={() => handleBackgroundSelect(background)}
              >
                <img src={background.src} alt={background.name} />
                <span className="background-name">{background.name}</span>
                {currentBG === background.src && <span className="bg-selected-check">✔</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
