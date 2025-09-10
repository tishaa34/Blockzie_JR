import React, { useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import "../../css/Toolbar.css";
import { run } from "../../utils/runScript";

export default function Toolbar({
  onSave,
  onLoad,
  selectedActorId,
  heading,
  onOpenHumanDetection // Add this new prop
}) {
  const fileInputRef = useRef();

  const handleLoadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    if (onLoad && e.target.files.length > 0) {
      onLoad(e.target.files[0]);
    }
  };

  return (
    <nav className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {/* Logo */}
      <div className="toolbar-logo">
        <img src="./assets/Logo.png" alt="Stembotix Logo" />
      </div>

      {/* Left buttons */}
      <div className="toolbar-group left-group">
        <button className="tl-btn" onClick={handleLoadClick} title="Load project">
          <img src="./assets/ui/load.png" alt="Load" />
        </button>
        <input
          type="file"
          style={{ display: "none" }}
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <button className="tl-btn" onClick={onSave} title="Save project">
          <img src="./assets/ui/save.png" alt="Save" />
        </button>
        <button className="tl-btn" title="Coding Cards">
          <img src="./assets/ui/coding-cards.png" alt="Coding Cards" />
        </button>
      </div>
    </div>
    </nav>
  );
}
