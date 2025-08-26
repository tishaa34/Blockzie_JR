import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { undoGlobal, redoGlobal } from "../../store/sceneSlice";
import "../../css/UndoRedoBar.css";

export default function UndoRedoBar() {
  const dispatch = useDispatch();
  const undoDisabled = useSelector(s => !s.scene.globalUndoStack.length);
  const redoDisabled = useSelector(s => !s.scene.globalRedoStack.length);

  return (
    <div className="undoredo-bar">
      <button
        className="undoredo-btn"
        disabled={undoDisabled}
        title="Undo"
        onClick={() => dispatch(undoGlobal())}
      >
        <span className="icon">↶</span>
      </button>
      <button
        className="undoredo-btn"
        disabled={redoDisabled}
        title="Redo"
        onClick={() => dispatch(redoGlobal())}
      >
        <span className="icon">↷</span>
      </button>
    </div>
  );
}
