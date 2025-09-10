import React, { useRef, useState, useEffect, useCallback } from 'react';
import * as posenet from '@tensorflow-models/posenet';
import * as tf from '@tensorflow/tfjs';

const HumanDetectionFullStage = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationIdRef = useRef(null);
  const streamRef = useRef(null);
  const detectionActive = useRef(false);

  const [net, setNet] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [peopleCount, setPeopleCount] = useState(0);
  const [handCount, setHandCount] = useState(0);
  const [stageRect, setStageRect] = useState({ top: 110, left: 380, width: 830, height: 460 });
  const [loadingStatus, setLoadingStatus] = useState('Loading models...');
  const [detectionStatus, setDetectionStatus] = useState('Not started');

  // Update stage dimensions
  const updateStageRect = useCallback(() => {
    const stageElement = document.querySelector('.stage-area-section') ||
      document.querySelector('[class*="stage"]') ||
      document.querySelector('.stage') ||
      document.querySelector('.middle-section .stage-area-section');

    if (stageElement) {
      const rect = stageElement.getBoundingClientRect();
      setStageRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    }
  }, []);

  // Load PoseNet model
  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoadingStatus('Setting up TensorFlow...');
        console.log('🔄 Setting up TensorFlow...');

        // Set backend - try WebGL first, fallback to CPU
        try {
          await tf.setBackend('webgl');
          console.log('✅ Using WebGL backend');
        } catch (webglError) {
          console.warn('WebGL not available, using CPU backend:', webglError);
          await tf.setBackend('cpu');
        }

        await tf.ready();
        console.log('✅ TensorFlow ready with backend:', tf.getBackend());

        setLoadingStatus('Loading PoseNet model...');
        console.log('🔄 Loading PoseNet model...');
        const poseModel = await posenet.load({
          architecture: 'MobileNetV1',
          outputStride: 16,
          inputResolution: { width: 480, height: 360 },
          multiplier: 0.75
        });
        setNet(poseModel);
        setLoadingStatus('PoseNet model loaded successfully');
        console.log('✅ PoseNet model loaded successfully');

      } catch (error) {
        console.error('❌ Model loading error:', error);
        setLoadingStatus(`Error: ${error.message}`);
      }
    };

    loadModels();
    updateStageRect();
    window.addEventListener('resize', updateStageRect);

    return () => {
      window.removeEventListener('resize', updateStageRect);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [updateStageRect]);

  // Start camera
  const startCamera = useCallback(async () => {
    if (cameraStarted) {
      console.log('⚠️ Camera already started');
      return;
    }

    try {
      console.log('🎥 Starting camera...');
      setDetectionStatus('Starting camera...');
      setIsVisible(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        return new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().then(() => {
              setCameraStarted(true);
              setDetectionStatus('Camera started, detection running');
              console.log('✅ Camera started with detection');
              resolve();
            }).catch(error => {
              console.error('Video play error:', error);
              setDetectionStatus(`Error: ${error.message}`);
            });
          };
        });
      }
    } catch (error) {
      console.error('❌ Camera access error:', error);
      setDetectionStatus(`Camera error: ${error.message}`);

      // Try with less constraints if the ideal resolution fails
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().then(() => {
              setCameraStarted(true);
              setDetectionStatus('Camera started with fallback settings');
              console.log('✅ Camera started with fallback settings');
            });
          };
        }
      } catch (fallbackError) {
        console.error('❌ Fallback camera access error:', fallbackError);
        setDetectionStatus(`Camera failed: ${fallbackError.message}`);
      }
    }
  }, [cameraStarted]);

  // Stop camera
  const stopCamera = useCallback(() => {
    console.log('🛑 Stopping camera and detection');
    setDetectionStatus('Detection stopped');

    detectionActive.current = false;

    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsVisible(false);
    setCameraStarted(false);
    setPeopleCount(0);
    setHandCount(0);
  }, []);

  // Main detection function
  const startDetection = useCallback(() => {
    if (!net || !cameraStarted || detectionActive.current) {
      console.log('⚠️ Detection not ready');
      setDetectionStatus('Detection not ready - models or camera not initialized');
      return;
    }

    detectionActive.current = true;
    setDetectionStatus('Detection running');
    console.log('🚀 Starting AI detection');

    const detect = async () => {
      if (!detectionActive.current || !net || !videoRef.current ||
        !streamRef.current || videoRef.current.readyState !== 4) {
        return;
      }

      try {
        // PoseNet detection for body/hands
        const poses = await net.estimateMultiplePoses(videoRef.current, {
          flipHorizontal: true,
          maxDetections: 5,
          scoreThreshold: 0.15,
          nmsRadius: 20
        });

        const validPoses = poses.filter(pose => pose.score > 0.1);
        const detectedPeople = validPoses.length;
        const handFound = checkHandDetected(validPoses);
        setPeopleCount(detectedPeople);
        setHandCount(handFound);

        drawAISkeletonVisualization(validPoses);

        // Update global data
        window.humanDetectionData = {
          handCount: handFound,
          peopleCount: detectedPeople,
          poses: validPoses,
          timestamp: Date.now(),
          cameraActive: cameraStarted
        };

        if (detectedPeople > 0) {
          console.log(`🤖 Detection: ${detectedPeople} people detected`);
        }

      } catch (error) {
        console.error('AI Detection error:', error);
        setDetectionStatus(`Detection error: ${error.message}`);
      }

      if (detectionActive.current) {
        animationIdRef.current = requestAnimationFrame(detect);
      }
    };

    detect();
  }, [net, cameraStarted]);

  // Start detection when camera is ready
  useEffect(() => {
    if (cameraStarted && net) {
      startDetection();
    }
  }, [cameraStarted, net, startDetection]);

  // AI Skeleton Visualization with colored lines
  const drawAISkeletonVisualization = useCallback((poses) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas dimensions to match video
    if (canvas.width !== videoRef.current.videoWidth ||
      canvas.height !== videoRef.current.videoHeight) {
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const colors = [
      '#00FF00', // Bright Green
      '#0080FF', // Bright Blue  
      '#FF4000', // Bright Red
      '#FFFF00', // Bright Yellow
      '#FF00FF'  // Bright Magenta
    ];

    poses.forEach((pose, personIndex) => {
      if (pose.score > 0.1) {
        const color = colors[personIndex % colors.length];

        drawAIKeypoints(ctx, pose.keypoints, color);
        drawAISkeleton(ctx, pose.keypoints, color);
        drawPersonBoundingBox(ctx, pose.keypoints, color, personIndex);
      }
    });
  }, []);

  // Draw glowing keypoints
  const drawAIKeypoints = useCallback((ctx, keypoints, color) => {
    keypoints.forEach(keypoint => {
      if (keypoint.score > 0.2) {
        // Outer glow
        ctx.beginPath();
        ctx.arc(keypoint.position.x, keypoint.position.y, 10, 0, 2 * Math.PI);
        ctx.fillStyle = color + '40';
        ctx.fill();

        // Inner bright point
        ctx.beginPath();
        ctx.arc(keypoint.position.x, keypoint.position.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();

        // White center
        ctx.beginPath();
        ctx.arc(keypoint.position.x, keypoint.position.y, 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      }
    });
  }, []);

  // Draw skeleton connections
  const drawAISkeleton = useCallback((ctx, keypoints, color) => {
    const connections = [
      [5, 6], [5, 7], [6, 8], [7, 9], [8, 10],
      [5, 11], [6, 12], [11, 12], [11, 13], [12, 14],
      [13, 15], [14, 16], [0, 1], [0, 2], [1, 3], [2, 4]
    ];

    connections.forEach(([from, to]) => {
      const fromPoint = keypoints[from];
      const toPoint = keypoints[to];

      if (fromPoint && toPoint && fromPoint.score > 0.2 && toPoint.score > 0.2) {
        // Draw glowing line effect
        ctx.lineWidth = 6;
        ctx.strokeStyle = color + '60';
        ctx.beginPath();
        ctx.moveTo(fromPoint.position.x, fromPoint.position.y);
        ctx.lineTo(toPoint.position.x, toPoint.position.y);
        ctx.stroke();

        // Draw bright center line
        ctx.lineWidth = 3;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(fromPoint.position.x, fromPoint.position.y);
        ctx.lineTo(toPoint.position.x, toPoint.position.y);
        ctx.stroke();
      }
    });
  }, []);

  // Draw bounding box
  const drawPersonBoundingBox = useCallback((ctx, keypoints, color, personIndex) => {
    const validPoints = keypoints.filter(kp => kp.score > 0.2);
    if (validPoints.length === 0) return;

    const xs = validPoints.map(kp => kp.position.x);
    const ys = validPoints.map(kp => kp.position.y);

    const minX = Math.min(...xs) - 20;
    const maxX = Math.max(...xs) + 20;
    const minY = Math.min(...ys) - 20;
    const maxY = Math.max(...ys) + 20;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
    ctx.setLineDash([]);

    ctx.fillStyle = color;
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`Person ${personIndex + 1}`, minX, minY - 5);
  }, []);


  // Hand detection - COUNT hands instead of boolean
  const checkHandDetected = useCallback((poses) => {
    if (!poses || poses.length === 0) return 0;

    let handsFound = 0;

    for (let pose of poses) {
      const leftWrist = pose.keypoints[9];
      const rightWrist = pose.keypoints[10];
      const leftElbow = pose.keypoints[7];
      const rightElbow = pose.keypoints[8];

      if ((leftWrist && leftWrist.score > 0.3)) handsFound++;
      if ((rightWrist && rightWrist.score > 0.3)) handsFound++;
      if ((leftElbow && leftElbow.score > 0.3)) handsFound++;
      if ((rightElbow && rightElbow.score > 0.3)) handsFound++;
    }
    return handsFound;
  }, []);


  // Global controller
  useEffect(() => {
    window.humanDetectionController = {
      startCamera,
      stopCamera,
      isActive: () => cameraStarted,
      getData: () => window.humanDetectionData || {}
    };

    return () => {
      delete window.humanDetectionController;
    };
  }, [startCamera, stopCamera, cameraStarted]);

  // Cleanup
  useEffect(() => {
    return () => {
      detectionActive.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  // if (!isVisible) {
  //   return (
  //     <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px', margin: '10px' }}>
  //       <h3>Human Detection AI</h3>
  //       <p>Status: {loadingStatus}</p>
  //       <button onClick={startCamera} disabled={!net}>
  //         Start Camera & Detection
  //       </button>
  //       <div style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
  //         {!net ? 'Waiting for models to load...' : 'Click to start detection'}
  //       </div>
  //     </div>
  //   );
  // }

  if (!isVisible) {
    return null; // Show nothing when camera is not active
  }


  return (
    <div
      style={{
        position: 'fixed',
        top: `${stageRect.top}px`,
        left: `${stageRect.left}px`,
        width: `${stageRect.width}px`,
        height: `${stageRect.height}px`,
        backgroundColor: '#000',
        zIndex: 10000,
        borderRadius: '12px',
        overflow: 'hidden',
        border: 'none'
      }}
    >
      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block'
        }}
        autoPlay
        muted
        playsInline
      />

      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      />

      {/* Control bar */}
      <div style={{
        position: 'absolute',
        top: '15px',
        right: '15px',
        display: 'flex',
        gap: '10px'
      }}>
        {/* <button
          onClick={stopCamera}
          style={{
            padding: '8px 12px',
            backgroundColor: '#ff4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Stop Detection
        </button> */}
      </div>

      {/* Enhanced HUD - KEEPING ORIGINAL STYLING */}
      <div style={{
        position: 'absolute',
        bottom: '15px',
        left: '15px',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: '#00FF00',
        padding: '12px 16px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 'bold',
        border: '2px solid #00FF00',
        fontFamily: 'monospace',
        textShadow: '0 0 10px #00FF00'
      }}>
        <div>🤖 HUMANS DETECTED: {peopleCount}</div>
        <div>✋ HANDS FOUND: {handCount}</div>
        <div>📊 STATUS: {detectionStatus}</div>
      </div>
    </div>
  );
};

export default HumanDetectionFullStage;