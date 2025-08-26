import React from "react";
import "../../css/BlockPalette.css";
import { useSelector, useDispatch } from "react-redux";
import { addBlockToScript } from "../../store/sceneSlice";

// Puzzle backgrounds per category
const puzzleBgByCategory = {
start: "/assets/blocks/start.svg",
motion: "/assets/blocks/blueCmd.svg",
looks: "/assets/blocks/looks.svg",
sound: "/assets/blocks/sounds.svg",
control: "/assets/blocks/flow.svg",
end: "/assets/blocks/endshort.svg",
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
{ name: "Start on Green Flag ", icon: "/assets/blockicons/greenFlag.svg" },
{ name: "Start On Tap", icon: "/assets/blockicons/OnTouch.svg" },
{ name: "Start On Bump", icon: "/assets/blockicons/Bump.svg" },
// more...
],
motion: [
{ name: "Move Right", icon: "/assets/blockicons/Foward.svg" },
{ name: "Move Left", icon: "/assets/blockicons/Back.svg" },
{ name: "Move Up", icon: "/assets/blockicons/Up.svg" },
{ name: "Move Down", icon: "/assets/blockicons/Down.svg" },
{ name: "Rotate Right", icon: "/assets/blockicons/Right.svg" },
{ name: "Rotate Left", icon: "/assets/blockicons/Left.svg" },
{ name: "Hop", icon: "/assets/blockicons/Hop.svg" },
{ name: "Go Home", icon: "/assets/blockicons/Home.svg" },
// more...
],
looks: [
{ name: "Say", icon: "/assets/blockicons/Say.svg" },
{ name: "Grow Size", icon: "/assets/blockicons/Grow.svg"},
{ name: "Shrink Size", icon: "/assets/blockicons/Shrink.svg"},
{ name: "Reset Size", icon: "/assets/blockicons/Reset.svg"},
{ name: "Appear", icon: "/assets/blockicons/Appear.svg"},
{ name: "Disappear", icon: "/assets/blockicons/Disappear.svg"},
// more...
],
sound: [
{ name: "Pop", icon: "/assets/blockicons/Speaker.svg" },
{ name: "Record", icon: "/assets/blockicons/microphone.svg" },
// more...
],
control: [
{ name: "Wait", icon: "/assets/blockicons/Wait.svg" },
{ name: "Stop", icon: "/assets/blockicons/Stop.svg"},
{ name: "Speed", icon: "/assets/blockicons/Speed0.svg" },
// more...
],
end: [
// Plain end piece: no icon, no label
{ name: "End", icon: null, label: "" },
// Other end-category items
{ name: "Repeat Forever", icon: "/assets/blockicons/Forever.svg" },
// more...
],
};

export default function BlockPalette() {
const dispatch = useDispatch();

const selectedBlockCategory =
useSelector((s) => s.scene.selectedBlockCategory) || "motion";

const blocks = blocksByCategory[selectedBlockCategory] || [];
const puzzleBg =
puzzleBgByCategory[selectedBlockCategory] || "/assets/blocks/blueCmd.svg";
const barColor =
barColorByCategory[selectedBlockCategory] || "#3291d7";

const handleDoubleClick = (block) => {
dispatch(addBlockToScript(block));
};

const handleDragStart = (block) => (event) => {
// include category + puzzle background
const data = {
...block,
category: selectedBlockCategory,
puzzleBg: puzzleBgByCategory[selectedBlockCategory],
};
event.dataTransfer.setData("application/block", JSON.stringify(data));
};

return (
<div
className="block-palette-root"
style={{
background: barColor,
transition: "background 0.18s",
}}
>
{blocks.map((block, idx) => (
<div
className="block-palette-tile"
key={(block.name || "end") + idx}
title={block.name || "End"}
draggable
onDragStart={handleDragStart(block)}
onDoubleClick={() => handleDoubleClick(block)}
>
{/* Puzzle background */}
<img className="block-bg" src={puzzleBg} alt="" draggable={false} aria-hidden="true" />


      {/* Icon overlay (only if provided) */}
      {block.icon && (
        <img
          className="block-icon"
          src={block.icon}
          alt={block.name}
          draggable={false}
        />
      )}

      {/* Optional small numeric/ label (only if non-empty) */}
      {typeof block.label === "string" && block.label.trim() !== "" && (
        <span className="block-label">{block.label}</span>
      )}
    </div>
  ))}
</div>
);
}