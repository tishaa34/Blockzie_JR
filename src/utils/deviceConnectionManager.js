// src/utils/deviceConnectionManager.js
let bluetoothDevice = null;
let bleServer = null;
let wifiSocket = null;
let serialPort = null;

const log = (...args) => console.log("[DeviceManager]", ...args);

export async function connectBluetooth() {
  try {
    if (!navigator.bluetooth) throw new Error("Bluetooth not supported");
    bluetoothDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ["device_information", "battery_service"]
    });
    bleServer = await bluetoothDevice.gatt.connect();
    log("✅ Bluetooth connected:", bluetoothDevice.name);
    return { success: true, name: bluetoothDevice.name };
  } catch (err) {
    alert("Bluetooth error: " + err.message);
    return { success: false, error: err.message };
  }
}

export async function connectWiFi() {
  try {
    const ip = prompt("Enter ESP32 IP (shown on Serial Monitor):");
    if (!ip) return { success: false };
    const ws = new WebSocket(`ws://${ip}:81/`);
    wifiSocket = ws;

    return await new Promise((resolve) => {
      ws.onopen = () => {
        log("✅ WiFi connected:", ip);
        resolve({ success: true, name: `ESP32 (${ip})` });
      };
      ws.onerror = (err) => {
        resolve({ success: false, error: err.message });
      };
    });
  } catch (err) {
    alert("WiFi error: " + err.message);
    return { success: false, error: err.message };
  }
}

export async function connectSerial() {
  if (!("serial" in navigator)) {
    alert("Web Serial not supported in this browser.");
    return { success: false };
  }
  try {
    serialPort = await navigator.serial.requestPort();
    await serialPort.open({ baudRate: 115200 });
    log("✅ Serial connected");
    return { success: true, name: "ESP32 Serial" };
  } catch (err) {
    alert("Serial error: " + err.message);
    return { success: false, error: err.message };
  }
}

export function sendCommand(cmd) {
  const text = typeof cmd === "string" ? cmd : JSON.stringify(cmd);
  if (wifiSocket?.readyState === WebSocket.OPEN) {
    wifiSocket.send(text + "\n");
  } else if (serialPort?.writable) {
    const writer = serialPort.writable.getWriter();
    writer.write(new TextEncoder().encode(text + "\n"));
    writer.releaseLock();
  } else {
    log("⚠️ No connection to send:", cmd);
  }
}

export function isConnected() {
  return (
    (wifiSocket && wifiSocket.readyState === WebSocket.OPEN) ||
    (serialPort && serialPort.readable) ||
    (bleServer && bleServer.connected)
  );
}
