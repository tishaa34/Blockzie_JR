import React, { useState, useRef } from "react";
import "../../css/BlockPalette.css";
import { useSelector, useDispatch } from "react-redux";
import { addBlockToScript, addCustomSound } from "../../store/sceneSlice";

// Puzzle backgrounds per category
const puzzleBgByCategory = {
  start: "./assets/blocks/start.svg",
  motion: "./assets/blocks/blueCmd.svg",
  looks: "./assets/blocks/looks.svg",
  sound: "./assets/blocks/sounds.svg",
  control: "./assets/blocks/flow.svg",
  end: "./assets/blocks/endshort.svg",
};

// Bar color per category for seamless effect
const barColorByCategory = {
  start: "#ffe55a",
  motion: "#68acfc",
  looks: "#eb7dfa",
  sound: "#59de80",
  control: "#ffc862",
  end: "#e84141",
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
    { name: "Grow Size", icon: "./assets/blockicons/Grow.svg"},
    { name: "Shrink Size", icon: "./assets/blockicons/Shrink.svg"},
    { name: "Reset Size", icon: "./assets/blockicons/Reset.svg"},
    { name: "Appear", icon: "./assets/blockicons/Appear.svg"},
    { name: "Disappear", icon: "./assets/blockicons/Disappear.svg"},
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
  end: [
    { name: "End", icon: null, label: "" },
    { name: "Repeat Forever", icon: "./assets/blockicons/Forever.svg" },
  ],
};

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
    // Add execution data for custom sounds
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

  const handleBlockClick = async (block) => {
    if (block.name === "Record") {
      setShowVoiceModal(true);
    }
  };

  const handleVoiceSave = (customSoundData) => {
    // Save the custom sound to Redux store
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
        {blocks.map((block, idx) => (
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

            {/* Add small indicator for custom sounds */}
            {block.type === 'custom_sound' && (
              <div className="custom-sound-indicator">🎤</div>
            )}
          </div>
        ))}
      </div>

      <VoiceRecordModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onSave={handleVoiceSave}
      />
    </>
  );
}
