// 🎯 BLACK TRACK DETECTION SYSTEM
export class RealTrackDetectionSystem {
  constructor() {
    this.isActive = false;
    this.targetColor = '#000000';
    this.gridWidth = 20;
    this.gridHeight = 15;
    this.canvas = null;
    this.ctx = null;
    this.backgroundImage = null;
    this.trackPositions = new Set();
    
    console.log('🎯 BLACK TRACK DETECTION SYSTEM INITIALIZED');
  }

  async initializeCanvas() {
    try {
      // Create canvas for detection (completely hidden)
      this.canvas = document.createElement('canvas');
      this.canvas.width = 800;
      this.canvas.height = 600;
      this.canvas.style.display = 'none';
      document.body.appendChild(this.canvas);
      
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
      
      // Load background for detection
      await this.loadCurrentBackground();
      
      console.log('✅ Black track detection ready');
      return true;
    } catch (error) {
      console.error('❌ Canvas initialization failed:', error);
      return false;
    }
  }

  async loadCurrentBackground() {
    return new Promise((resolve) => {
      try {
        const currentBg = localStorage.getItem('simulatorBackground') || './assets/backgrounds/bg2.svg';
        
        this.backgroundImage = new Image();
        this.backgroundImage.crossOrigin = 'anonymous';
        this.backgroundImage.onload = () => {
          // Draw the background to our canvas
          this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
          console.log('✅ Background loaded for black track detection');
          
          // Scan for black track
          this.scanForBlackTrack();
          resolve(true);
        };
        
        this.backgroundImage.onerror = () => {
          console.error('❌ Failed to load background image');
          this.createBlackTrack();
          resolve(false);
        };
        
        this.backgroundImage.src = currentBg;
      } catch (error) {
        console.error('❌ Error loading background:', error);
        this.createBlackTrack();
        resolve(false);
      }
    });
  }

