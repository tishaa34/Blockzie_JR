import React, { useState, useRef } from "react";
import "../../css/BlockPalette.css";
import { useDispatch, useSelector } from "react-redux";
import { addBlockToScript, addCustomSound, setCameraState } from "../../store/sceneSlice";
import ConnectionModal from "../ui/ConnectionModal";
import { sendCommand, isConnected } from "../../utils/deviceConnectionManager";



// Puzzle backgrounds per category
const puzzleBgByCategory = {
  start: "./assets/blocks/start.svg",
  motion: "./assets/blocks/blueCmd.svg",
  looks: "./assets/blocks/looks.svg",
  sound: "./assets/blocks/sounds.svg",
  control: "./assets/blocks/flow.svg",
  end: "./assets/blocks/endshort.svg",
  humandetection: "./assets/blocks/looks.svg",
  sensors: "./assets/blocks/flow.svg", // 🛤️ ADDED: Path following category
  otto: "./assets/blocks/blueCmd.svg",
  esp32: "./assets/blocks/blueCmd.svg",
};

// Bar color per category for seamless effect
const barColorByCategory = {
  start: "#ffe55a",
  motion: "#68acfc",
  looks: "#eb7dfa",
  sound: "#59de80",
  control: "#ffc862",
  end: "#e84141",
  humandetection: "#eb7dfa",
  sensors: "#ffc862", // 🛤️ ADDED: Path following category color
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
      name: "Wait", icon: "./assets/blockicons/Wait.svg",
      execute: async (actor, dispatch, sounds, actorId, count = 3) => {
        return new Promise(resolve => {
          setTimeout(resolve, count * 1000);
        });
      }
    },
    {
      name: "Stop", icon: "./assets/blockicons/Stop.svg",
      execute: () => {
        throw new Error("STOP_EXECUTION");
      }
    },
    { name: "Speed", icon: "./assets/blockicons/Speed0.svg" },
  ],
  device: [
    { name: "Otto-Bot", icon: "./assets/blockicons/OttoBot.svg", requiresConnection: true },
    { name: "Light RC", icon: "./assets/blockicons/RCCar.svg", requiresConnection: true },
  ],
  end: [
    { name: "End", icon: null, label: "" },
    { name: "Repeat Forever", icon: "./assets/blockicons/Forever.svg" },
  ],
  humandetection: [
    { name: "Camera Control", icon: "./assets/ui/image.png", type: "camera" },
    {
      name: "Happy Detected", icon: "./assets/blockicons/Smile.svg", type: "boolean",
      execute: () => {
        return window.humanDetectionData?.dominantExpression === 'happy';
      }
    },
    {
      name: "Move With Hand Detection",
      icon: "./assets/blockicons/Right.png",
      type: "moveWithHandDetection",
      execute: async () => true,
    },
    { name: "Set Video Transparency", icon: "./assets/blockicons/opacity.svg", type: "video_transparency", options: [100, 75, 50, 25, 0] },
    { name: "Sync Actors with Faces", icon: "./assets/blockicons/actor.svg", type: "sync_actors_with_faces" },
  ],
  // 🛤️🎨 UPDATED: Enhanced sensors category with path following AND color detection
  sensors: [
    {
      name: "Set Path Color",
      icon: "./assets/blockicons/Say.svg", // Using existing icon
      type: "setPathColor",
      pathColor: "#000000", // Default black path
      execute: () => {
        // Color setting logic handled in runScript.js
        return true;
      }
    },
    {
      name: "Start Color Detection",
      icon: "./assets/ui/image.png", // Using camera icon
      type: "startColorDetection",
      targetColor: "#000000", // Default black
      execute: () => {
        return true; // Logic handled in runScript.js
      }
    },
    {
      name: "Stop Color Detection",
      icon: "./assets/blockicons/Stop.svg",
      type: "stopColorDetection",
      execute: () => {
        return true; // Logic handled in runScript.js
      }
    },
    {
      name: "Color Detected",
      icon: "./assets/blockicons/Smile.svg", // Using existing icon
      type: "colorDetected",
      execute: () => {
        return window.colorDetectionActive || false;
      }
    },
    {
      name: "Follow Path On Color",
      icon: "./assets/blockicons/Right.svg",
      type: "followPathOnColor",
      requiresColorDetection: true,
      execute: () => {
        return true; // Logic handled in runScript.js
      }
    },
  ],
  otto: [
    { name: "Move Right", icon: "./assets/blockicons/Foward.svg" },
    { name: "Move Left", icon: "./assets/blockicons/Back.svg" },
    { name: "Move Up", icon: "./assets/blockicons/Up.svg" },
    { name: "Move Down", icon: "./assets/blockicons/Down.svg" },
    { name: "Rotate Right", icon: "./assets/blockicons/Right.svg" },
    { name: "Rotate Left", icon: "./assets/blockicons/Left.svg" },
  ],
  esp32: [
    { name: "Move Right", icon: "./assets/blockicons/Foward.svg" },
    { name: "Move Left", icon: "./assets/blockicons/Back.svg" },
    { name: "Move Up", icon: "./assets/blockicons/Up.svg" },
    { name: "Move Down", icon: "./assets/blockicons/Down.svg" },
    { name: "Rotate Right", icon: "./assets/blockicons/Right.svg" },
    { name: "Rotate Left", icon: "./assets/blockicons/Left.svg" },
  ],
};

