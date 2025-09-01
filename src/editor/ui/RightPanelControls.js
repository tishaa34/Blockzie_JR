import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { run } from "../../utils/runScript";
import "../../css/RightPanelControls.css";

export default function RightPanelControls({
  onFullScreen,
  onGridToggle,
  onHeading,
  onGreenFlag,
  selectedActorId
}) {
  const dispatch = useDispatch();
  const { scenes, currentSceneIndex } = useSelector((s) => s.scene);
  const scene = scenes[currentSceneIndex];
  const actor = scene?.actors.find((a) => a.id === selectedActorId);

  return (
    <div className="right-panel-controls">
      <button className="rp-btn" onClick={onFullScreen} title="Fullscreen">
        <img src="./assets/ui/Fulloff.svg" alt="Fullscreen" />
      </button>
      <button className="rp-btn" onClick={onGridToggle} title="Grid Toggle">
        <img src="./assets/ui/gridOn.svg" alt="Grid" />
      </button>
      <button className="rp-btn" onClick={onHeading} title="Add Heading">
        <img src="./assets/ui/addText.svg" alt="Add Heading" />
      </button>
      <button className="rp-btn" onClick={() => run(actor, dispatch, scene?.sounds, actor.id)} title="Green Flag">
        <img src="./assets/ui/go.svg" alt="Green Flag" />
      </button>
    </div>
  );
}
