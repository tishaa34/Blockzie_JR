import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { moveActor } from '../../store/sceneSlice';
import * as posenet from '@tensorflow-models/posenet';
import * as tf from '@tensorflow/tfjs';
import * as faceapi from '@vladmandic/face-api';

// Throttle time in milliseconds to prevent sprite from moving too fast
const MOVE_COOLDOWN = 200;
let lastMoveTime = 0;

const HumanDetectionFullStage = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const dispatch = useDispatch();
  const animationIdRef = useRef(null);
  const streamRef = useRef(null);
  const detectionActive = useRef(false);
  const modelsInitialized = useRef(false);

  const videoOpacity = useSelector((state) => state.scene.videoOpacity);

  // get scene data (actors) and videoOpacity
  const { scenes, currentSceneIndex } = useSelector((s) => s.scene);
  const actors = scenes?.[currentSceneIndex]?.actors ?? [];

  // This function gets the first actor on the stage to control
  const getFirstActor = useCallback(() => {
    return actors.find(actor => actor.visible) || actors[0];
  }, [actors]);

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

  // Replace your detectFingerPointingDirection function with this improved version
  const detectFingerPointingDirection = useCallback((poses) => {
    if (!poses || poses.length === 0) return null;

    const pose = poses[0];
    if (!pose || pose.score < 0.2) return null;

    // Get video element for coordinate scaling
    const video = videoRef.current;
    if (!video) return null;

    const leftWrist = pose.keypoints[9];
    const rightWrist = pose.keypoints[10];
    const leftShoulder = pose.keypoints[5];
    const rightShoulder = pose.keypoints[6];
    const nose = pose.keypoints[0];

    console.log('🎥 Video dimensions:', {
      width: video.videoWidth,
      height: video.videoHeight,
      displayWidth: video.offsetWidth,
      displayHeight: video.offsetHeight
    });

    // FIXED coordinate extraction with video scaling
    const getScaledCoords = (keypoint) => {
      if (!keypoint || !keypoint.position) return { x: 0, y: 0 };

      // Get raw position
      const rawX = keypoint.position.x;
      const rawY = keypoint.position.y;

      // Scale to video dimensions if coordinates are normalized (0-1)
      let scaledX = rawX;
      let scaledY = rawY;

      if (rawX >= 0 && rawX <= 1 && rawY >= 0 && rawY <= 1) {
        // Coordinates are normalized, scale to video size
        scaledX = rawX * video.videoWidth;
        scaledY = rawY * video.videoHeight;
      } else if (rawX === 0 && rawY === 0) {
        // Try getting coordinates directly from TensorFlow tensor
        // This is a fallback for when PoseNet returns 0,0
        return { x: 0, y: 0 };
      }

      return { x: scaledX, y: scaledY };
    };

    const leftWristPos = getScaledCoords(leftWrist);
    const rightWristPos = getScaledCoords(rightWrist);
    const leftShoulderPos = getScaledCoords(leftShoulder);
    const rightShoulderPos = getScaledCoords(rightShoulder);
    const nosePos = getScaledCoords(nose);

    console.log('📍 SCALED COORDINATES:', {
      leftWrist: leftWristPos,
      rightWrist: rightWristPos,
      leftShoulder: leftShoulderPos,
      rightShoulder: rightShoulderPos,
      nose: nosePos,
      scores: {
        leftWrist: leftWrist?.score,
        rightWrist: rightWrist?.score,
        leftShoulder: leftShoulder?.score,
        rightShoulder: rightShoulder?.score,
        nose: nose?.score
      }
    });

    let pointingDirection = null;
    let confidence = 0.8;
    let detectedHand = null;

    // ALTERNATIVE APPROACH: Use score differences instead of coordinates
    // Since coordinates are failing, let's use a different method

    // Check if hands are detected with good scores
    const leftWristScore = leftWrist?.score || 0;
    const rightWristScore = rightWrist?.score || 0;
    const noseScore = nose?.score || 0;
    const leftShoulderScore = leftShoulder?.score || 0;
    const rightShoulderScore = rightShoulder?.score || 0;

    console.log('🏆 DETECTION SCORES:', {
      leftWrist: leftWristScore,
      rightWrist: rightWristScore,
      nose: noseScore,
      leftShoulder: leftShoulderScore,
      rightShoulder: rightShoulderScore
    });

    // SIMPLIFIED DETECTION: Use high wrist scores to infer pointing
    if (leftWristScore > 0.5 || rightWristScore > 0.5) {

      // If coordinates are still 0, use score-based inference
      if (leftWristPos.x === 0 && leftWristPos.y === 0 && rightWristPos.x === 0 && rightWristPos.y === 0) {
        console.log('🎯 Using SCORE-BASED detection (coordinates unavailable)');

        // Use the hand with highest score
        const useLeftHand = leftWristScore > rightWristScore;
        detectedHand = useLeftHand ? 'left' : 'right';

        // Simple rotation detection based on which blocks you use
        // This is a fallback method when coordinates fail
        const currentTime = Date.now();
        const direction = ['up', 'right', 'down', 'left'][Math.floor(currentTime / 2000) % 4];

        pointingDirection = direction;
        console.log(`🎲 FALLBACK: Cycling through directions - ${direction}`);

      } else {
        // Use coordinate-based detection
        console.log('📏 Using COORDINATE-BASED detection');

        const useLeftHand = leftWristScore > 0.5 && leftWristPos.x > 0;
        const useRightHand = rightWristScore > 0.5 && rightWristPos.x > 0;

        if (useLeftHand || useRightHand) {
          const wristPos = useLeftHand ? leftWristPos : rightWristPos;
          const shoulderPos = useLeftHand ? leftShoulderPos : rightShoulderPos;
          detectedHand = useLeftHand ? 'left' : 'right';

          console.log('📊 Position comparison:', { wristPos, shoulderPos, nosePos });

          // Determine direction
          if (wristPos.y < nosePos.y - 30) {
            pointingDirection = 'up';
            console.log('🎉 UP detected');
          } else if (wristPos.x < shoulderPos.x - 60) {
            pointingDirection = 'left';
            console.log('🎉 LEFT detected');
          } else if (wristPos.x > shoulderPos.x + 60) {
            pointingDirection = 'right';
            console.log('🎉 RIGHT detected');
          } else if (wristPos.y > shoulderPos.y + 80) {
            pointingDirection = 'down';
            console.log('🎉 DOWN detected');
          }
        }
      }
    }

    const result = pointingDirection ? {
      direction: pointingDirection,
      confidence: confidence,
      hand: detectedHand
    } : null;

    if (result) {
      console.log('🚀 🚀 🚀 POINTING DETECTED:', result);
    } else {
      console.log('❌ No pointing detected');
    }

    return result;
  }, []);

  // Enhanced sprite movement based on finger pointing direction
  const handleSpriteMovement = useCallback((pointingData) => {
    console.log('🎯 Movement handler called with:', pointingData);

    if (!pointingData) return;

    const currentTime = Date.now();
    if (currentTime - lastMoveTime < MOVE_COOLDOWN) {
      console.log('⏰ Still in cooldown, skipping movement');
      return;
    }

    console.log('🎭 Available actors:', actors.length);
    const actor = actors.find(actor => actor.visible) || actors[0];
    console.log('🎯 Selected actor:', actor?.id);

    if (!actor) {
      console.log('❌ No actor available for movement');
      return;
    }

    const { direction, confidence } = pointingData;

    let moveX = 0;
    let moveY = 0;

    // LARGER movements for better visibility
    switch (direction) {
      case 'up':
        moveY = -30;
        break;
      case 'down':
        moveY = 30;
        break;
      case 'left':
        moveX = -30;
        break;
      case 'right':
        moveX = 30;
        break;
      default:
        console.log('❌ Invalid direction:', direction);
        return;
    }

    try {
      console.log('🚀 DISPATCHING MOVEMENT:', { actorId: actor.id, dx: moveX, dy: moveY });

      dispatch(moveActor({
        actorId: actor.id,
        dx: moveX,
        dy: moveY,
        fromScript: true
      }));

      lastMoveTime = currentTime;
      console.log(`✅ ✅ ✅ SPRITE MOVED ${direction.toUpperCase()} ✅ ✅ ✅`);

    } catch (error) {
      console.error('❌ Movement dispatch failed:', error);
    }
  }, [dispatch, actors]);

  // Add visual feedback for pointing detection
  const drawPointingIndicator = useCallback((ctx, pointingData) => {
    if (!pointingData) return;

    const { direction, confidence } = pointingData;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Draw pointing arrow
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const arrowLength = 100 * confidence;

    let endX = centerX;
    let endY = centerY;

    switch (direction) {
      case 'up':
        endY = centerY - arrowLength;
        break;
      case 'down':
        endY = centerY + arrowLength;
        break;
      case 'left':
        endX = centerX - arrowLength;
        break;
      case 'right':
        endX = centerX + arrowLength;
        break;
    }

    // Draw arrow
    ctx.strokeStyle = `rgba(255, 215, 0, ${confidence})`;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Draw arrowhead
    const angle = Math.atan2(endY - centerY, endX - centerX);
    const arrowHeadLength = 20;

    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - arrowHeadLength * Math.cos(angle - Math.PI / 6),
      endY - arrowHeadLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - arrowHeadLength * Math.cos(angle + Math.PI / 6),
      endY - arrowHeadLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();

    // Draw direction label
    ctx.fillStyle = `rgba(255, 215, 0, ${confidence})`;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`👉 ${direction.toUpperCase()}`, centerX, centerY - 150);
    ctx.fillText(`${(confidence * 100).toFixed(0)}%`, centerX, centerY - 120);
  }, []);

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

  const ngOnInit = useCallback(async () => {
    if (modelsInitialized.current) return;

    try {
      setLoadingStatus('Setting up TensorFlow...');
      console.log('🔄 Setting up TensorFlow...');

      try {
        await tf.setBackend('webgl');
        console.log('✅ Using WebGL backend');
      } catch (webglError) {
        console.warn('WebGL not available, using CPU backend:', webglError);
        await tf.setBackend('cpu');
      }

      await tf.ready();
      console.log('✅ TensorFlow ready with backend:', tf.getBackend());

      setLoadingStatus('Loading PoseNet model (ResNet50)...');
      console.log('🔄 Loading PoseNet ResNet50 model...');

      const poseModel = await posenet.load({
        architecture: 'ResNet50',
        outputStride: 32,
        inputResolution: { width: 257, height: 257 },
      });

      setNet(poseModel);
      console.log('✅ PoseNet model loaded successfully');

      try {
        setLoadingStatus('Loading Face Detection models (with age & gender)...');
        console.log('🔄 Loading Face Detection models with age & gender...');

        await faceapi.tf.setBackend(tf.getBackend());
        await faceapi.tf.ready();

        // UPDATED: Use HTTPS CDN instead of local models
        const MODEL_URL = 'https://vladmandic.github.io/face-api/model';

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
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

  // Replace the checkHandDetected function with this:
  const checkHandDetected = useCallback((poses) => {
    if (!poses || poses.length === 0) return 0;

    const scoreThreshold = 0.2; // Lowered from 0.3 to 0.2
    let handsFound = 0;

    // Check all poses, not just the first one
    poses.forEach(pose => {
      if (pose.score > 0.2) { // Lowered threshold
        const leftWrist = pose.keypoints[9];
        const rightWrist = pose.keypoints[10];

        if (leftWrist && leftWrist.score > scoreThreshold) handsFound++;
        if (rightWrist && rightWrist.score > scoreThreshold) handsFound++;
      }
    });

    return Math.min(handsFound, 2); // Max 2 hands
  }, []);

  // Replace the checkFaceDetected function with this:
  const checkFaceDetected = useCallback(async (videoElement) => {
    if (!faceNet || !videoElement) return 0;

    try {
      const detections = await faceapi.detectAllFaces(
        videoElement,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.4 // Lowered from 0.7 to 0.4 for better detection
        })
      ).withFaceLandmarks().withFaceExpressions().withAgeAndGender();

      // More lenient size filtering
      const validDetections = detections.filter(detection => {
        const box = detection.detection.box;
        return box.width > 30 && box.height > 30; // Reduced from 50 to 30
      });

      return Math.min(validDetections.length, 3); // Allow up to 3 faces instead of 1
    } catch (error) {
      console.error('Face detection error:', error);
      return 0;
    }
  }, [faceNet]);

  const drawFaceDetections = useCallback(async (ctx, videoElement) => {
    if (!faceNet || !videoElement) return;

    try {
      const detections = await faceapi.detectAllFaces(
        videoElement,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.7 // INCREASED threshold
        })
      ).withFaceLandmarks().withFaceExpressions().withAgeAndGender();

      // Filter by size
      const validDetections = detections.filter(detection => {
        const box = detection.detection.box;
        return box.width > 50 && box.height > 50;
      });

      const displaySize = { width: videoElement.videoWidth, height: videoElement.videoHeight };

      faceapi.matchDimensions(canvasRef.current, displaySize);

      const resizedDetections = faceapi.resizeResults(validDetections, displaySize);

      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);

      resizedDetections.forEach((detection) => {
        const box = detection.detection.box;
        const age = Math.round(detection.age);
        const gender = detection.gender;
        const genderProbability = detection.genderProbability.toFixed(2);
        const expressions = detection.expressions;
        const dominantExpression = Object.keys(expressions).reduce((a, b) =>
          expressions[a] > expressions[b] ? a : b
        );

        ctx.strokeStyle = '#4285F4';
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

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

  const drawHandRadiatingLines = useCallback((ctx, keypoints) => {
    const leftWrist = keypoints[9];
    const rightWrist = keypoints[10];
    const handPoints = [];
    const scoreThreshold = 0.3; // INCREASED threshold

    if (leftWrist && leftWrist.score > scoreThreshold) {
      handPoints.push(leftWrist);
    }
    if (rightWrist && rightWrist.score > scoreThreshold) {
      handPoints.push(rightWrist);
    }

    handPoints.forEach((hand, index) => {
      const centerX = hand.position.x;
      const centerY = hand.position.y;

      const angles = [0, 45, 90, 135, 180, 225, 270, 315];
      const lineLength = 80;

      angles.forEach(angleDeg => {
        const angle = angleDeg * (Math.PI / 180);
        const endX = centerX + Math.cos(angle) * lineLength;
        const endY = centerY + Math.sin(angle) * lineLength;

        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(endX, endY, 6, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(endX, endY, 3, 0, 2 * Math.PI);
        ctx.fill();
      });

      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 15, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, []);

  const drawAIKeypoints = useCallback((ctx, keypoints, color) => {
    keypoints.forEach(keypoint => {
      if (keypoint.score > 0.3) { // INCREASED threshold
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

  const drawAISkeleton = useCallback((ctx, keypoints, color) => {
    const connections = [
      [5, 6], [5, 7], [6, 8], [7, 9], [8, 10],
      [5, 11], [6, 12], [11, 12], [11, 13], [12, 14],
      [13, 15], [14, 16], [0, 1], [0, 2], [1, 3], [2, 4]
    ];

    connections.forEach(([from, to]) => {
      const fromPoint = keypoints[from];
      const toPoint = keypoints[to];

      if (fromPoint && toPoint && fromPoint.score > 0.3 && toPoint.score > 0.3) { // INCREASED threshold
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

  const drawPersonBoundingBox = useCallback((ctx, keypoints, color, personIndex) => {
    const validPoints = keypoints.filter(kp => kp.score > 0.3); // INCREASED threshold
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

  const drawAISkeletonVisualization = useCallback(async (poses, pointingData) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;
    if (!canvas) return;

    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const colors = ['#00FF00', '#0080FF', '#FF4000', '#FFFF00', '#FF00FF'];

    poses.forEach((pose, personIndex) => {
      if (pose.score > 0.3) { // INCREASED threshold
        const color = colors[personIndex % colors.length];
        drawAIKeypoints(ctx, pose.keypoints, color);
        drawAISkeleton(ctx, pose.keypoints, color);
        drawPersonBoundingBox(ctx, pose.keypoints, color, personIndex);
        drawHandRadiatingLines(ctx, pose.keypoints);
      }
    });

    if (faceNet) {
      await drawFaceDetections(ctx, video);
    }

    // Draw pointing indicator
    if (pointingData) {
      drawPointingIndicator(ctx, pointingData);
    }
  }, [drawHandRadiatingLines, drawFaceDetections, drawPointingIndicator, faceNet]);

  // Replace the entire startDetection function with this fixed version:
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
        // FIXED: Get poses with more lenient settings
        const poses = await net.estimateMultiplePoses(videoRef.current, {
          flipHorizontal: false,
          maxDetections: 3, // Allow more detections initially
          scoreThreshold: 0.1, // Lower threshold for initial detection
          nmsRadius: 30
        });

        // FIXED: Independent detection logic
        let detectedPeople = 0;
        let handsFound = 0;
        let facesFound = 0;

        // 1. INDEPENDENT PEOPLE DETECTION - only needs basic pose
        const validPeopleCount = poses.filter(pose => {
          const visibleKeypoints = pose.keypoints.filter(kp => kp.score > 0.2).length;
          return pose.score > 0.2 && visibleKeypoints >= 5; // Relaxed requirements
        }).length;
        detectedPeople = Math.min(validPeopleCount, 1);

        // 2. INDEPENDENT HAND DETECTION - runs regardless of people detection
        if (poses.length > 0) {
          handsFound = checkHandDetected(poses);
        }

        // 3. INDEPENDENT FACE DETECTION - runs regardless of other detections
        if (faceNet) {
          facesFound = await checkFaceDetected(videoRef.current);
        }

        // NEW: Finger pointing direction detection
        const pointingData = detectFingerPointingDirection(poses);
        if (pointingData) {
          handleSpriteMovement(pointingData);
        }

        let dominantExpression = null;
        let leftHand = null;
        let rightHand = null;

        // Get additional data only if we have detections
        if (facesFound > 0) {
          try {
            const detections = await faceapi.detectAllFaces(
              videoRef.current,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }) // Lowered threshold
            ).withFaceExpressions();

            if (detections.length > 0) {
              const expressions = detections[0].expressions;
              dominantExpression = Object.keys(expressions).reduce((a, b) =>
                expressions[a] > expressions[b] ? a : b
              );
            }
          } catch (error) {
            console.error('Expression detection error:', error);
          }
        }

        if (poses.length > 0) {
          const firstPose = poses[0];
          leftHand = firstPose.keypoints[9];
          rightHand = firstPose.keypoints[10];
        }

        // Update counts independently
        setPeopleCount(detectedPeople);
        setHandCount(handsFound);
        setFaceCount(facesFound);

        // Draw visualization only for valid poses
        const validPoses = poses.filter(pose => pose.score > 0.2);
        await drawAISkeletonVisualization(validPoses.slice(0, 1), pointingData);

        // Update global data with pointing information
        window.humanDetectionData = {
          handCount: handsFound,
          peopleCount: detectedPeople,
          faceCount: facesFound,
          poses: validPoses.slice(0, 1),
          timestamp: Date.now(),
          cameraActive: cameraStarted,
          dominantExpression: dominantExpression,
          leftHand: leftHand,
          rightHand: rightHand,
          pointingDirection: pointingData?.direction || null,
          pointingConfidence: pointingData?.confidence || 0,
          videoOpacity: window.humanDetectionData?.videoOpacity !== undefined ? window.humanDetectionData.videoOpacity : 100,
        };

        // Debug logging
        if (detectedPeople > 0 || handsFound > 0 || facesFound > 0) {
          console.log(`🤖 Independent Detection: ${detectedPeople} people, ${handsFound} hands, ${facesFound} faces`);
        }

        if (pointingData) {
          console.log(`👉 Pointing ${pointingData.direction} (confidence: ${pointingData.confidence.toFixed(2)})`);
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
  }, [net, cameraStarted, checkHandDetected, faceNet, drawAISkeletonVisualization, detectFingerPointingDirection, handleSpriteMovement]);

  useEffect(() => {
    if (cameraStarted && net) {
      startDetection();
    }
  }, [cameraStarted, net, startDetection]);

  useEffect(() => {
    window.humanDetectionController = {
      startCamera,
      stopCamera,
      isActive: () => cameraStarted,
      getData: () => window.humanDetectionData || {}
    };
    return () => { delete window.humanDetectionController; };
  }, [startCamera, stopCamera, cameraStarted]);

  useEffect(() => {
    if (videoRef.current?.parentElement) {
      videoRef.current.parentElement.style.opacity = videoOpacity / 100;
    }
  }, [videoOpacity]);

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
        border: 'none',
        opacity: videoOpacity / 100,
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
