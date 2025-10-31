import React, { useRef, useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import "../../css/Toolbar.css";
import DeviceSelectModal from "./DeviceSelectModal";
import { run } from "../../utils/runScript";
import { setSelectedDevice } from "../../store/sceneSlice";
import {
  scanBluetoothDevices,
  scanWiFiDevices,
  scanSerialDevices
} from "../../editor/ui/ConnectionModal";

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

  // --- ADDED: Auto-scanning DropdownSection helper (placed above main return) ---
  function DropdownSection({ title, scanFn }) {
    const [devices, setDevices] = useState([]);
    const [scanning, setScanning] = useState(true);

    // Auto-scan immediately when section mounts
    useEffect(() => {
      let mounted = true;
      (async () => {
        setScanning(true);
        setDevices([]);
        await scanFn((list) => { if (mounted) setDevices(list); });
        if (mounted) setScanning(false);
      })();
      return () => { mounted = false; };
    }, [scanFn]);

    return (
      <div style={{ marginBottom: "10px" }}>
        <strong>{title}</strong>
        <ul style={{ margin: "6px 0 0", paddingLeft: "14px", fontSize: "13px" }}>
          {scanning ? (
            <li style={{ color: "#888" }}>🔍 Scanning...</li>
          ) : devices.length === 0 ? (
            <li style={{ color: "#888" }}>No devices found</li>
          ) : (
            devices.map((d, i) => <li key={i}>• {d}</li>)
          )}
        </ul>
      </div>
    );
  }
  // --- end added helper ---

  function ConnectionItem({ label, scanFn }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [devices, setDevices] = useState([]);
    const [scanning, setScanning] = useState(false);

    const handleClick = async () => {
      console.log("🧠 CLICKED:", label);

      if (!isExpanded) {
        console.log("🔍 Starting scan for:", label);
        setIsExpanded(true);
        setScanning(true);
        setDevices([]);

        try {
          await scanFn((list) => {
            console.log("📋 Devices found from", label, ":", list);
            setDevices(list);
          });
        } catch (err) {
          console.error("❌ Error while scanning:", err);
        }

        setScanning(false);
      } else {
        console.log("📕 Collapsing:", label);
        setIsExpanded(false);
      }
    };


    return (
      <div style={{ position: "relative" }}>
        <button
          onClick={handleClick}
          style={{
            width: "100%",
            textAlign: "left",
            background: "none",
            border: "none",
            padding: "8px 12px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
          className="connection-dropdown-item"
        >
          {label}
        </button>

        {isExpanded && (
          <div
            style={{
              background: "#f9f9f9",
              borderTop: "1px solid #ddd",
              padding: "6px 10px",
              fontSize: "13px",
              maxHeight: "120px",
              overflowY: "auto"
            }}
          >
            {scanning ? (
              <div style={{ color: "#888" }}>🔍 Scanning...</div>
            ) : devices.length === 0 ? (
              <div style={{ color: "#888" }}>No devices found</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "18px" }}>
                {devices.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }

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
                <div
                  className="connection-dropdown-list"
                  style={{
                    background: "#fff",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    padding: "6px 0",
                    minWidth: "160px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    position: "absolute",
                    zIndex: 1000
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  
                  <ConnectionItem label="Bluetooth" scanFn={scanBluetoothDevices} />
                  <ConnectionItem label="Serial" scanFn={scanSerialDevices} />
                  <ConnectionItem label="WiFi" scanFn={scanWiFiDevices} />
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
