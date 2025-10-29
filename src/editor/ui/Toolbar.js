import React, { useRef, useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import "../../css/Toolbar.css";
import DeviceSelectModal from "./DeviceSelectModal";
import { run } from "../../utils/runScript";
import { setSelectedDevice } from "../../store/sceneSlice";

export default function Toolbar({
  onSave,
  onLoad,
  selectedActorId,
  heading,
}) {
  const fileInputRef = useRef();
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showConnectionDropdown, setShowConnectionDropdown] = useState(false);

  const selectedDevice = useSelector(s => s.scene.selectedDevice);
  const dispatch = useDispatch();

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

  // Close connection dropdown on outside click
  useEffect(() => {
    if (!showConnectionDropdown) return;
    const handleClick = () => setShowConnectionDropdown(false);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [showConnectionDropdown]);

  // Only show connection dropdown if a real device is selected (not 'none')
  const canShowDropdown = selectedDevice && selectedDevice !== "none";

  return (
    <>
      <nav className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

            {/* Device button */}
            <button className="tl-btn" title="Device" onClick={() => setShowDeviceModal(true)}>
              <img src="./assets/categories/DeviceOff.png" alt="Device" />
            </button>

            {/* Connection button with dropdown */}
            <div style={{ position: "relative", display: "inline-block" }}>
              <button
                className="tl-btn"
                title="Connection"
                style={{
                  opacity: canShowDropdown ? 1 : 0.5,
                  cursor: canShowDropdown ? "pointer" : "not-allowed"
                }}
                disabled={!canShowDropdown}
                onClick={e => {
                  e.stopPropagation();
                  if (canShowDropdown) setShowConnectionDropdown(v => !v);
                }}
              >
                <img src="./assets/ui/Connection.png" alt="Connection" />
              </button>

              {/* Dropdown list */}
              {showConnectionDropdown && canShowDropdown && (
                <div className="connection-dropdown-list" onClick={e => e.stopPropagation()}>
                  <button className="connection-dropdown-item">Bluetooth</button>
                  <button className="connection-dropdown-item">Serial</button>
                  <button className="connection-dropdown-item">WiFi</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* DeviceSelect modal */}
      {showDeviceModal &&
        <DeviceSelectModal
          onClose={() => setShowDeviceModal(false)}
          onSelectDevice={key => {
            dispatch(setSelectedDevice(key));
            setShowDeviceModal(false);
            setShowConnectionDropdown(false); // close dropdown on device change
          }}
        />
      }
    </>
  );
}
