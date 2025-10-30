import React, { useState, useEffect } from "react";

export default function ConnectionModal({
  isOpen,
  onClose,
  onPeripheralConnected,
  onBluetoothPortDisconnected,
  onRequestCloseConnect,
}) {
  // --- Bluetooth States ---
  const [isBluetoothConnected, setIsBluetoothConnected] = useState(false);
  const [bluetoothDevice, setBluetoothDevice] = useState(null);

  // --- WiFi States ---
  const [isWiFiConnected, setIsWiFiConnected] = useState(false);
  const [esp32IP, setEsp32IP] = useState(null);

  // --- Serial States ---
  const [isSerialConnected, setIsSerialConnected] = useState(false);
  const [serialPort, setSerialPort] = useState(null);

  const [deviceName, setDeviceName] = useState("");

  // ========================
  // 🔵 Bluetooth Connection
  // ========================
  const connectToESP32 = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["d804b643-6ce7-4e81-9f8a-ce0f699085eb"],
      });

      const server = await device.gatt.connect();
      setBluetoothDevice(device);
      setIsBluetoothConnected(true);
      setDeviceName(device.name || "Unknown Device");

      if (onPeripheralConnected)
        onPeripheralConnected(device.name || "ESP32", device.id);

      const service = await server.getPrimaryService(
        "d804b643-6ce7-4e81-9f8a-ce0f699085eb"
      );
      const characteristic = await service.getCharacteristic(
        "c8659211-af91-4ad3-a995-a58d6fd26145"
      );

      window.bluetoothCharacteristic = characteristic;
    } catch (error) {
      console.error("Bluetooth connection error:", error);
      setIsBluetoothConnected(false);
      if (onBluetoothPortDisconnected) onBluetoothPortDisconnected();
    }
  };

  const disconnectFromESP32 = async () => {
    if (bluetoothDevice && bluetoothDevice.gatt.connected) {
      bluetoothDevice.gatt.disconnect();
      setIsBluetoothConnected(false);
      setBluetoothDevice(null);
      setDeviceName("");
    }
  };

  const handleBluetoothConnection = async () => {
    if (!isBluetoothConnected) {
      await connectToESP32();
      if (onRequestCloseConnect) onRequestCloseConnect();
    } else {
      await disconnectFromESP32();
      if (onRequestCloseConnect) onRequestCloseConnect();
    }
  };

  // ========================
  // 📡 WiFi Connection
  // ========================
  const handleWiFiConnect = async () => {
    try {
      let ip = localStorage.getItem("ipAddress");

      if (!ip) {
        ip = prompt("📡 Enter ESP32 IP address:", "192.168.4.1");
        if (!ip) throw new Error("No IP entered");
        localStorage.setItem("ipAddress", ip);
      }

      const response = await fetch(`http://${ip}/connect`);
      if (!response.ok) throw new Error("Connection failed");

      setIsWiFiConnected(true);
      setEsp32IP(ip);
      setDeviceName(`WiFi @ ${ip}`);
      window.isWiFiConnected = true;
      window.esp32IP = ip;

      if (onPeripheralConnected)
        onPeripheralConnected("ESP32 (WiFi)", "WIFI-" + ip);

      console.log("✅ Connected via WiFi!");
    } catch (error) {
      console.error("❌ WiFi connect failed:", error);
      setIsWiFiConnected(false);
      window.isWiFiConnected = false;
    }
  };

  const handleWiFiDisconnect = async () => {
    try {
      const ip = esp32IP || "192.168.4.1";
      await fetch(`http://${ip}/disconnect`, { method: "POST" });
      console.log("✅ WiFi disconnected");
    } catch (err) {
      console.warn("WiFi disconnect failed:", err);
    } finally {
      setIsWiFiConnected(false);
      setDeviceName("");
      setEsp32IP(null);
      window.isWiFiConnected = false;
      localStorage.removeItem("ipAddress");
    }
  };

  const handleWiFiToggle = async () => {
    if (!isWiFiConnected) {
      await handleWiFiConnect();
      if (onRequestCloseConnect) onRequestCloseConnect();
    } else {
      await handleWiFiDisconnect();
      if (onRequestCloseConnect) onRequestCloseConnect();
    }
  };

  // ========================
  // 🧩 Serial Port (USB)
  // ========================
  const connectToSerial = async () => {
    try {
      if (!("serial" in navigator)) {
        alert("❌ Web Serial API not supported in this browser!");
        return;
      }

      // 🔹 Opens the native popup like PictoBlox
      const port = await navigator.serial.requestPort();

      // 🔹 Open port with standard baudRate
      await port.open({ baudRate: 115200 });
      setSerialPort(port);
      setIsSerialConnected(true);
      setDeviceName("ESP32 (Serial)");
      window.serialPort = port;

      console.log("✅ Serial connection established!");

      // Notify parent
      if (onPeripheralConnected) onPeripheralConnected("ESP32 (Serial)", port);

      // Start reading data
      readFromSerial(port);
    } catch (error) {
      console.error("❌ Serial connection failed:", error);
      setIsSerialConnected(false);
      setDeviceName("");
      if (onBluetoothPortDisconnected) onBluetoothPortDisconnected();
    }
  };

  const disconnectFromSerial = async () => {
    try {
      if (serialPort) {
        await serialPort.close();
        console.log("🔌 Serial port closed.");
      }
      setIsSerialConnected(false);
      setSerialPort(null);
      setDeviceName("");
      window.serialPort = null;
    } catch (error) {
      console.error("⚠ Failed to close serial port:", error);
    }
  };

  const readFromSerial = async (port) => {
    try {
      const reader = port.readable.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        console.log("📩 Serial Data:", text);

        if (window.onSerialData) window.onSerialData(text);
      }

      reader.releaseLock();
    } catch (error) {
      console.error("Serial read error:", error);
    }
  };

  const handleSerialConnection = async () => {
    if (!isSerialConnected) {
      await connectToSerial(); // Opens native port chooser
      if (onRequestCloseConnect) onRequestCloseConnect();
    } else {
      await disconnectFromSerial();
      if (onRequestCloseConnect) onRequestCloseConnect();
    }
  };

  // ========================
  // 🖼️ UI Rendering
  // ========================
  if (!isOpen) return null;

  return (
    <div className="connection-modal-overlay" onClick={onClose}>
      <div className="connection-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Connect to Device</h2>

        {/* Bluetooth */}
        <button onClick={handleBluetoothConnection}>
          {isBluetoothConnected
            ? `Disconnect Bluetooth (${deviceName})`
            : "Connect Bluetooth"}
        </button>

        {/* WiFi */}
        <button onClick={handleWiFiToggle}>
          {isWiFiConnected
            ? `Disconnect WiFi (${deviceName})`
            : "Connect WiFi"}
        </button>

        {/* Serial */}
        <button onClick={handleSerialConnection}>
          {isSerialConnected
            ? `Disconnect Serial (${deviceName})`
            : "Connect Serial"}
        </button>

        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}


