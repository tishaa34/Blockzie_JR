import React, { useState, useEffect } from 'react';
import '../../css/TrailSettingsModal.css';

const TrailSettingsModal = ({ onClose, onApply, onToggle, currentEnabled }) => {
  const [enabled, setEnabled] = useState(currentEnabled);
  const [thickness, setThickness] = useState(3);
  const [color, setColor] = useState('#ff0000');
  const [opacity, setOpacity] = useState(0.8);

  useEffect(() => {
    setEnabled(currentEnabled);
  }, [currentEnabled]);

  const predefinedColors = [
    '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
    '#000000', '#ffffff', '#ff8000', '#8000ff', '#0080ff', '#80ff00'
  ];

  const handleApply = () => {
    const settings = {
      enabled,
      thickness,
      color,
      opacity
    };
    
    onToggle(enabled);
    onApply(settings);
  };

  const handleCancel = () => {
    onClose();
  };

  const handleToggleEnabled = () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    onToggle(newEnabled);
  };

  return (
    <div className="trail-settings-overlay">
      <div className="trail-settings-modal">
        <div className="trail-settings-header">
          <h3>Trail Line Settings</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="trail-settings-content">
          {/* Enable/Disable Toggle */}
          <div className="setting-group">
            <label className="toggle-label">
              <input 
                type="checkbox" 
                checked={enabled}
                onChange={handleToggleEnabled}
                className="toggle-checkbox"
              />
              <span className="toggle-slider"></span>
              <span className="toggle-text">Enable Trail Drawing</span>
            </label>
          </div>

          {/* Trail Thickness */}
          <div className="setting-group">
            <label>Trail Thickness: <span className="value-display">{thickness}px</span></label>
            <input 
              type="range" 
              min="1" 
              max="20" 
              value={thickness}
              onChange={(e) => setThickness(parseInt(e.target.value))}
              className="thickness-slider"
              disabled={!enabled}
            />
          </div>

          {/* Trail Opacity */}
          <div className="setting-group">
            <label>Trail Opacity: <span className="value-display">{Math.round(opacity * 100)}%</span></label>
            <input 
              type="range" 
              min="0.1" 
              max="1" 
              step="0.1"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="opacity-slider"
              disabled={!enabled}
            />
          </div>

          {/* Color Selection */}
          <div className="setting-group">
            <label>Trail Color:</label>
            <div className="color-picker-section">
              <input 
                type="color" 
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="color-input"
                disabled={!enabled}
              />
              <div className="predefined-colors">
                {predefinedColors.map((presetColor, index) => (
                  <button
                    key={index}
                    className={`color-preset ${color === presetColor ? 'selected' : ''}`}
                    style={{ backgroundColor: presetColor }}
                    onClick={() => setColor(presetColor)}
                    disabled={!enabled}
                    title={presetColor}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="setting-group">
            <label>Preview:</label>
            <div className="trail-preview">
              <svg width="200" height="60" className="preview-svg">
                <path 
                  d="M 10 30 Q 60 10 100 30 T 190 30" 
                  stroke={color} 
                  strokeWidth={thickness}
                  strokeOpacity={opacity}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="trail-settings-footer">
          <button className="cancel-btn" onClick={handleCancel}>Cancel</button>
          <button className="apply-btn" onClick={handleApply}>Apply</button>
        </div>
      </div>
    </div>
  );
};

export default TrailSettingsModal;
