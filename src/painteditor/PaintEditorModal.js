// src/components/PaintEditorModal.js
import React from "react";
import "../css/PaintEditorModal.css";
import PaintEditor from "./PaintEditor"; // Your existing component

export default function PaintEditorModal({ open, onClose, ...rest }) {
  if (!open) return null;
  return (
    <div className="paint-modal-shade" onClick={onClose}>
      <div className="paint-modal-main" onClick={e => e.stopPropagation()}>
        <PaintEditor
          {...rest}
          onSave={data => {
            if (rest.onSave) rest.onSave(data);
            onClose();
          }}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
