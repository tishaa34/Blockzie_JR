import React, { useState, useRef } from "react";
import "../../css/BlockPalette.css";
import { useDispatch, useSelector } from "react-redux";
import { addBlockToScript, addCustomSound, setCameraState } from "../../store/sceneSlice";


// Puzzle backgrounds per category
const puzzleBgByCategory = {
  start: "./assets/blocks/start.svg",
  motion: "./assets/blocks/blueCmd.svg",
  looks: "./assets/blocks/looks.svg",
  sound: "./assets/blocks/sounds.svg",
  control: "./assets/blocks/flow.svg",
  device: "./assets/blocks/blueCmd.svg",
  end: "./assets/blocks/endshort.svg",
  humandetection: "./assets/blocks/looks.svg", // Add human detection background
};


// Bar color per category for seamless effect
const barColorByCategory = {
  start: "#ffe55a",
  motion: "#68acfc",
  looks: "#eb7dfa",
  sound: "#59de80",
  control: "#ffc862",
  device: "#68acfc",
  end: "#e84141",
  humandetection: "#4CAF50", // Add human detection color
};


// All blocks per category
const blocksByCategory = {
  start: [
    { name: "Start on Green Flag", icon: "./assets/blockicons/greenFlag.svg" },
    { name: "Start On Tap", icon: "./assets/blockicons/OnTouch.svg" },
    { name: "Start On Bump", icon: "./assets/blockicons/Bump.svg" },
  ],
  motion: [
    { name: "Move Right", icon: "./assets/blockicons/Foward.svg" },
    { name: "Move Left", icon: "./assets/blockicons/Back.svg" },
    { name: "Move Up", icon: "./assets/blockicons/Up.svg" },
    { name: "Move Down", icon: "./assets/blockicons/Down.svg" },
    { name: "Rotate Right", icon: "./assets/blockicons/Right.svg" },
    { name: "Rotate Left", icon: "./assets/blockicons/Left.svg" },
    { name: "Hop", icon: "./assets/blockicons/Hop.svg" },
    { name: "Go Home", icon: "./assets/blockicons/Home.svg" },
  ],
  looks: [
    { name: "Say", icon: "./assets/blockicons/Say.svg" },
    { name: "Grow Size", icon: "./assets/blockicons/Grow.svg" },
    { name: "Shrink Size", icon: "./assets/blockicons/Shrink.svg" },
    { name: "Reset Size", icon: "./assets/blockicons/Reset.svg" },
    { name: "Appear", icon: "./assets/blockicons/Appear.svg" },
    { name: "Disappear", icon: "./assets/blockicons/Disappear.svg" },
  ],
  sound: [
    { name: "Pop", icon: "./assets/blockicons/Speaker.svg" },
    { name: "Record", icon: "./assets/blockicons/microphone.svg" },
  ],
  control: [
    {
      name: "Wait",
      icon: "./assets/blockicons/Wait.svg",
      execute: async (actor, dispatch, sounds, actorId, count = 3) => {
        return new Promise(resolve => {
          setTimeout(resolve, count * 1000);
        });
      }
    },
    {
      name: "Stop",
      icon: "./assets/blockicons/Stop.svg",
      execute: () => {
        throw new Error("STOP_EXECUTION");
      }
    },
    { name: "Speed", icon: "./assets/blockicons/Speed0.svg" },
  ],
  device: [
    {
      name: "Otto-Bot",
      icon: "./assets/blockicons/OttoBot.svg",
      requiresConnection: true
    },
    {
      name: "Light RC",
      icon: "./assets/blockicons/RCCar.svg",
      requiresConnection: true
    },
    // ...other device blocks if any...
  ],
  end: [
    { name: "End", icon: null, label: "" },
    { name: "Repeat Forever", icon: "./assets/blockicons/Forever.svg" },
  ],
  // Add human detection blocks
  humandetection: [
    {
      name: "Turn On Video",
      icon: "./assets/blockicons/Speaker.svg",
      execute: () => {
        console.log("Turn on video with transparency");
      }
    },
    {
      name: "Analyse Hand",
      icon: "./assets/blockicons/Say.svg",
      execute: () => {
        console.log("Analyse image for hand from camera");
      }
    },
    {
      name: "Hand Detected",
      icon: "./assets/blockicons/Appear.svg",
      execute: () => {
        // Return true/false based on hand detection
        return window.humanDetectionData?.handDetected || false;
      }
    },
    {
      name: "Get People Count",
      icon: "./assets/blockicons/Grow.svg",
      execute: () => {
        return window.humanDetectionData?.peopleCount || 0;
      }
    },
    {
      name: "Hand X Position",
      icon: "./assets/blockicons/Right.svg",
      execute: () => {
        return window.humanDetectionData?.handX || 0;
      }
    },
    {
      name: "Hand Y Position",
      icon: "./assets/blockicons/Up.svg",
      execute: () => {
        return window.humanDetectionData?.handY || 0;
      }
    },
    {
      name: "Move to Hand",
      icon: "./assets/blockicons/Home.svg",
      execute: (actor) => {
        const handX = window.humanDetectionData?.handX || 0;
        const handY = window.humanDetectionData?.handY || 0;
        // Move sprite to hand position
        actor.x = handX;
        actor.y = handY;
      }
    },
  ],
};


