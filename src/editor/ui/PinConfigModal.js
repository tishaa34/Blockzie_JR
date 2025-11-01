import React, { useState, useEffect } from "react";
import "../../css/PinConfigModal.css";

export default function PinConfigModal({ isOpen, onClose, onSave, initialData }) {
  const [pin, setPin] = useState(initialData?.pin || "IO2");
  const [mode, setMode] = useState(initialData?.mode || "input");
  const [state, setState] = useState(initialData?.state || "low");

  useEffect(() => {
    if (isOpen) {
      setPin(initialData?.pin || "IO2");
      setMode(initialData?.mode || "input");
      setState(initialData?.state || "low");
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ pin, mode, state });
  };

  return (
    <div className="pin-modal-overlay">
      <div className="pin-modal">
        <h3>⚙️ Configure ESP32 Pin</h3>

        <div className="pin-field">
          <label>Pin</label>
          <select value={pin} onChange={(e) => setPin(e.target.value)}>
            {Array.from({ length: 34 }, (_, i) => (
              <option key={i} value={`IO${i}`}>
                IO{i}
              </option>
            ))}
          </select>
        </div>

        <div className="pin-field">
          <label>Mode</label>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="input">Input</option>
            <option value="output">Output</option>
          </select>
        </div>

        <div className="pin-field">
          <label>State</label>
          <select value={state} onChange={(e) => setState(e.target.value)}>
            <option value="low">Low</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="pin-modal-buttons">
          <button onClick={handleSave}>Save</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
