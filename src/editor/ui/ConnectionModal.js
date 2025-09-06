import React, { useState } from "react";
import "../../css/ConnectionModal.css";

const ConnectionModal = ({ isOpen, onClose, deviceName, onConnect }) => {
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [connectionData, setConnectionData] = useState({
    bluetooth: "",
    wifi: { ssid: "", password: "" },
    serial: ""
  });

  const handleConnectionSelect = (type) => {
    setSelectedConnection(type);
  };

  const handleInputChange = (type, field, value) => {
    if (type === 'wifi') {
      setConnectionData(prev => ({
        ...prev,
        wifi: { ...prev.wifi, [field]: value }
      }));
    } else {
      setConnectionData(prev => ({
        ...prev,
        [type]: value
      }));
    }
  };

  const handleConnect = () => {
    if (!selectedConnection) {
      alert("Please select a connection method");
      return;
    }

    let connectionInfo = {};
    switch (selectedConnection) {
      case 'bluetooth':
        if (!connectionData.bluetooth) {
          alert("Please enter Bluetooth device ID");
          return;
        }
        connectionInfo = { type: 'bluetooth', id: connectionData.bluetooth };
        break;
      case 'wifi':
        if (!connectionData.wifi.ssid) {
          alert("Please enter WiFi network name");
          return;
        }
        connectionInfo = { 
          type: 'wifi', 
          ssid: connectionData.wifi.ssid, 
          password: connectionData.wifi.password 
        };
        break;
      case 'serial':
        if (!connectionData.serial) {
          alert("Please enter serial number");
          return;
        }
        connectionInfo = { type: 'serial', number: connectionData.serial };
        break;
    }

    onConnect(deviceName, connectionInfo);
    onClose();
  };

  const handleClose = () => {
    setSelectedConnection(null);
    setConnectionData({
      bluetooth: "",
      wifi: { ssid: "", password: "" },
      serial: ""
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="connection-modal-overlay" onClick={handleClose}>
      <div className="connection-modal" onClick={e => e.stopPropagation()}>
        <div className="connection-modal-header">
          <h2>Connect to {deviceName}</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <div className="connection-modal-body">
          <p>Choose a connection method:</p>

          <div className="connection-options">
            {/* Bluetooth Option */}
            <div 
              className={`connection-option ${selectedConnection === 'bluetooth' ? 'selected' : ''}`}
              onClick={() => handleConnectionSelect('bluetooth')}
            >
              <div className="option-icon">
                <img src="./assets/blockicons/Bluetooth.svg" alt="Bluetooth" />
              </div>
              <div className="option-content">
                <h3>Bluetooth</h3>
                <p>Connect via Bluetooth pairing</p>
                {selectedConnection === 'bluetooth' && (
                  <input
                    type="text"
                    placeholder="Enter Bluetooth device ID"
                    value={connectionData.bluetooth}
                    onChange={(e) => handleInputChange('bluetooth', '', e.target.value)}
                    onClick={e => e.stopPropagation()}
                  />
                )}
              </div>
            </div>

            {/* WiFi Option */}
            <div 
              className={`connection-option ${selectedConnection === 'wifi' ? 'selected' : ''}`}
              onClick={() => handleConnectionSelect('wifi')}
            >
              <div className="option-icon">
                <img src="./assets/blockicons/Wifi.svg" alt="WiFi" />
              </div>
              <div className="option-content">
                <h3>WiFi</h3>
                <p>Connect over wireless network</p>
                {selectedConnection === 'wifi' && (
                  <div className="wifi-inputs" onClick={e => e.stopPropagation()}>
                    <input
                      type="text"
                      placeholder="Network name (SSID)"
                      value={connectionData.wifi.ssid}
                      onChange={(e) => handleInputChange('wifi', 'ssid', e.target.value)}
                    />
                    <input
                      type="password"
                      placeholder="Password (optional)"
                      value={connectionData.wifi.password}
                      onChange={(e) => handleInputChange('wifi', 'password', e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Serial Option */}
            <div 
              className={`connection-option ${selectedConnection === 'serial' ? 'selected' : ''}`}
              onClick={() => handleConnectionSelect('serial')}
            >
              <div className="option-icon">
                <img src="./assets/blockicons/Serial.svg" alt="Serial" />
              </div>
              <div className="option-content">
                <h3>Serial Connection</h3>
                <p>Connect via USB or serial port</p>
                {selectedConnection === 'serial' && (
                  <input
                    type="text"
                    placeholder="Enter serial number"
                    value={connectionData.serial}
                    onChange={(e) => handleInputChange('serial', '', e.target.value)}
                    onClick={e => e.stopPropagation()}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="connection-modal-footer">
          <button className="cancel-btn" onClick={handleClose}>Cancel</button>
          <button 
            className="connect-btn" 
            onClick={handleConnect}
            disabled={!selectedConnection}
          >
            Connect
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectionModal;