// Camera Control Block Component
function CameraControlBlock({ puzzleBg, onCameraChange }) {
  const dispatch = useDispatch();
  const globalCameraState = useSelector((s) => s.scene.globalCameraState);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleCameraToggle = (newState) => {
    dispatch(setCameraState(newState));

    if (newState === "on") {
      window.humanDetectionController?.startCamera();
    } else {
      window.humanDetectionController?.stopCamera();
    }

    setShowDropdown(false);

    if (onCameraChange && typeof onCameraChange === "function") {
      onCameraChange(newState);
    }
  };

  const handleArrowClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDropdown((prev) => !prev);
  };

  const handleDragStart = (event) => {
    setShowDropdown(false);
    const blockData = {
      name: "Camera Control",
      type: "camera_control",
      category: "humandetection",
      puzzleBg: puzzleBg,
      cameraState: globalCameraState,
    };
    event.dataTransfer.setData("application/block", JSON.stringify(blockData));
  };

  return (
    <div
      className="block-palette-tile camera-control-block"
      draggable={true}
      onDragStart={handleDragStart}
      title="Camera Control - Drag to script area"
    >
      <img
        className="block-bg"
        src={puzzleBg}
        alt=""
        draggable={false}
        aria-hidden="true"
      />

      {/* Camera Icon */}
      <img src="./assets/ui/camera.png" alt="Camera" className="camera-icon" />

      {/* Dropdown Arrow */}
      <div className="camera-dropdown-arrow" onClick={handleArrowClick}>
        <img
          src="./assets/misc/pushbutton.svg"
          alt="Toggle Dropdown"
          style={{
            width: "16px",
            height: "16px",
            transform: showDropdown ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Dropdown List */}
      <div
        className={`camera-dropdown-list ${showDropdown ? "show" : ""}`}
      >
        <div
          className={`camera-dropdown-item ${globalCameraState === "on" ? "active" : ""
            }`}
          onClick={() => handleCameraToggle("on")}
        >
          ON
        </div>
        <div
          className={`camera-dropdown-item ${globalCameraState === "off" ? "active" : ""
            }`}
          onClick={() => handleCameraToggle("off")}
        >
          OFF
        </div>
      </div>
    </div>
  );
}

