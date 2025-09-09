import React, { useRef, useState, useEffect } from 'react';
import * as posenet from '@tensorflow-models/posenet';
import * as tf from '@tensorflow/tfjs';
import '../../css/HumanDetectionFullStage.css';

const HumanDetectionFullStage = ({ isOpen, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [net, setNet] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [poses, setPoses] = useState([]);
  const [peopleCount, setPeopleCount] = useState(0);
  const [modelLoaded, setModelLoaded] = useState(false);

  // Initialize TensorFlow and load PoseNet model
  useEffect(() => {
    const loadModel = async () => {
      try {
        // Set TensorFlow backend
        await tf.setBackend('webgl');
        
        // Load PoseNet model with same config as Blockzie
        const model = await posenet.load({
          architecture: 'MobileNetV1',
          outputStride: 16,
          inputResolution: { width: 480, height: 360 },
          multiplier: 0.75
        });
        
        setNet(model);
        setModelLoaded(true);
        console.log('PoseNet model loaded successfully');
      } catch (error) {
        console.error('Error loading PoseNet model:', error);
      }
    };

    if (isOpen) {
      loadModel();
    }

    return () => {
      // Cleanup on unmount
      stopCamera();
    };
  }, [isOpen]);

  // Real-time pose detection loop
  useEffect(() => {
    let animationId;
    
const detectPoses = async () => {
  if (net && videoRef.current && isDetecting && cameraOn) {
    // Safety check: Ensure video has valid dimensions
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      animationId = requestAnimationFrame(detectPoses);
      return;
    }
    
    try {
      const detectedPoses = await net.estimateMultiplePoses(videoRef.current, {
        flipHorizontal: true,
        maxDetections: 5,
        scoreThreshold: 0.25,
        nmsRadius: 20
      });
      
      setPoses(detectedPoses);
      setPeopleCount(detectedPoses.length);
      drawPoses(detectedPoses);
      
      animationId = requestAnimationFrame(detectPoses);
    } catch (error) {
      console.error('Pose detection error:', error);
    }
  }
};


    if (isDetecting && cameraOn) {
      detectPoses();
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [net, isDetecting, cameraOn]);

const startCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      }
    });
    
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      
      // Wait for video metadata to load
      videoRef.current.onloadedmetadata = () => {
        // Ensure video has valid dimensions
        if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
          setCameraOn(true);
          setIsDetecting(true);
        }
      };
      
      await videoRef.current.play();
    }
  } catch (error) {
    console.error('Error accessing camera:', error);
    alert('Camera access denied. Please allow camera permissions.');
  }
};

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraOn(false);
    setIsDetecting(false);
    setPoses([]);
    setPeopleCount(0);
    
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const drawPoses = (detectedPoses) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw each detected pose
    detectedPoses.forEach((pose, index) => {
      if (pose.score > 0.25) {
        drawKeypoints(ctx, pose.keypoints, index);
        drawSkeleton(ctx, pose.keypoints, index);
      }
    });
  };

  const drawKeypoints = (ctx, keypoints, personIndex) => {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];
    const color = colors[personIndex % colors.length];

    keypoints.forEach(keypoint => {
      if (keypoint.score > 0.5) {
        ctx.beginPath();
        ctx.arc(keypoint.position.x, keypoint.position.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  };

  const drawSkeleton = (ctx, keypoints, personIndex) => {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];
    const color = colors[personIndex % colors.length];
    
    const adjacentKeyPoints = posenet.getAdjacentKeyPoints(keypoints, 0.5);
    
    adjacentKeyPoints.forEach(([from, to]) => {
      ctx.beginPath();
      ctx.moveTo(from.position.x, from.position.y);
      ctx.lineTo(to.position.x, to.position.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();
    });
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="human-detection-fullstage">
      {/* Header */}
      <div className="detection-header">
        <h1>Human Body Detection</h1>
        <button className="close-btn" onClick={handleClose}>
          ×
        </button>
      </div>

      {/* Main detection area */}
      <div className="detection-container">
        <div className="video-wrapper">
          <video
            ref={videoRef}
            className="detection-video"
            autoPlay
            muted
            playsInline
          />
          <canvas
            ref={canvasRef}
            className="detection-canvas"
          />
          
          {!cameraOn && (
            <div className="video-placeholder">
              <div className="placeholder-content">
                <div className="human-icon">👤</div>
                <h2>Human Detection Ready</h2>
                <p>Click "Turn On Camera" to start detection</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats and controls */}
      <div className="controls-panel">
        <div className="stats-section">
          <div className="stat-item">
            <span className="stat-label">Status:</span>
            <span className={`stat-value ${isDetecting ? 'active' : 'inactive'}`}>
              {!modelLoaded ? 'Loading...' : isDetecting ? 'Detecting' : 'Stopped'}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">People Found:</span>
            <span className="stat-value people-count">{peopleCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Camera:</span>
            <span className={`stat-value ${cameraOn ? 'active' : 'inactive'}`}>
              {cameraOn ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>

        <div className="control-buttons">
          {!cameraOn ? (
            <button 
              className="control-btn start-btn" 
              onClick={startCamera}
              disabled={!modelLoaded}
            >
              <span className="btn-icon">📹</span>
              Turn On Camera
            </button>
          ) : (
            <button className="control-btn stop-btn" onClick={stopCamera}>
              <span className="btn-icon">⏹️</span>
              Turn Off Camera
            </button>
          )}
          
          <button className="control-btn close-btn-bottom" onClick={handleClose}>
            <span className="btn-icon">❌</span>
            Close Detection
          </button>
        </div>
      </div>
    </div>
  );
};

export default HumanDetectionFullStage;
