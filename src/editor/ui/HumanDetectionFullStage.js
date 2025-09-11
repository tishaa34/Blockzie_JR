import React, { useRef, useState, useEffect, useCallback } from 'react';
import * as posenet from '@tensorflow-models/posenet';
import * as tf from '@tensorflow/tfjs';
import * as faceapi from '@vladmandic/face-api';

const HumanDetectionFullStage = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationIdRef = useRef(null);
  const streamRef = useRef(null);
  const detectionActive = useRef(false);
  const modelsInitialized = useRef(false);

  const [net, setNet] = useState(null);
  const [faceNet, setFaceNet] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [peopleCount, setPeopleCount] = useState(0);
  const [handCount, setHandCount] = useState(0);
  const [faceCount, setFaceCount] = useState(0);
  const [stageRect, setStageRect] = useState({ top: 110, left: 380, width: 830, height: 460 });
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');
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

  // Enhanced async ngOnInit pattern with age and gender models
  const ngOnInit = useCallback(async () => {
    if (modelsInitialized.current) return;

    try {
      setLoadingStatus('Setting up TensorFlow...');
      console.log('🔄 Setting up TensorFlow...');

      // Setup TensorFlow backend
      try {
        await tf.setBackend('webgl');
        console.log('✅ Using WebGL backend');
      } catch (webglError) {
        console.warn('WebGL not available, using CPU backend:', webglError);
        await tf.setBackend('cpu');
      }

      await tf.ready();
      console.log('✅ TensorFlow ready with backend:', tf.getBackend());

      // Load PoseNet model
      setLoadingStatus('Loading PoseNet model (ResNet50)...');
      console.log('🔄 Loading PoseNet ResNet50 model...');

      const poseModel = await posenet.load({
        architecture: 'ResNet50',
        outputStride: 32,
        inputResolution: { width: 257, height: 257 },
      });

      setNet(poseModel);
      console.log('✅ PoseNet model loaded successfully');

      // NEW: Load face-api models with age and gender
      try {
        setLoadingStatus('Loading Face Detection models (with age & gender)...');
        console.log('🔄 Loading Face Detection models with age & gender...');

        // Set FaceAPI backend to match TensorFlow backend
        await faceapi.tf.setBackend(tf.getBackend());
        await faceapi.tf.ready();

        // Load all face detection models including age and gender
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceExpressionNet.loadFromUri('/models'),
          faceapi.nets.ageGenderNet.loadFromUri('/models'), // NEW: Age and gender model
        ]);

        setFaceNet(true);
        console.log('✅ Face Detection models (with age & gender) loaded successfully');
      } catch (faceError) {
        console.warn('Face detection models failed to load:', faceError);
        setFaceNet(false);
      }

      modelsInitialized.current = true;
      setLoadingStatus('All models loaded successfully');
      console.log('✅ All AI models initialized successfully');

    } catch (error) {
      console.error('❌ Model loading error:', error);
      setLoadingStatus(`Error: ${error.message}`);
      modelsInitialized.current = false;
    }
  }, []);

  // Initialize models on component mount
  useEffect(() => {
    const initializeComponent = async () => {
      await ngOnInit();
      updateStageRect();
    };

    initializeComponent();
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
  }, [ngOnInit, updateStageRect]);

  // Start camera
  const startCamera = useCallback(async () => {
    if (cameraStarted) {
      console.log('⚠️ Camera already started');
      return;
    }

    if (!modelsInitialized.current) {
      console.log('⚠️ Models not initialized yet');
      await ngOnInit();
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
    }
  }, [cameraStarted, ngOnInit]);

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
    setFaceCount(0);
  }, []);

  // Hand detection
  const checkHandDetected = useCallback((poses) => {
    if (!poses || poses.length === 0) return 0;

    const scoreThreshold = 0.1;
    let handsFound = 0;

    for (const pose of poses) {
      const leftWrist = pose.keypoints[9];
      const rightWrist = pose.keypoints[10];

      if (leftWrist && leftWrist.score > scoreThreshold) handsFound++;
      if (rightWrist && rightWrist.score > scoreThreshold) handsFound++;
    }

    return handsFound;
  }, []);

  // Enhanced face detection with age and gender
  const checkFaceDetected = useCallback(async (videoElement) => {
    if (!faceNet || !videoElement) return 0;

    try {
      const detections = await faceapi.detectAllFaces(
        videoElement,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.5
        })
      ).withFaceLandmarks().withFaceExpressions().withAgeAndGender(); // NEW: Added withAgeAndGender()

      return detections.length;
    } catch (error) {
      console.error('Face detection error:', error);
      return 0;
    }
  }, [faceNet]);

  // MODIFIED: Custom drawing without score numbers
  const drawFaceDetections = useCallback(async (ctx, videoElement) => {
    if (!faceNet || !videoElement) return;

    try {
      const detections = await faceapi.detectAllFaces(
        videoElement,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 })
      ).withFaceLandmarks().withFaceExpressions().withAgeAndGender();

      const displaySize = { width: videoElement.videoWidth, height: videoElement.videoHeight };

      // Match canvas dimensions
      faceapi.matchDimensions(canvasRef.current, displaySize);

      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      // Clear canvas
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      // REMOVED: faceapi.draw.drawDetections() - this was showing the score
      // Draw only landmarks without built-in detection boxes
      faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);

      // Draw custom bounding boxes and labels manually
      resizedDetections.forEach((detection) => {
        const box = detection.detection.box;
        const age = Math.round(detection.age);
        const gender = detection.gender;
        const genderProbability = detection.genderProbability.toFixed(2);
        const expressions = detection.expressions;
        const dominantExpression = Object.keys(expressions).reduce((a, b) =>
          expressions[a] > expressions[b] ? a : b
        );

        // Draw blue bounding box manually (no score)
        ctx.strokeStyle = '#4285F4';
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Draw custom label with only age, gender, emotion
        const label = `${age} yrs, ${gender} (${genderProbability}), ${dominantExpression}`;

        ctx.font = '14px Arial';
        const textWidth = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(66, 133, 244, 0.8)';
        ctx.fillRect(box.x, box.y - 25, textWidth + 10, 20);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(label, box.x + 5, box.y - 10);
      });
    } catch (error) {
      console.error('Face drawing error:', error);
    }
  }, [faceNet]);

  // Draw radiating lines for hands
  const drawHandRadiatingLines = useCallback((ctx, keypoints) => {
    const leftWrist = keypoints[9];
    const rightWrist = keypoints[10];
    const handPoints = [];
    const scoreThreshold = 0.1;

    if (leftWrist && leftWrist.score > scoreThreshold) {
      handPoints.push(leftWrist);
    }
    if (rightWrist && rightWrist.score > scoreThreshold) {
      handPoints.push(rightWrist);
    }

    handPoints.forEach((hand, index) => {
      const centerX = hand.position.x;
      const centerY = hand.position.y;

      // Draw radiating lines
      const angles = [0, 45, 90, 135, 180, 225, 270, 315];
      const lineLength = 80;

      angles.forEach(angleDeg => {
        const angle = angleDeg * (Math.PI / 180);
        const endX = centerX + Math.cos(angle) * lineLength;
        const endY = centerY + Math.sin(angle) * lineLength;

        // Draw thick outer line for visibility
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Draw bright inner line
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Draw endpoint circle
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(endX, endY, 6, 0, 2 * Math.PI);
        ctx.fill();

        // White center for endpoint
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(endX, endY, 3, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Draw large center circle
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 15, 0, 2 * Math.PI);
      ctx.fill();

      // White center highlight
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, []);

  // Draw keypoints
  const drawAIKeypoints = useCallback((ctx, keypoints, color) => {
    keypoints.forEach(keypoint => {
      if (keypoint.score > 0.2) {
        const x = keypoint.position.x;
        const y = keypoint.position.y;

        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      }
    });
  }, []);

  // Draw skeleton
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
        const fromX = fromPoint.position.x;
        const fromY = fromPoint.position.y;
        const toX = toPoint.position.x;
        const toY = toPoint.position.y;

        ctx.lineWidth = 3;
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
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

  // AI Skeleton Visualization with enhanced face detection
  const drawAISkeletonVisualization = useCallback(async (poses) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const colors = ['#00FF00', '#0080FF', '#FF4000', '#FFFF00', '#FF00FF'];

    poses.forEach((pose, personIndex) => {
      if (pose.score > 0.1) {
        const color = colors[personIndex % colors.length];
        drawAIKeypoints(ctx, pose.keypoints, color);
        drawAISkeleton(ctx, pose.keypoints, color);
        drawPersonBoundingBox(ctx, pose.keypoints, color, personIndex);
        drawHandRadiatingLines(ctx, pose.keypoints);
      }
    });

    // Draw enhanced face detection results
    if (faceNet) {
      await drawFaceDetections(ctx, video);
    }
  }, [drawHandRadiatingLines, drawFaceDetections, faceNet]);

  // Main detection function
  const startDetection = useCallback(() => {
    if (!net || !cameraStarted || detectionActive.current) {
      console.log('⚠️ Detection not ready');
      setDetectionStatus('Detection not ready');
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
        const poses = await net.estimateMultiplePoses(videoRef.current, {
          flipHorizontal: false,
          maxDetections: 5,
          scoreThreshold: 0.1,
          nmsRadius: 20
        });

        const validPoses = poses.filter(pose => pose.score > 0.05);
        const detectedPeople = validPoses.length;
        const handsFound = checkHandDetected(validPoses);
        const facesFound = faceNet ? await checkFaceDetected(videoRef.current) : 0;

        setPeopleCount(detectedPeople);
        setHandCount(handsFound);
        setFaceCount(facesFound);

        await drawAISkeletonVisualization(validPoses);

        window.humanDetectionData = {
          handCount: handsFound,
          peopleCount: detectedPeople,
          faceCount: facesFound,
          poses: validPoses,
          timestamp: Date.now(),
          cameraActive: cameraStarted
        };

        if (detectedPeople > 0) {
          console.log(`🤖 Detection: ${detectedPeople} people, ${handsFound} hands, ${facesFound} faces`);
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
  }, [net, cameraStarted, checkHandDetected, checkFaceDetected, drawAISkeletonVisualization]);

  // Start detection when camera is ready
  useEffect(() => {
    if (cameraStarted && net) {
      startDetection();
    }
  }, [cameraStarted, net, startDetection]);

  // Global controller
  useEffect(() => {
    window.humanDetectionController = {
      startCamera,
      stopCamera,
      isActive: () => cameraStarted,
      getData: () => window.humanDetectionData || {}
    };
    return () => { delete window.humanDetectionController; };
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

  if (!isVisible) {
    return null;
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
      {/* NEW: Single line HUD spanning full width */}
      <div style={{
        position: 'absolute',
        bottom: '0px',
        left: '0px',
        width: '100%',
        textAlign: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: '#00FF00',
        padding: '12px 0',
        fontSize: '16px',
        fontWeight: 'bold',
        borderRadius: '0 0 12px 12px',
        borderTop: '2px solid #00FF00',
        fontFamily: 'monospace',
        textShadow: '0 0 10px #00FF00',
        zIndex: 10002,
      }}>
        <span>🤖 HUMANS: {peopleCount} | ✋ HANDS: {handCount} | 😊 FACES: {faceCount}</span>
      </div>
    </div>
  );
};

export default HumanDetectionFullStage;
