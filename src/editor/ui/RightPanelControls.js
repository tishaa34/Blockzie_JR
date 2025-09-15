import React, { useState } from "react";
import { useSelector, useDispatch,  } from "react-redux";
import { run } from "../../utils/runScript";
import BackgroundGallery from "./BackgroundGallery"; // Import the new component
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
  // const store = useStore();

  // Add state for background gallery modal
  const [backgroundModalOpen, setBackgroundModalOpen] = useState(false);

  return (
    <>
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
        {/* New Background Button */}
        <button className="rp-btn" onClick={() => setBackgroundModalOpen(true)} title="Choose Background">
          <img src="./assets/ui/scene1.svg" alt="Background" />
        </button>
        <button className="rp-btn" onClick={() => run(actor, dispatch, scene?.sounds, actor.id)} title="Green Flag">
          <img src="./assets/ui/go.svg" alt="Green Flag" />
        </button>
      </div>
      
      {/* Background Gallery Modal */}
      <BackgroundGallery 
        open={backgroundModalOpen} 
        onClose={() => setBackgroundModalOpen(false)} 
      />
    </>
  );
}