// Voice Recording Modal Component - Updated with all buttons
function VoiceRecordModal({ isOpen, onClose, onSave }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);


  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];


      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };


      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };


      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);


      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);


    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };


  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };


  const playRecording = () => {
    if (audioURL && !isPlaying) {
      audioRef.current = new Audio(audioURL);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.play();
      setIsPlaying(true);
    }
  };


  const stopPlayback = () => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };


  const saveRecording = () => {
    if (audioURL && audioBlob) {
      const soundId = `custom_sound_${Date.now()}`;
      const customSoundData = {
        id: soundId,
        name: `My Sound ${new Date().toLocaleTimeString()}`,
        audioURL: audioURL,
        audioBlob: audioBlob,
        type: 'custom'
      };
      onSave(customSoundData);
      onClose();
    }
  };


  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    if (isPlaying) {
      stopPlayback();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setAudioURL(null);
    setAudioBlob(null);
    setRecordingTime(0);
    setIsPlaying(false);
    onClose();
  };


  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };


  if (!isOpen) return null;


  return (
    <div className="voice-modal-overlay">
      <div className="voice-modal">
        <div className="voice-modal-header">
          <img src="./assets/lib/mic.svg" alt="Microphone" className="modal-mic-icon" />
          <button className="modal-close-btn" onClick={handleClose}>×</button>
        </div>


        <div className="voice-modal-content">
          <div className="waveform-display">
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                className={`waveform-bar ${isRecording ? 'recording' : ''}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>


          <div className="recording-time">{formatTime(recordingTime)}</div>


          <div className="voice-controls">
            {/* Record Button */}
            <button
              className="control-btn record-control"
              onClick={isRecording ? stopRecording : startRecording}
              title={isRecording ? "Stop Recording" : "Start Recording"}
            >
              <img
                src={isRecording ? "./assets/lib/recordon.svg" : "./assets/lib/recordoff.svg"}
                alt={isRecording ? "Recording" : "Record"}
              />
            </button>


            {/* Play Button */}
            {audioURL && (
              <button
                className="control-btn play-control"
                onClick={isPlaying ? stopPlayback : playRecording}
                title={isPlaying ? "Stop Playback" : "Play Recording"}
              >
                <img
                  src={isPlaying ? "./assets/lib/playon.svg" : "./assets/lib/playoff.svg"}
                  alt={isPlaying ? "Playing" : "Play"}
                />
              </button>
            )}


            {/* Stop Button */}
            {(isRecording || isPlaying) && (
              <button
                className="control-btn stop-control"
                onClick={isRecording ? stopRecording : stopPlayback}
                title="Stop"
              >
                <img
                  src={isRecording || isPlaying ? "./assets/lib/stopon.svg" : "./assets/lib/stopoff.svg"}
                  alt="Stop"
                />
              </button>
            )}
          </div>


          {audioURL && (
            <button className="save-btn" onClick={saveRecording}>
              ✓ Save Recording
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


export default function BlockPalette() {
  const dispatch = useDispatch();
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const selectedBlockCategory = useSelector((s) => s.scene.selectedBlockCategory) || "motion";
  const customSounds = useSelector((s) => s.scene.customSounds) || [];


  // Add camera change handler
  const handleCameraChange = (newState) => {
    console.log('Camera state changed to:', newState);
    if (newState === "on") {
      if (window.humanDetectionController) {
        window.humanDetectionController.startCamera();
      } else {
        console.warn('Human detection controller not available');
      }
    } else {
      if (window.humanDetectionController) {
        window.humanDetectionController.stopCamera();
      }
    }
  };


  // Get blocks and add custom sound blocks if in sound category
  const getBlocks = () => {
    const baseBlocks = blocksByCategory[selectedBlockCategory] || [];
    if (selectedBlockCategory === 'sound') {
      const customSoundBlocks = customSounds.map(sound => ({
        name: sound.name,
        icon: "./assets/lib/mic.svg",
        type: 'custom_sound',
        soundData: sound
      }));
      return [...baseBlocks, ...customSoundBlocks];
    }
    // Insert camera control block for humandetection category
    if (selectedBlockCategory === 'humandetection') {
      return [
        {
          name: "Camera Control",
          type: "camera_control"
        },
        ...baseBlocks
      ];
    }
    return baseBlocks;
  };


  const blocks = getBlocks();
  const puzzleBg = puzzleBgByCategory[selectedBlockCategory] || "./assets/blocks/blueCmd.svg";
  const barColor = barColorByCategory[selectedBlockCategory] || "#3291d7";


  const handleDoubleClick = (block) => {
    if (block.type === 'custom_sound') {
      const executableBlock = {
        ...block,
        execute: () => {
          const audio = new Audio(block.soundData.audioURL);
          audio.play().catch(err => console.error('Error playing sound:', err));
        }
      };
      dispatch(addBlockToScript(executableBlock));
    } else {
      dispatch(addBlockToScript(block));
    }
  };


  const handleDragStart = (block) => (event) => {
    const data = {
      ...block,
      category: selectedBlockCategory,
      puzzleBg: puzzleBgByCategory[selectedBlockCategory],
    };
    event.dataTransfer.setData("application/block", JSON.stringify(data));
  };


  const handleBlockClick = (block) => {
    if (block.name === "Record") {
      setShowVoiceModal(true);
    }
  };


  const handleVoiceSave = (customSoundData) => {
    dispatch(addCustomSound(customSoundData));
    console.log('Custom sound saved:', customSoundData);
  };


  return (
    <>
      <div
        className="block-palette-root"
        style={{
          background: barColor,
          transition: "background 0.18s",
        }}
      >
        {blocks.map((block, idx) => {
          // Special handling for camera control block
          if (block.type === 'camera_control') {
            return (
              <CameraControlBlock
                key={block.name + idx}
                puzzleBg={puzzleBg}
                onCameraChange={handleCameraChange} // Pass the handler function
              />
            );
          }


          // Regular block rendering
          return (
            <div
              className={`block-palette-tile ${block.type === 'custom_sound' ? 'custom-sound-block' : ''}`}
              key={(block.name || "end") + idx}
              title={block.name || "End"}
              draggable
              onDragStart={handleDragStart(block)}
              onDoubleClick={() => handleDoubleClick(block)}
              onClick={() => handleBlockClick(block)}
            >
              <img className="block-bg" src={puzzleBg} alt="" draggable={false} aria-hidden="true" />


              {block.icon && (
                <img
                  className="block-icon"
                  src={block.icon}
                  alt={block.name}
                  draggable={false}
                />
              )}


              {typeof block.label === "string" && block.label.trim() !== "" && (
                <span className="block-label">{block.label}</span>
              )}


              {block.type === 'custom_sound' && (
                <div className="custom-sound-indicator">🎤</div>
              )}
            </div>
          );
        })}
      </div>


      <VoiceRecordModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onSave={handleVoiceSave}
      />
    </>
  );
}
