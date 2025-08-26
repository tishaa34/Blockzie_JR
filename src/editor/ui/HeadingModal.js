import React, { useState } from "react";
import "../../css/HeadingModal.css";

// color palette like original
const COLORS = ["#222", "#ffffff", "#ffe45c", "#3ca832", "#35b7e7", "#e35c72"];
const SIZES = [18, 28, 38, 48, 56]; // px

export default function HeadingModal({ open, onClose, onSave, initial }) {
  const [text, setText] = useState(initial?.text || "");
  const [color, setColor] = useState(initial?.color || COLORS[0]);
  const [size, setSize] = useState(initial?.size || SIZES[2]);

  if (!open) return null;

  return (
    <div className="heading-modal-shade" onClick={onClose}>
      <div className="heading-modal-main" onClick={e => e.stopPropagation()}>
        <div style={{marginBottom: 12, display: "flex", alignItems: "center"}}>
          <input
            className="heading-modal-input"
            value={text}
            maxLength={80}
            placeholder="Type heading here..."
            onChange={e => setText(e.target.value)}
            style={{
              fontSize: size,
              color,
              border: "none",
              borderRadius: 6,
              padding: "7px 14px",
              width: "80%",
              background: "#fff"
            }}
            autoFocus
          />
          <button
            onClick={() => onSave({ text, color, size })}
            className="heading-modal-save"
            style={{marginLeft: 14}}
            disabled={!text.trim()}
          >✅</button>
          <button onClick={onClose} className="heading-modal-close">&times;</button>
        </div>
        <div className="heading-modal-toolbar">
          <div>
            {/* color selection */}
            {COLORS.map(c => (
              <button
                key={c}
                className="heading-modal-color"
                style={{
                  background: c,
                  border: color === c ? "3px solid #4a90e2" : "2px solid #eee"
                }}
                onClick={() => setColor(c)}
              >
                {color === c && <span>✔</span>}
              </button>
            ))}
          </div>
          <div>
            {/* font size selection */}
            {SIZES.map((s, i) => (
              <button
                key={s}
                className="heading-modal-size"
                style={{
                  fontSize: s, color: i === 1 ? "#e5b219" : "#222",
                  fontWeight: i === 4 ? "bold" : "normal",
                  borderBottom: size === s ? "3px solid #4a90e2" : "3px solid transparent"
                }}
                onClick={() => setSize(s)}
              >A</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
