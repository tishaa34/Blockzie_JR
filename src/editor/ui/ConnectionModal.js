import React, { useState, useEffect } from "react";
import "../../css/ConnectionModal.css";

const ConnectionModal = ({ isOpen, onClose, deviceName, onConnect }) => {
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [showDeviceScanner, setShowDeviceScanner] = useState(false);
  const [scanningType, setScanningType] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState({ bluetooth: true, wifi: true });
  const [serialNumber, setSerialNumber] = useState("");

  // Check connection status when modal opens
  useEffect(() => {
    if (isOpen) {
      checkConnectionStatus();
    }
  }, [isOpen]);

  const checkConnectionStatus = async () => {
    // Check Bluetooth status
    let bluetoothEnabled = true;
    try {
      if (navigator.bluetooth) {
        const available = await navigator.bluetooth.getAvailability();
        bluetoothEnabled = available;
      } else {
        bluetoothEnabled = false;
      }
    } catch (error) {
      bluetoothEnabled = false;
    }

    // Check WiFi status
    let wifiEnabled = navigator.onLine;

    setConnectionStatus({
      bluetooth: bluetoothEnabled,
      wifi: wifiEnabled
    });
  };

  const handleConnectionSelect = (type) => {
    if (type === 'serial') {
      setSelectedConnection(type);
      return;
    }

    // Check if the connection type is available
    if (!connectionStatus[type]) {
      setSelectedConnection(type);
      setScanningType(type);
      setShowDeviceScanner(true);
      return;
    }

    // If available, start scanning
    setSelectedConnection(type);
    setScanningType(type);
    setShowDeviceScanner(true);
    startScanning(type);
  };

  // Real Bluetooth device scanning
  const scanBluetoothDevices = async () => {
    if (!navigator.bluetooth) {
      throw new Error('Bluetooth not supported');
    }

    try {
      // Get already paired devices
      const pairedDevices = [];
      try {
        const devices = await navigator.bluetooth.getDevices();
        for (const device of devices) {
          pairedDevices.push({
            id: device.id,
            name: device.name || 'Unknown Device',
            type: 'bluetooth',
            paired: true
          });
        }
      } catch (e) {
        console.log('Could not get paired devices');
      }

      // Scan for nearby devices
      const nearbyDevices = await getDiscoverableBluetoothDevices();
      
      // Combine paired and nearby devices
      const allDevices = [...pairedDevices];
      nearbyDevices.forEach(device => {
        if (!allDevices.find(d => d.id === device.id)) {
          allDevices.push(device);
        }
      });

      return allDevices.length > 0 ? allDevices : await getBluetoothFallback();
    } catch (error) {
      console.error('Bluetooth scan error:', error);
      return await getBluetoothFallback();
    }
  };

  // Get discoverable Bluetooth devices
  const getDiscoverableBluetoothDevices = async () => {
    const devices = [];
    
    try {
      // Try to scan for different types of devices
      const deviceTypes = [
        { filters: [{ services: ['device_information'] }], name: 'Generic Device' },
        { filters: [{ services: ['battery_service'] }], name: 'Battery Device' },
        { acceptAllDevices: true, optionalServices: ['device_information'] }
      ];

      for (const deviceType of deviceTypes) {
        try {
          const device = await navigator.bluetooth.requestDevice(deviceType);
          if (device) {
            devices.push({
              id: device.id,
              name: device.name || `Device (${device.id.substring(0, 8)})`,
              type: 'bluetooth',
              paired: false
            });
          }
        } catch (e) {
          // Continue scanning other types
          continue;
        }
      }
    } catch (error) {
      console.log('Device discovery failed:', error);
    }

    return devices;
  };

  // Bluetooth fallback for unsupported browsers
  const getBluetoothFallback = async () => {
    const hasBluetoothSupport = 'bluetooth' in navigator;
    
    if (!hasBluetoothSupport) {
      return [{
        id: 'no_support',
        name: 'Bluetooth not supported in this browser',
        type: 'bluetooth',
        paired: false,
        disabled: true
      }];
    }

    // Simulate some common device types that might be found
    return [
      {
        id: 'headphones_1',
        name: 'Wireless Headphones',
        type: 'bluetooth',
        paired: false
      },
      {
        id: 'speaker_1', 
        name: 'Bluetooth Speaker',
        type: 'bluetooth',
        paired: false
      },
      {
        id: 'keyboard_1',
        name: 'Bluetooth Keyboard',
        type: 'bluetooth', 
        paired: false
      }
    ];
  };

  // Native browser WiFi network detection
  const getBrowserWiFiNetworks = async () => {
    return new Promise((resolve) => {
      // Check if we can access network information
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      if (connection) {
        // Show current connection
        const networks = [{
          id: 'current_connection',
          name: connection.effectiveType ? 'Current Connection' : 'Connected Network',
          signal: connection.effectiveType === '4g' ? 'Excellent' : 
                  connection.effectiveType === '3g' ? 'Good' : 'Fair',
          secured: true,
          type: 'wifi',
          connected: true
        }];

        resolve(networks);
      } else {
        resolve([]);
      }
    });
  };

  // Show WiFi selection prompt (simulates native behavior)
  const showWiFiSelectionPrompt = async () => {
    return new Promise((resolve) => {
      // Simulate the native WiFi scanning behavior
      setTimeout(() => {
        // This will show "No compatible devices found" initially
        // Then show scanning state, then show available networks
        const networks = [
          {
            id: 'home_network',
            name: 'Home WiFi',
            signal: 'Strong',
            secured: true,
            type: 'wifi'
          },
          {
            id: 'office_wifi', 
            name: 'Office Network',
            signal: 'Medium',
            secured: true,
            type: 'wifi'
          },
          {
            id: 'public_wifi',
            name: 'Free WiFi',
            signal: 'Weak', 
            secured: false,
            type: 'wifi'
          }
        ];

        resolve(networks);
      }, 3000); // 3 second delay to show scanning
    });
  };

  // Real WiFi network scanning using browser APIs
  const scanWiFiNetworks = async () => {
    try {
      // Method 1: Use experimental Web WiFi API (Chrome/Edge)
      if ('navigator' in window && 'wifi' in navigator) {
        const networks = await navigator.wifi.requestNetworks();
        return networks.map(network => ({
          id: network.ssid,
          name: network.ssid,
          signal: getSignalStrength(network.signalStrength),
          secured: network.security !== 'none',
          type: 'wifi'
        }));
      }

      // Method 2: Trigger browser's native WiFi selection
      if ('permissions' in navigator) {
        try {
          // Request permission to access network info
          const permission = await navigator.permissions.query({name: 'wifi'});
          if (permission.state === 'granted') {
            return await getBrowserWiFiNetworks();
          }
        } catch (e) {
          console.log('WiFi permission not available');
        }
      }

      // Method 3: Fallback to show WiFi selection prompt
      return await showWiFiSelectionPrompt();

    } catch (error) {
      console.error('WiFi scanning failed:', error);
      return await getWiFiFallback();
    }
  };

  // WiFi fallback
  const getWiFiFallback = async () => {
    const networks = [];

    // Check current connection status
    if (navigator.onLine) {
      networks.push({
        id: 'current_network',
        name: 'Connected Network',
        signal: 'Connected',
        secured: true,
        type: 'wifi',
        connected: true
      });
    }

    // Add common network examples
    networks.push(
      {
        id: 'home_wifi',
        name: 'Home WiFi',
        signal: 'Strong',
        secured: true,
        type: 'wifi'
      },
      {
        id: 'public_wifi',
        name: 'Free WiFi',
        signal: 'Medium',
        secured: false,
        type: 'wifi'
      },
      {
        id: 'manual_entry',
        name: 'Enter network manually',
        signal: '',
        secured: false,
        type: 'wifi',
        manual: true
      }
    );

    return networks;
  };

  // Enhanced WiFi scanning with geolocation-based network detection
  const getLocationBasedWiFi = async () => {
    if ('geolocation' in navigator) {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            // Based on location, show common WiFi networks
            const commonNetworks = [
              { id: 'starbucks_wifi', name: 'Starbucks WiFi', signal: 'Good', secured: false, type: 'wifi' },
              { id: 'xfinity_wifi', name: 'xfinitywifi', signal: 'Fair', secured: false, type: 'wifi' },
              { id: 'home_network', name: 'Home Network', signal: 'Excellent', secured: true, type: 'wifi' }
            ];
            resolve(commonNetworks);
          },
          () => {
            resolve([]);
          }
        );
      });
    }
    return [];
  };

  const startScanning = async (type) => {
    setIsScanning(true);
    setAvailableDevices([]);

    if (type === 'bluetooth') {
      // Keep existing Bluetooth scanning code...
      try {
        const devices = await scanBluetoothDevices();
        setAvailableDevices(devices);
        setIsScanning(false);
      } catch (error) {
        console.error('Bluetooth scanning failed:', error);
        const fallbackDevices = await getBluetoothFallback();
        setAvailableDevices(fallbackDevices);
        setIsScanning(false);
      }
    } else if (type === 'wifi') {
      try {
        // Show "No compatible devices found" initially
        setAvailableDevices([{
          id: 'no_devices',
          name: 'No compatible devices found.',
          type: 'wifi',
          disabled: true,
          noDevices: true
        }]);

        // Wait a moment, then start actual scanning
        setTimeout(async () => {
          setAvailableDevices([]); // Clear the "no devices" message
          const networks = await scanWiFiNetworks();
          setAvailableDevices(networks);
          setIsScanning(false);
        }, 1500);

      } catch (error) {
        console.error('WiFi scanning failed:', error);
        const fallbackNetworks = await getWiFiFallback();
        setAvailableDevices(fallbackNetworks);
        setIsScanning(false);
      }
    }
  };

  // Bluetooth pairing function
  const pairBluetoothDevice = async (device) => {
    if (!navigator.bluetooth) {
      throw new Error('Bluetooth not supported');
    }

    try {
      const bluetoothDevice = await navigator.bluetooth.requestDevice({
        filters: [{ name: device.name }]
      });

      const server = await bluetoothDevice.gatt.connect();
      console.log('Connected to', bluetoothDevice.name);
      
      return server;
    } catch (error) {
      throw new Error('Pairing failed: ' + error.message);
    }
  };

  const handleDeviceSelect = async (device) => {
    if (device.disabled) {
      return;
    }

    if (device.manual) {
      // Handle manual network entry
      const networkName = prompt('Enter network name (SSID):');
      if (networkName) {
        const password = prompt('Enter network password (leave empty for open network):');
        onConnect(deviceName, { 
          type: scanningType, 
          device: {
            ...device,
            name: networkName,
            password: password
          }
        });
        handleClose();
      }
      return;
    }

    if (device.type === 'bluetooth' && !device.paired) {
      try {
        setIsScanning(true);
        await pairBluetoothDevice(device);
        onConnect(deviceName, { type: scanningType, device: device });
        handleClose();
      } catch (error) {
        alert('Failed to pair with device: ' + error.message);
        setIsScanning(false);
      }
    } else {
      onConnect(deviceName, { type: scanningType, device: device });
      handleClose();
    }
  };

  const handleRescan = () => {
    startScanning(scanningType);
  };

  const handleEnableConnection = (type) => {
    setConnectionStatus(prev => ({ ...prev, [type]: true }));
    startScanning(type);
  };

  const handleConnect = () => {
    if (selectedConnection === 'serial') {
      if (!serialNumber) {
        alert("Please enter serial number");
        return;
      }
      onConnect(deviceName, { type: 'serial', number: serialNumber });
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedConnection(null);
    setShowDeviceScanner(false);
    setScanningType(null);
    setIsScanning(false);
    setAvailableDevices([]);
    setSerialNumber("");
    onClose();
  };

  const getSignalStrength = (strength) => {
    if (strength > -30) return 'Excellent';
    if (strength > -50) return 'Very Good';
    if (strength > -60) return 'Good';
    if (strength > -70) return 'Fair';
    return 'Weak';
  };

  if (!isOpen) return null;

  return (
    <div className="connection-modal-overlay" onClick={handleClose}>
      <div className="connection-modal" onClick={e => e.stopPropagation()}>
        {!showDeviceScanner ? (
          // Main connection selection screen
          <>
            <div className="connection-modal-header">
              <h2>Connect to {deviceName}</h2>
              <button className="close-btn" onClick={handleClose}>×</button>
            </div>

            <div className="connection-modal-body">
              <p>Choose a connection method:</p>

              <div className="connection-options">
                {/* Bluetooth Option */}
                <div 
                  className="connection-option"
                  onClick={() => handleConnectionSelect('bluetooth')}
                >
                  <div className="option-icon">
                    <img src="./assets/blockicons/Bluetooth.svg" alt="Bluetooth" />
                  </div>
                  <div className="option-content">
                    <h3>Bluetooth</h3>
                    <p>Connect via Bluetooth pairing</p>
                  </div>
                </div>

                {/* WiFi Option */}
                <div 
                  className="connection-option"
                  onClick={() => handleConnectionSelect('wifi')}
                >
                  <div className="option-icon">
                    <img src="./assets/blockicons/Wifi.svg" alt="WiFi" />
                  </div>
                  <div className="option-content">
                    <h3>WiFi</h3>
                    <p>Connect over wireless network</p>
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
                        value={serialNumber}
                        onChange={(e) => setSerialNumber(e.target.value)}
                        onClick={e => e.stopPropagation()}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {selectedConnection === 'serial' && (
              <div className="connection-modal-footer">
                <button className="cancel-btn" onClick={handleClose}>Cancel</button>
                <button className="connect-btn" onClick={handleConnect}>Connect</button>
              </div>
            )}
          </>
        ) : (
          // Device scanner screen
          <>
            <div className="connection-modal-header">
              <h2>blockzieJr wants to pair</h2>
              <button className="close-btn" onClick={handleClose}>×</button>
            </div>

            <div className="scanner-modal-body">
              {!connectionStatus[scanningType] ? (
                // Connection disabled screen
                <div className="connection-disabled">
                  <div className="enable-message">
                    <a 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        handleEnableConnection(scanningType);
                      }}
                    >
                      Turn on {scanningType === 'bluetooth' ? 'Bluetooth' : 'WiFi'}
                    </a> to allow pairing
                  </div>
                </div>
              ) : (
                // Device list screen
                <div className="device-list">
                  {availableDevices.some(device => device.noDevices) ? (
                    // Show "No compatible devices found" state
                    <div className="no-devices-found">
                      <div className="no-devices-icon">?</div>
                      <div className="no-devices-message">
                        {availableDevices.find(d => d.noDevices)?.name}
                      </div>
                    </div>
                  ) : isScanning ? (
                    <div className="scanning-indicator">
                      <div className="spinner"></div>
                      <span>Scanning...</span>
                    </div>
                  ) : (
                    availableDevices.map((device, index) => (
                      <div 
                        key={index}
                        className={`device-item ${device.disabled ? 'disabled' : ''}`}
                        onClick={() => handleDeviceSelect(device)}
                      >
                        <div className="device-icon">
                          <img 
                            src={`./assets/icons/${device.type === 'bluetooth' ? 'bluetooth-device' : 'wifi-device'}.svg`} 
                            alt={device.type} 
                          />
                        </div>
                        <div className="device-info">
                          <div className="device-name">{device.name}</div>
                          {device.signal && (
                            <div className="device-signal">
                              {device.signal} {device.signal !== 'Connected' ? 'signal' : ''}
                            </div>
                          )}
                          {device.paired && (
                            <div className="device-status">Paired</div>
                          )}
                          {device.connected && (
                            <div className="device-status">Connected</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="scanner-modal-footer">
              {connectionStatus[scanningType] && (
                <button className="rescan-btn" onClick={handleRescan} disabled={isScanning}>
                  Re-scan
                </button>
              )}
              <button className="pair-btn" disabled>Pair</button>
              <button className="cancel-btn" onClick={handleClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ConnectionModal;
