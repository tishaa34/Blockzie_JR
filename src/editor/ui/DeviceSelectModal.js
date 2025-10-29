import React from "react";
import ReactDOM from "react-dom";
import "../../css/DeviceSelectModal.css";

// Added: device list used by the modal
const devices = [
  {
    key: "none",
    name: "Unselect device",
    image: "./assets/ui/Unselect.png",
    description: "Unselect the device, return to pure realtime programming mode."
  },
  {
    key: "otto",
    name: "Otto Robot",
    image: "./assets/ui/Otto_Bot.png",
    description: "Otto Robot, get started with robot project."
  },
  {
    key: "esp32",
    name: "ESP32",
    image: "./assets/ui/ESP32.png",
    description: "Wi‑Fi & Bluetooth control board with rich functions."
  }
];

export default function DeviceSelectModal({ isOpen = true, onClose, onSelectDevice }) {
  if (!isOpen) return null;

  const modal = (
    <div className="device-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="device-modal" onClick={e => e.stopPropagation()}>
        <h2 className="device-modal-heading">Choose a Device</h2>
        <div className="device-cards-row">
          {devices.map(d => (
            <div className="device-card" key={d.key} onClick={() => onSelectDevice(d.key)}>
              <img src={d.image} alt={d.name} className="device-image" />
              <div className="device-name">{d.name}</div>
              <div className="device-desc">{d.description}</div>
            </div>
          ))}
        </div>
        <button className="device-modal-close-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}
