"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { type CSSProperties, useState } from "react";

export function InteractivePreview() {
  const [rotation, setRotation] = useState(30);
  const [scale, setScale] = useState(1);
  const style = {
    "--preview-rotation": `${rotation}deg`,
    "--preview-scale": scale,
  } as CSSProperties;

  function reset() {
    setRotation(30);
    setScale(1);
  }

  return (
    <div className="viewer-shell">
      <div className="viewer-top">
        <span><i /> LIVE PREVIEW</span>
        <small>GLB · PBR</small>
      </div>
      <div className="viewer-object is-interactive" style={style}>
        <span /><span /><span />
      </div>
      <div className="viewer-controls" aria-label="3D preview controls">
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => setScale((value) => Math.max(.72, value - .1))}
        >
          <Minus size={15} />
        </button>
        <button
          type="button"
          aria-label="Rotate model"
          onClick={() => setRotation((value) => value + 45)}
        >
          <RotateCcw size={15} />
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => setScale((value) => Math.min(1.32, value + .1))}
        >
          <Plus size={15} />
        </button>
      </div>
      <button className="viewer-reset" type="button" onClick={reset}>Reset view</button>
    </div>
  );
}

