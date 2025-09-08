import React, { useState, useRef, useEffect } from 'react';
import Human from '@vladmandic/human';
import '../../css/HumanDetection.css';

const HumanDetectionIcon = () => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [humanCount, setHumanCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const humanRef = useRef(null);
  const animationRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    initializeHuman();
    return () => {
      stopDetection();
    };
  }, []);

  const initializeHuman = async () => {
    try {
      const config = {
        backend: 'webgl',
        modelBasePath: 'https://cdn.jsdelivr.net/npm/@vladmandic/human/models/',
        face: { enabled: true, detector: { rotation: false }, mesh: false, iris: false },
        body: { enabled: true },
        hand: { enabled: false },
        gesture: { enabled: false }
      };

      humanRef.current = new Human(config);
      await humanRef.current.load();
    } catch (err) {
      console.error('Failed to initialize Human library:', err);
    }
  };

  const toggleDetection = async () => {
    if (isDetecting) {
      stopDetection();
    } else {
      setShowModal(true);
      await startDetection();
    }
  };

  const startDetection = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 360, facingMode: 'user' }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsDetecting(true);
        detectLoop();
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      alert('Camera access denied. Please allow camera permissions.');
    }
  };

  const stopDetection = () => {
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    setIsDetecting(false);
    setHumanCount(0);
    setShowModal(false);
  };

  const detectLoop = async () => {
    if (!humanRef.current || !videoRef.current || !canvasRef.current || !isDetecting) {
      return;
    }

    try {
      const result = await humanRef.current.detect(videoRef.current);
      const humans = result.face.length + result.body.length;
      setHumanCount(humans);

      // Draw results
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      canvas.width = videoRef.current.videoWidth || 480;
      canvas.height = videoRef.current.videoHeight || 360;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.font = '14px Arial';
      ctx.fillStyle = '#00ff00';
      
      [...result.face, ...result.body].forEach((detection) => {
        if (detection.box) {
          const [x, y, width, height] = detection.box;
          ctx.strokeRect(x, y, width, height);
          ctx.fillText(`${Math.round(detection.score * 100)}%`, x, y - 5);
        }
      });

    } catch (err) {
      console.error('Detection error:', err);
    }

    animationRef.current = requestAnimationFrame(detectLoop);
  };

  return (
    <>
      {/* Toolbar Button */}
      <button 
        className={`human-detection-toolbar-icon ${isDetecting ? 'active' : ''}`}
        onClick={toggleDetection}
        title="Human Detection"
      >
        <img src="./assets/ui/HumanDetection.png" alt="Human Detection" />
        {humanCount > 0 && (
          <span className="detection-count-badge">{humanCount}</span>
        )}
      </button>

      {/* Detection Modal */}
      {showModal && (
        <div className="human-detection-modal-overlay">
          <div className="human-detection-modal">
            <div className="modal-header">
              <h2>Human Detection</h2>
              <button className="close-modal-btn" onClick={stopDetection}>
                <img src="./assets/ui/closeit.svg" alt="Close" />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="video-container">
                <video
                  ref={videoRef}
                  className="detection-video"
                  muted
                  playsInline
                />
                <canvas
                  ref={canvasRef}
                  className="detection-overlay"
                />
              </div>
              
              <div className="detection-info">
                <div className="info-item">
                  <span className="info-label">Status:</span>
                  <span className={`info-value ${isDetecting ? 'active' : 'inactive'}`}>
                    {isDetecting ? 'Detecting' : 'Stopped'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Humans Found:</span>
                  <span className="info-value">{humanCount}</span>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="stop-detection-btn" onClick={stopDetection}>
                Stop Detection
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HumanDetectionIcon;
