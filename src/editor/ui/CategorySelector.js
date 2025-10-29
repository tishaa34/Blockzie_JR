import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedBlockCategory } from "../../store/sceneSlice";
import "../../css/CategorySelector.css";

const categories = [
  { id: "start", imgOff: "./assets/categories/StartOff.svg", imgOn: "./assets/categories/StartOn.svg", alt: "Start" },
  { id: "motion", imgOff: "./assets/categories/MotionOff.svg", imgOn: "./assets/categories/MotionOn.svg", alt: "Motion" },
  { id: "looks", imgOff: "./assets/categories/LooksOff.svg", imgOn: "./assets/categories/LooksOn.svg", alt: "Looks" },
  { id: "sound", imgOff: "./assets/categories/SoundOff.svg", imgOn: "./assets/categories/SoundOn.svg", alt: "Sound" },
  { id: "control", imgOff: "./assets/categories/FlowOff.svg", imgOn: "./assets/categories/FlowOn.svg", alt: "Control" },
  { id: "humandetection", imgOff: "./assets/ui/HumanDetection.png", imgOn: "./assets/ui/HumanDetection.png", alt: "Human Detection" }, // Always visible now
  { id: 'sensors', imgOff: "./assets/categories/Sensor.png", imgOn: "./assets/categories/Sensor.png", alt: "Sensor" },
  { id: "end", imgOff: "./assets/categories/StopOff.svg", imgOn: "./assets/categories/StopOn.svg", alt: "End" },
];

export default function CategorySelector() {
  const dispatch = useDispatch();
  const selectedBlockCategory = useSelector(s => s.scene.selectedBlockCategory);
  const selectedDevice = useSelector(s => s.scene.selectedDevice);

  // base categories
  let categories = [
    { id: "start", imgOff: "./assets/categories/StartOff.svg", imgOn: "./assets/categories/StartOn.svg", alt: "Start" },
    { id: "motion", imgOff: "./assets/categories/MotionOff.svg", imgOn: "./assets/categories/MotionOn.svg", alt: "Motion" },
    { id: "looks", imgOff: "./assets/categories/LooksOff.svg", imgOn: "./assets/categories/LooksOn.svg", alt: "Looks" },
    { id: "sound", imgOff: "./assets/categories/SoundOff.svg", imgOn: "./assets/categories/SoundOn.svg", alt: "Sound" },
    { id: "control", imgOff: "./assets/categories/FlowOff.svg", imgOn: "./assets/categories/FlowOn.svg", alt: "Control" },
    { id: "humandetection", imgOff: "./assets/ui/HumanDetection.png", imgOn: "./assets/ui/HumanDetection.png", alt: "Human Detection" },
    { id: 'sensors', imgOff: "./assets/categories/Sensor.png", imgOn: "./assets/categories/Sensor.png", alt: "Sensor" },
    { id: "end", imgOff: "./assets/categories/StopOff.svg", imgOn: "./assets/categories/StopOn.svg", alt: "End" },
  ];

  // device-specific categories to append when a device is selected
  const deviceCategories = {
    otto: { id: "otto", imgOff: "./assets/ui/Otto_Bot.png", imgOn: "./assets/ui/Otto_Bot.png", alt: "Otto Robot" },
    esp32: { id: "esp32", imgOff: "./assets/ui/ESP32.png", imgOn: "./assets/ui/ESP32.png", alt: "ESP32" },
  };

  if (selectedDevice && deviceCategories[selectedDevice]) {
    categories = [...categories, deviceCategories[selectedDevice]];
  }

  return (
    <div className="catbar-tray">
      {categories.map(c => (
        <button
          key={c.id}
          className={`catblockbtn${selectedBlockCategory === c.id ? " active" : ""}`}
          onClick={() => dispatch(setSelectedBlockCategory(c.id))}
          tabIndex={0}
          title={c.alt}
          type="button"
        >
          <img
            className={`catblockicon${selectedBlockCategory === c.id ? " selected" : ""}`}
            src={selectedBlockCategory === c.id ? c.imgOn : c.imgOff}
            alt={c.alt}
            draggable={false}
          />
        </button>
      ))}
    </div>
  );
}
