import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div style={{ textAlign: "center", padding: 40 }}>
      <h1>Welcome to ScratchJr Web</h1>
      <p>Start a new project or learn how to use ScratchJr.</p>
      <Link to="/editor">
        <button style={{ margin: 10, padding: "12px 36px" }}>Start Editing</button>
      </Link>
      <Link to="/gettingstarted">
        <button style={{ margin: 10, padding: "12px 36px" }}>Getting Started</button>
      </Link>
    </div>
  );
}