  async scanForBlackTrack() {
    console.log('🔍 Scanning for BLACK track...');
    this.trackPositions.clear();
    
    let blackCells = 0;
    const blackThreshold = 50; // RGB values below this are considered black
    
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const color = await this.samplePositionColor(x, y);
        
        // Check if this is BLACK (all RGB components are low)
        const isBlack = color.r < blackThreshold && color.g < blackThreshold && color.b < blackThreshold;
        
        if (isBlack) {
          this.trackPositions.add(`${x},${y}`);
          blackCells++;
          console.log(`📍 Found BLACK track at (${x}, ${y}): RGB(${color.r}, ${color.g}, ${color.b})`);
        }
      }
    }
    
    console.log(`✅ Black track scanning complete: ${blackCells} black positions found`);
    
    if (blackCells > 10) {
      console.log('🎯 USING DETECTED BLACK TRACK FROM IMAGE');
      
      // Log the track shape for debugging
      this.logTrackShape();
    } else {
      console.log('🔄 Not enough black cells found, using predefined black track');
      this.createBlackTrack();
    }
  }

  logTrackShape() {
    console.log('🗺️ Black track positions:');
    const trackArray = Array.from(this.trackPositions);
    
    // Create a visual grid representation
    let grid = '';
    for (let y = 0; y < this.gridHeight; y++) {
      let row = '';
      for (let x = 0; x < this.gridWidth; x++) {
        if (this.trackPositions.has(`${x},${y}`)) {
          row += '▓'; // Black track
        } else {
          row += '░'; // Empty
        }
      }
      console.log(row);
    }
  }

  createBlackTrack() {
    console.log('🔄 Creating standard black track pattern');
    this.trackPositions.clear();
    
    // Standard black oval track (adjust based on your actual track)
    // Outer track
    for (let x = 2; x <= 17; x++) {
      this.trackPositions.add(`${x},3`);
      this.trackPositions.add(`${x},11`);
    }
    for (let y = 4; y <= 10; y++) {
      this.trackPositions.add(`2,${y}`);
      this.trackPositions.add(`17,${y}`);
    }
    
    // Additional track elements
    this.trackPositions.add('5,6');
    this.trackPositions.add('5,7');
    this.trackPositions.add('5,8');
    this.trackPositions.add('14,6');
    this.trackPositions.add('14,7');
    this.trackPositions.add('14,8');
    
    console.log(`✅ Black track created: ${this.trackPositions.size} positions`);
  }

  async samplePositionColor(gridX, gridY) {
    if (!this.canvas || !this.ctx) {
      return { r: 255, g: 255, b: 255, darkness: 0 };
    }

    try {
      const cellWidth = this.canvas.width / this.gridWidth;
      const cellHeight = this.canvas.height / this.gridHeight;
      
      // Sample multiple points to avoid false positives
      const samplePoints = [
        { x: cellWidth / 2, y: cellHeight / 2 }, // Center
        { x: cellWidth / 4, y: cellHeight / 4 }, // Top-left
        { x: 3 * cellWidth / 4, y: 3 * cellHeight / 4 } // Bottom-right
      ];
      
      let totalR = 0, totalG = 0, totalB = 0;
      let samples = 0;
      
      for (const point of samplePoints) {
        const pixelX = Math.floor(gridX * cellWidth + point.x);
        const pixelY = Math.floor(gridY * cellHeight + point.y);
        
        if (pixelX >= 0 && pixelX < this.canvas.width && pixelY >= 0 && pixelY < this.canvas.height) {
          const pixelData = this.ctx.getImageData(pixelX, pixelY, 1, 1).data;
          totalR += pixelData[0];
          totalG += pixelData[1];
          totalB += pixelData[2];
          samples++;
        }
      }
      
      if (samples === 0) {
        return { r: 255, g: 255, b: 255, darkness: 0 };
      }
      
      const avgR = Math.floor(totalR / samples);
      const avgG = Math.floor(totalG / samples);
      const avgB = Math.floor(totalB / samples);
      const darkness = 1 - (avgR + avgG + avgB) / (3 * 255);
      
      return { r: avgR, g: avgG, b: avgB, darkness };
    } catch (error) {
      return { r: 255, g: 255, b: 255, darkness: 0 };
    }
  }

  setTargetColor(hexColor) {
    this.targetColor = hexColor;
    console.log(`🎯 BLACK TRACK: Target color confirmed as ${hexColor}`);
  }

  async detectColorAtPosition(gridX, gridY) {
    // Only detect BLACK track positions
    const positionKey = `${gridX},${gridY}`;
    const isOnBlackTrack = this.trackPositions.has(positionKey);
    
    if (isOnBlackTrack) {
      console.log(`🔍 BLACK TRACK at (${gridX}, ${gridY}): ✅ ON BLACK TRACK`);
    } else {
      console.log(`🔍 BLACK TRACK at (${gridX}, ${gridY}): ❌ NOT ON TRACK`);
    }
    
    return isOnBlackTrack;
  }

  async isOnColorPath(robotX, robotY) {
    return await this.detectColorAtPosition(robotX, robotY);
  }

  async findNearestTrackPosition(startX, startY) {
    console.log(`🔍 Finding nearest BLACK track from (${startX}, ${startY})`);
    
    // Search nearby positions for black track
    for (let radius = 1; radius <= 3; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
            const x = startX + dx;
            const y = startY + dy;
            
            if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
              if (await this.detectColorAtPosition(x, y)) {
                console.log(`📍 Found BLACK track at (${x}, ${y})`);
                return { x, y };
              }
            }
          }
        }
      }
    }
    
    console.log('❌ No black track found nearby, using default position');
    return { x: 2, y: 3 }; // Default to a known track position
  }

  async getColorPathDirection(currentX, currentY, lastDirection = null) {
    console.log(`🧭 Finding BLACK track direction from (${currentX}, ${currentY})`);
    
    const directions = [
      { name: 'right', dx: 1, dy: 0 },
      { name: 'down', dx: 0, dy: 1 },
      { name: 'left', dx: -1, dy: 0 },
      { name: 'up', dx: 0, dy: -1 }
    ];
    
    // Try to continue in same direction first
    if (lastDirection) {
      const continueDir = directions.find(d => d.name === lastDirection);
      if (continueDir) {
        const newX = currentX + continueDir.dx;
        const newY = currentY + continueDir.dy;
        
        if (await this.isPositionValid(newX, newY)) {
          console.log(`🧭 Continuing ${lastDirection} on BLACK track`);
          return lastDirection;
        }
      }
    }
    
    // Find all valid black track directions
    const validDirections = [];
    for (const dir of directions) {
      const newX = currentX + dir.dx;
      const newY = currentY + dir.dy;
      
      if (await this.isPositionValid(newX, newY)) {
        validDirections.push(dir);
        console.log(`  ✅ BLACK track direction: ${dir.name} to (${newX}, ${newY})`);
      }
    }
    
    if (validDirections.length === 0) {
      console.log('🚫 No black track directions found');
      return null;
    }
    
    // Choose the best direction (prefer straight movement)
    const chosen = this.chooseBestDirection(validDirections, lastDirection);
    console.log(`🧭 Moving on BLACK track: ${chosen}`);
    return chosen;
  }

  chooseBestDirection(validDirections, lastDirection) {
    // Prefer continuing straight
    if (lastDirection && validDirections.find(d => d.name === lastDirection)) {
      return lastDirection;
    }
    
    // Prefer right turns over left turns
    const rightTurn = validDirections.find(d => d.name === 'right');
    if (rightTurn) return 'right';
    
    const downTurn = validDirections.find(d => d.name === 'down');
    if (downTurn) return 'down';
    
    const leftTurn = validDirections.find(d => d.name === 'left');
    if (leftTurn) return 'left';
    
    const upTurn = validDirections.find(d => d.name === 'up');
    if (upTurn) return 'up';
    
    // Default to first valid direction
    return validDirections[0].name;
  }

  async isPositionValid(x, y) {
    if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
      return false;
    }
    return await this.detectColorAtPosition(x, y);
  }

  startDetection(callback) {
    this.isActive = true;
    console.log('🎯 BLACK TRACK DETECTION STARTED');
    if (callback) callback(true);
  }

  stopDetection() {
    this.isActive = false;
    console.log('🛑 BLACK TRACK DETECTION STOPPED');
  }

  cleanup() {
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

// Black track detector
export const canvasColorDetector = new RealTrackDetectionSystem();
export const colorDetector = canvasColorDetector;

if (typeof window !== 'undefined') {
  window.canvasColorDetector = canvasColorDetector;
  console.log('🎯 BLACK TRACK DETECTION SYSTEM GLOBALLY AVAILABLE');
}

export default RealTrackDetectionSystem;