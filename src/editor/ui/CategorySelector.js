import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedBlockCategory } from "../../store/sceneSlice";
import "../../css/CategorySelector.css";

const categories = [
  { id: "start", imgOff: "/assets/categories/StartOff.svg", imgOn: "/assets/categories/StartOn.svg", alt: "Start" },
  { id: "motion", imgOff: "/assets/categories/MotionOff.svg", imgOn: "/assets/categories/MotionOn.svg", alt: "Motion" },
  { id: "looks", imgOff: "/assets/categories/LooksOff.svg", imgOn: "/assets/categories/LooksOn.svg", alt: "Looks" },
  { id: "sound", imgOff: "/assets/categories/SoundOff.svg", imgOn: "/assets/categories/SoundOn.svg", alt: "Sound" },
  { id: "control", imgOff: "/assets/categories/FlowOff.svg", imgOn: "/assets/categories/FlowOn.svg", alt: "Control" },
  { id: "end", imgOff: "/assets/categories/StopOff.svg", imgOn: "/assets/categories/StopOn.svg", alt: "End" },
];

export default function CategorySelector() {
  const dispatch = useDispatch();
  const selectedBlockCategory = useSelector(s => s.scene.selectedBlockCategory);

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
