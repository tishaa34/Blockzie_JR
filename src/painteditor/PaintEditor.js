import React, { useRef, useEffect, useState } from "react";
import "../css/PaintEditor.css";

const TOOLS = [
  { id: "undo", icon: "/assets/editor/undo.png", action: "undo" },
  { id: "redo", icon: "/assets/editor/redo.png", action: "redo" },
  { id: "pen", icon: "/assets/editor/pen.png", action: "pen" },
  { id: "rect", icon: "/assets/editor/rect.png", action: "rect" },
  { id: "ellipse", icon: "/assets/editor/ellipse.png", action: "ellipse" },
  { id: "line", icon: "/assets/editor/line.png", action: "line" },
  { id: "triangle", icon: "/assets/editor/triangle.png", action: "triangle" },
  { id: "eraser", icon: "/assets/editor/eraser.png", action: "eraser" }
];

const ACTIONS = [
  { id: "move", icon: "/assets/editor/move.png", action: "move" },
  { id: "flip", icon: "/assets/editor/flip.png", action: "flip" },
  { id: "stamp", icon: "/assets/editor/stamp.png", action: "stamp" },
  { id: "cut", icon: "/assets/editor/cut.png", action: "cut" },
  { id: "camera", icon: "/assets/editor/camera.png", action: "camera" },
  { id: "ok", icon: "/assets/editor/ok.png", action: "ok" }
];

const COLORS = [
  "#ffdff4", "#ffb4d9", "#ffaad7", "#ff89bc", "#ff3266", "#ff322e", "#ff7f29",
  "#ffd700", "#feffbe", "#deff87", "#a5fc6d", "#5eda9e", "#68acf4", "#068afb",
  "#a19cff", "#edb8ff", "#ffb8fd", "#d8cbc4", "#fffff6", "#e4e0da",
  "#bbbbbb", "#918991", "#74564d", "#42362b", "#191818", "#000"
];

export default function PaintEditor({ onSave, onClose }) {
  const canvasRef = useRef();
  const [currentTool, setCurrentTool] = useState("pen");
  const [color, setColor] = useState("#000");
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    // Draw the grid
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    drawGrid(ctx);
  }, []);

  const handlePointerDown = e => {
    setDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches.clientY : e.clientY) - rect.top;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handlePointerMove = e => {
    if (!drawing || currentTool !== "pen") return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches.clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches.clientY : e.clientY) - rect.top;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => setDrawing(false);

  function drawGrid(ctx) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 460, 340);
    ctx.strokeStyle = "#efebe2";
    for (let x = 0.5; x < 460; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 340);
      ctx.stroke();
    }
    for (let y = 0.5; y < 340; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(460, y);
      ctx.stroke();
    }
  }

  return (
    <div className="sjrpaint-modal">
      <div className="sjrpaint-modal-top">
        <span className="sjrpaint-modal-title">Character</span>
      </div>
      <div className="sjrpaint-main">
        {/* Left toolbar */}
        <div className="sjrpaint-tools-col">
          <img
            className="sjrpaint-toolbar-icon"
            src="/assets/editor/undo.png"
            alt="Undo"
            title="Undo"
            style={{ marginBottom: 13 }}
          />
          <img
            className="sjrpaint-toolbar-icon"
            src="/assets/editor/redo.png"
            alt="Redo"
            title="Redo"
            style={{ marginBottom: 17 }}
          />
          {/* Drawing tools */}
          <img
            className={"sjrpaint-toolbar-icon" + (currentTool === "pen" ? " active" : "")}
            src="/assets/editor/pen.png"
            alt="Pen"
            title="Pen"
            onClick={() => setCurrentTool("pen")}
          />
          <img
            className={"sjrpaint-toolbar-icon" + (currentTool === "rect" ? " active" : "")}
            src="/assets/editor/rect.png"
            alt="Rectangle"
            title="Rectangle"
            onClick={() => setCurrentTool("rect")}
          />
          <img
            className={"sjrpaint-toolbar-icon" + (currentTool === "ellipse" ? " active" : "")}
            src="/assets/editor/ellipse.png"
            alt="Ellipse"
            title="Ellipse"
            onClick={() => setCurrentTool("ellipse")}
          />
          <img
            className={"sjrpaint-toolbar-icon" + (currentTool === "triangle" ? " active" : "")}
            src="/assets/editor/triangle.png"
            alt="Triangle"
            title="Triangle"
            onClick={() => setCurrentTool("triangle")}
          />
          <img
            className={"sjrpaint-toolbar-icon" + (currentTool === "line" ? " active" : "")}
            src="/assets/editor/line.png"
            alt="Line"
            title="Line"
            onClick={() => setCurrentTool("line")}
          />
          <img
            className={"sjrpaint-toolbar-icon" + (currentTool === "eraser" ? " active" : "")}
            src="/assets/editor/eraser.png"
            alt="Eraser"
            title="Eraser"
            onClick={() => setCurrentTool("eraser")}
          />
        </div>
        {/* Canvas */}
        <div className="sjrpaint-canvas-panel">
          <canvas
            ref={canvasRef}
            width={460}
            height={340}
            className="sjrpaint-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>
        {/* Right action bar */}
        <div className="sjrpaint-actions-col">
          <img
            className="sjrpaint-toolbar-icon"
            src="/assets/editor/move.png"
            alt="Move"
            title="Move"
          />
          <img
            className="sjrpaint-toolbar-icon"
            src="/assets/editor/flip.png"
            alt="Flip"
            title="Flip"
          />
          <img
            className="sjrpaint-toolbar-icon"
            src="/assets/editor/stamp.png"
            alt="Stamp"
            title="Stamp"
          />
          <img
            className="sjrpaint-toolbar-icon"
            src="/assets/editor/cut.png"
            alt="Cut"
            title="Cut"
          />
          <img
            className="sjrpaint-toolbar-icon"
            src="/assets/editor/camera.png"
            alt="Camera"
            title="Camera"
          />
          <img
            className="sjrpaint-toolbar-icon"
            src="/assets/editor/ok.png"
            alt="OK"
            title="OK"
            onClick={() => onSave && onSave(canvasRef.current.toDataURL())}
            style={{ marginTop: 6, background: "#bce2b2", borderRadius: "12px" }}
          />
        </div>
      </div>
      <div className="sjrpaint-bottom-palette">
        {COLORS.map(c => (
          <button
            key={c}
            className="sjrpaint-palette-color"
            style={{ background: c, border: c === color ? "3px solid #1663c7" : "2px solid #ddd" }}
            onClick={() => setColor(c)}
          />
        ))}
        <img
          className="sjrpaint-palette-paint"
          src="/assets/editor/paintspill.png"
          alt="Paint Tool"
          style={{ marginLeft: 12, width: 35, height: 32, verticalAlign: "middle" }}
        />
      </div>
    </div>
  );
}
