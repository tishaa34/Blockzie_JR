const express = require('express');
const cors = require('cors');
const wifi = require('node-wifi');

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize wifi module
wifi.init({
  iface: null // network interface, choose a random wifi interface if set to null
});

// WiFi scanning endpoint
app.get('/api/scan-wifi', async (req, res) => {
  try {
    console.log('Scanning for WiFi networks...');
    
    const networks = await wifi.scan();
    
    const formattedNetworks = networks
      .filter(network => network.ssid && network.ssid.length > 0) // Filter out empty SSIDs
      .map(network => ({
        ssid: network.ssid,
        signal: network.quality > 80 ? 'Excellent' : 
                network.quality > 60 ? 'Good' : 
                network.quality > 40 ? 'Fair' : 'Weak',
        secured: network.security !== 'none' && network.security !== '',
        frequency: network.frequency,
        quality: network.quality
      }))
      .slice(0, 10); // Limit to first 10 networks
    
    console.log(`Found ${formattedNetworks.length} networks`);
    res.json(formattedNetworks);
  } catch (error) {
    console.error('WiFi scan error:', error);
    res.status(500).json({ 
      error: 'Failed to scan WiFi networks',
      message: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'WiFi scanner server is running' });
});

app.listen(port, () => {
  console.log(`WiFi scanner server running at http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('- GET /api/scan-wifi - Scan for available WiFi networks');
  console.log('- GET /api/health - Health check');
});

module.exports = app;
