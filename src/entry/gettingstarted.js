import React from "react";
import { Link } from "react-router-dom";

export default function GettingStarted() {
  return (
    <div style={{ padding: 42, maxWidth: 700, margin: "auto", textAlign: "center" }}>
      <h2>Getting Started</h2>
      <p>Here's how to use ScratchJr Web:</p>
      <ul style={{ textAlign: "left", display: "inline-block" }}>
        <li>Use the Editor to create and save projects</li>
        <li>Draw your own characters in the paint editor</li>
        <li>Use blocks to code your characters</li>
      </ul>
      <Link to="/editor">
        <button style={{ marginTop: 20, padding: "12px 36px" }}>Try It Now</button>
      </Link>
    </div>
  );
}
