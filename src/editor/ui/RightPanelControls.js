import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { run } from "../../utils/runScript";
import BackgroundGallery from "./BackgroundGallery";
import SimulatorControl from "../../SimulatorView/SimulatorControl";
import SimulatorModal from "../../SimulatorView/SimulatorModal";
import "../../css/RightPanelControls.css";
import "../../css/SimulatorView.css";

export default function RightPanelControls({
  onFullScreen,
  onGridToggle,
  onHeading,
  onGreenFlag,
  selectedActorId,
  onSimulator, // Added this prop
  onBackgroundChange // Added this prop
}) {
  const dispatch = useDispatch();
  const { scenes, currentSceneIndex } = useSelector((s) => s.scene);
  const scene = scenes[currentSceneIndex];
  const actor = scene?.actors.find((a) => a.id === selectedActorId);

  const [backgroundModalOpen, setBackgroundModalOpen] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  const handleSimulatorToggle = () => {
    setSimulatorOpen(!simulatorOpen);
    if (!simulatorOpen && onSimulator) {
      onSimulator(); // Call the onSimulator prop when opening
    }
  };

  return (
    <>
      <div className="right-panel-controls">
        {!simulatorOpen ? (
          <>
            <button className="rp-btn" onClick={onFullScreen} title="Fullscreen">
              <img src="./assets/ui/FullOff.svg" alt="Fullscreen" />
            </button>
            <button className="rp-btn" onClick={onGridToggle} title="Grid Toggle">
              <img src="./assets/ui/gridOn.svg" alt="Grid" />
            </button>
            <button className="rp-btn" onClick={onHeading} title="Add Heading">
              <img src="./assets/ui/addText.svg" alt="Add Heading" />
            </button>
            <button className="rp-btn" onClick={() => setBackgroundModalOpen(true)} title="Choose Background">
              <img src="./assets/ui/scene1.svg" alt="Background" />
            </button>
            <button className="rp-btn" onClick={() => run(actor, dispatch, scene?.sounds, actor.id)} title="Green Flag">
              <img src="./assets/ui/go.svg" alt="Green Flag" />
            </button>
            <button className="rp-btn" onClick={handleSimulatorToggle} title="Simulator">
              <img src="./assets/ui/sim.svg" alt="Simulator" />
            </button>
          </>
        ) : (
          <SimulatorControl onBackgroundChange={onBackgroundChange} />
        )}
      </div>

      <BackgroundGallery
        open={backgroundModalOpen}
        onClose={() => setBackgroundModalOpen(false)}
      />

      {simulatorOpen && (
        <SimulatorModal 
          onClose={handleSimulatorToggle} 
          onBackgroundChange={onBackgroundChange}
        />
      )}
    </>
  );
}