import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { setBackground } from "../../store/sceneSlice";
import "../../css/BackgroundGallery.css";

export default function BackgroundGallery({ open, onClose }) {
  const dispatch = useDispatch();
  const { backgroundGallery, scenes, currentSceneIndex } = useSelector(s => s.scene);
  const currentBG = scenes[currentSceneIndex]?.background || "#ffffff";
  if (!open) return null;

  return (
    <div className="bg-shade" onClick={onClose}>
      <div className="bg-modal" onClick={e => e.stopPropagation()}>
        <div className="bg-modal-header">
          <strong>Choose Background</strong>
          <button className="bg-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="bg-tile-list">
          {backgroundGallery.map(bg =>
            <button
              key={bg}
              className={`bg-tile${currentBG === bg ? " selected" : ""}`}
              style={bg.startsWith("#")
                ? { backgroundColor: bg }
                : { backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              onClick={() => { dispatch(setBackground(bg)); onClose(); }}
              aria-label={bg.startsWith("#") ? bg : bg.split("/").pop()}
            >
              {currentBG === bg && <span className="bg-tile-check">✔</span>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