// ============================
// ✅ Exported Utility Scanners
// ============================
export async function scanBluetoothDevices(setList) {
  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ["battery_service"],
    });
    setList((prev) => [...new Set([...prev, device.name || "Unknown Device"])]);
  } catch (err) {
    console.warn("Bluetooth scan cancelled or failed:", err);
  }
}

export async function scanWiFiDevices(setList) {
  try {
    const storedIPs = JSON.parse(localStorage.getItem("knownWiFiDevices") || "[]");
    setList(storedIPs.length ? storedIPs : ["192.168.4.1 (Default ESP32)"]);
  } catch (err) {
    console.warn("WiFi scan failed:", err);
  }
}

export async function scanSerialDevices(setList) {
  try {
    if (!("serial" in navigator)) {
      setList(["❌ Web Serial API not supported in this browser"]);
      return;
    }

    // Check for previously selected port (if user already connected)
    if (window.serialPort && window.serialPort.readable) {
      setList(["✅ ESP32 (Serial) Connected"]);
      return;
    }

    // Ask user to select a port manually
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });

    // Store globally so we can reuse it
    window.serialPort = port;
    setList(["✅ ESP32 (Serial) Connected"]);

    console.log("✅ Serial Port Connected:", port);

    // Optional: test read or handshake
    const reader = port.readable.getReader();
    const { value } = await reader.read();
    if (value) console.log("📩 Serial Response:", new TextDecoder().decode(value));
    reader.releaseLock();

    // Close the port after test read (optional)
    await port.close();
  } catch (err) {
    if (err.name === "NotFoundError") {
      setList(["⚠️ No Serial Device Selected"]);
    } else if (err.message.includes("cancel")) {
      setList(["🔹 Scan Cancelled"]);
    } else {
      console.error("❌ Serial scan failed:", err);
      setList(["❌ Serial scan failed"]);
    }
  }
}