// Camera Control Block Component - KEEP AS IS
function CameraControlBlock({ puzzleBg }) {
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
      className="camera-control-block block-palette-tile"
      draggable
      onDragStart={handleDragStart}
    >
      <img className="block-bg" src={puzzleBg} alt="" draggable={false} />
      <img
        className="camera-icon"
        src="./assets/blockicons/camera.svg"
        alt="Camera"
        draggable={false}
      />
      <div className="camera-dropdown-arrow" onClick={handleArrowClick}>
        <img
          src="./assets/blockicons/dropdown.svg"
          alt="Options"
          style={{ width: '16px', height: '16px' }}
        />
      </div>
      {showDropdown && (
        <div className="camera-dropdown-list show">
          <div
            className={`camera-dropdown-item ${globalCameraState === 'on' ? 'active' : ''}`}
            onClick={() => handleCameraToggle('on')}
          >
            ON
          </div>
          <div
            className={`camera-dropdown-item ${globalCameraState === 'off' ? 'active' : ''}`}
            onClick={() => handleCameraToggle('off')}
          >
            OFF
          </div>
        </div>
      )}
    </div>
  );
}

// 🛤️ ADDED: Path Color Block Component with color picker
function PathColorBlock({ block, puzzleBg, onDragStart, onDoubleClick }) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState(block.pathColor || "#000000");

  const handleColorChange = (color) => {
    setSelectedColor(color);
    // Update block data
    block.pathColor = color;
    setShowColorPicker(false);
  };

  const handleColorClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowColorPicker(!showColorPicker);
  };

  const colors = ["#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"];

  return (
    <div
      className="path-color-block block-palette-tile"
      draggable
      onDragStart={(e) => onDragStart({ ...block, pathColor: selectedColor })(e)}
      onDoubleClick={() => onDoubleClick({ ...block, pathColor: selectedColor })}
    >
      <img className="block-bg" src={puzzleBg} alt="" draggable={false} />
      <img
        className="block-icon"
        src={block.icon}
        alt={block.name}
        draggable={false}
      />
      <div
        className="color-indicator"
        onClick={handleColorClick}
        style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: selectedColor,
          border: '2px solid white',
          cursor: 'pointer',
          zIndex: 10
        }}
      />
      {showColorPicker && (
        <div
          className="color-picker-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            right: '0',
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '8px',
            display: 'flex',
            gap: '4px',
            zIndex: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          {colors.map(color => (
            <div
              key={color}
              onClick={() => handleColorChange(color)}
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: color,
                border: selectedColor === color ? '3px solid #333' : '1px solid #ccc',
                cursor: 'pointer'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 🎨 NEW: Color Detection Block Component with color picker
function ColorDetectionBlock({ block, puzzleBg, onDragStart, onDoubleClick }) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState(block.targetColor || "#FF0000");

  const handleColorChange = (color) => {
    setSelectedColor(color);
    block.targetColor = color;
    setShowColorPicker(false);
  };

  const handleColorClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowColorPicker(!showColorPicker);
  };

  const colors = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF", "#FFA500", "#800080"];

  return (
    <div
      className="color-detection-block block-palette-tile"
      draggable
      onDragStart={(e) => onDragStart({ ...block, targetColor: selectedColor })(e)}
      onDoubleClick={() => onDoubleClick({ ...block, targetColor: selectedColor })}
    >
      <img className="block-bg" src={puzzleBg} alt="" draggable={false} />
      <img
        className="block-icon"
        src={block.icon}
        alt={block.name}
        draggable={false}
      />
      <div
        className="color-indicator"
        onClick={handleColorClick}
        style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: selectedColor,
          border: '2px solid white',
          cursor: 'pointer',
          zIndex: 10
        }}
      />
      {showColorPicker && (
        <div
          className="color-picker-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            right: '0',
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '8px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
            zIndex: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            width: '120px'
          }}
        >
          {colors.map(color => (
            <div
              key={color}
              onClick={() => handleColorChange(color)}
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: color,
                border: selectedColor === color ? '3px solid #333' : '1px solid #ccc',
                cursor: 'pointer'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Voice Recording Modal Component - KEEP AS IS
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
  const [showConnectionModal, setShowConnectionModal] = useState(false); // Added connection modal state

  const selectedBlockCategory = useSelector((s) => s.scene.selectedBlockCategory) || "motion";
  const customSounds = useSelector((s) => s.scene.customSounds) || [];

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

    return baseBlocks;
  };

  const blocks = getBlocks();
  const puzzleBg = puzzleBgByCategory[selectedBlockCategory] || "./assets/blocks/blueCmd.svg";
  const barColor = barColorByCategory[selectedBlockCategory] || "#3291d7";

  const handleDoubleClick = (block) => {
    // FIXED: Add proper category to blocks
    const blockWithCategory = {
      ...block,
      category: selectedBlockCategory,
      puzzleBg: puzzleBg
    };

    // Add execution data for custom sounds
    if (block.type === 'custom_sound') {
      const executableBlock = {
        ...blockWithCategory,
        execute: () => {
          const audio = new Audio(block.soundData.audioURL);
          audio.play().catch(err => console.error('Error playing sound:', err));
        }
      };
      dispatch(addBlockToScript({ actorId: null, block: executableBlock }));
    } else {
      dispatch(addBlockToScript({ actorId: null, block: blockWithCategory }));
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
    console.log('Block clicked:', block.name); // DEBUG
    if (block.name === "Record") {
      console.log('Opening voice modal'); // DEBUG
      setShowVoiceModal(true);
    } else if (block.requiresConnection) { // Added device connection handling
      setShowConnectionModal(true);
    }
  };

  const handleVoiceSave = (customSoundData) => {
    dispatch(addCustomSound(customSoundData));
    console.log('Custom sound saved:', customSoundData);
  };

  // Added: device connect handler used by ConnectionModal
  const handleDeviceConnect = (deviceName, connection) => {
    console.log("Connected to:", connection);
    alert(`Connected via ${connection.type}`);
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
          // Special handling for camera control blocks
          if (block.type === "camera_control") {
            return <CameraControlBlock key={idx} puzzleBg={puzzleBg} />;
          }

          // 🛤️ ADDED: Special handling for path color blocks
          if (block.type === "setPathColor") {
            return (
              <PathColorBlock
                key={idx}
                block={block}
                puzzleBg={puzzleBg}
                onDragStart={handleDragStart}
                onDoubleClick={handleDoubleClick}
              />
            );
          }

          // 🎨 FIXED: Special handling for color detection blocks
          if (block.type === "startColorDetection") {
            console.log('🎨 Rendering ColorDetectionBlock for:', block.name); // DEBUG
            return (
              <ColorDetectionBlock
                key={idx}
                block={block}
                puzzleBg={puzzleBg}
                onDragStart={handleDragStart}
                onDoubleClick={handleDoubleClick}
              />
            );
          }


          return (
            <div
              className={`block-palette-tile ${block.type === 'custom_sound' ? 'custom-sound-block' : ''}`}
              key={(block.name || "end") + idx}
              title={block.name || "End"}
              draggable={!block.requiresConnection} // Modified: Only draggable if no connection required
              onDragStart={!block.requiresConnection ? handleDragStart(block) : undefined} // Modified: Only add drag handler if draggable
              onDoubleClick={() => handleDoubleClick(block)}
              onClick={() => handleBlockClick(block)}
              style={{ cursor: block.requiresConnection ? 'pointer' : 'grab' }} // Modified: Different cursor for connection blocks
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

              {/* 🛤️ EXISTING: Special indicators for path following blocks */}
              {block.type === 'followPath' && (
                <div className="path-follow-indicator" style={{
                  position: 'absolute', bottom: '4px', right: '4px',
                  fontSize: '12px', color: 'white'
                }}>🛤️</div>
              )}

              {block.type === 'pathDetected' && (
                <div className="path-detect-indicator" style={{
                  position: 'absolute', bottom: '4px', right: '4px',
                  fontSize: '12px', color: 'white'
                }}>🔍</div>
              )}

              {/* 🎨 NEW: Special indicators for color detection blocks */}
              {block.type === 'startColorDetection' && (
                <div className="color-detect-start-indicator" style={{
                  position: 'absolute', bottom: '4px', right: '4px',
                  fontSize: '12px', color: 'white'
                }}>🎨</div>
              )}

              {block.type === 'colorDetected' && (
                <div className="color-detected-indicator" style={{
                  position: 'absolute', bottom: '4px', right: '4px',
                  fontSize: '12px', color: 'white'
                }}>👁️</div>
              )}

              {block.type === 'followPathOnColor' && (
                <div className="follow-on-color-indicator" style={{
                  position: 'absolute', bottom: '4px', right: '4px',
                  fontSize: '12px', color: 'white'
                }}>🛤️🎨</div>
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

      {/* Added ConnectionModal */}
      <ConnectionModal
        isOpen={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        onConnect={handleDeviceConnect}
      />
    </>
  );
}

export { blocksByCategory };