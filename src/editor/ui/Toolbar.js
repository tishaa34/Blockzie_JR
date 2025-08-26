import React, { useRef } from "react";
import "../../css/Toolbar.css";

export default function Toolbar({
  onSave,
  onLoad,
  onFullScreen,
  onGridToggle,
  onBgGallery,
  onHeading,
  onRefresh,
  onGreenFlag,
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
    <nav className="toolbar">
      {/* Logo */}
      <div className="toolbar-logo">
        <img src="/assets/Logo.png" alt="Stembotix Logo" />
      </div>

      {/* First group: Project controls (left-aligned, tight group) */}
      <div className="toolbar-group left-group">
        <button className="tl-btn" onClick={handleLoadClick} title="Load project">
          <img src="/assets/ui/load.png" alt="Load" />
        </button>
        <input
          type="file"
          style={{ display: "none" }}
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <button className="tl-btn" onClick={onSave} title="Save project">
          <img src="/assets/ui/save.png" alt="Save" />
        </button>
        <button className="tl-btn" title="Coding Cards">
          <img src="/assets/coding-cards-icon.png" alt="Coding Cards" />
        </button>
      </div>

      {/* CENTERED MAIN STRIP with last three groups */}
    <div className="toolbar-main-strip">
      <div className="toolbar-group">
        <button className="tl-btn" onClick={onFullScreen} title="Fullscreen">
          <img src="/assets/fullscreen-icon.png" alt="Fullscreen" />
        </button>
        <button className="tl-btn" onClick={onGridToggle} title="Grid Toggle">
          <img src="/assets/grid-icon.png" alt="Grid" />
        </button>
      </div>

      <div className="toolbar-group">
        <button className="tl-btn" onClick={onBgGallery} title="Background Gallery">
          <img src="/assets/bg-gallery-icon.png" alt="Backgrounds" />
        </button>
        <button className="tl-btn" onClick={onHeading} title="Add Heading">
          <img src="/assets/abc-icon.png" alt="Add Heading" />
        </button>
      </div>

      <div className="toolbar-group">
        <button className="tl-btn" onClick={onRefresh} title="Refresh">
          <img src="/assets/refresh-icon.png" alt="Refresh" />
        </button>
        <button className="tl-btn" onClick={onGreenFlag} title="Green Flag">
          <img src="/assets/green-flag-icon.png" alt="Green Flag" />
        </button>
      </div>
    </div>
    </nav>
  );
}
