"use client";

import { Box, Loader2 } from "lucide-react";
import { type FC, useEffect, useRef, useState } from "react";

export type ModelViewerElement = HTMLElement & {
  activateAR: () => Promise<void> | void;
  canActivateAR: boolean;
};

const ModelViewerTag = "model-viewer" as unknown as FC<Record<string, unknown>>;

export function ModelViewer({
  src,
  iosSrc,
  poster,
  ar = true,
  autoRotate = true,
  className = "",
  onReady,
}: {
  src: string;
  iosSrc?: string | null;
  poster?: string | null;
  ar?: boolean;
  autoRotate?: boolean;
  className?: string;
  onReady?: (element: ModelViewerElement) => void;
}) {
  const ref = useRef<ModelViewerElement | null>(null);
  const [defined, setDefined] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    import("@google/model-viewer")
      .then(() => { if (active) setDefined(true); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);

  if (failed) return <div className={`model-viewer-error ${className}`}><Box size={32} /><span>The 3D viewer could not load.</span></div>;

  const props: Record<string, unknown> = {
    ref: (node: HTMLElement | null) => { ref.current = node as ModelViewerElement | null; },
    src,
    alt: "Interactive 3D model",
    "camera-controls": "",
    "touch-action": "pan-y",
    "shadow-intensity": "0.9",
    "environment-image": "neutral",
    exposure: "1.08",
    loading: "eager",
    reveal: "auto",
    className: `model-viewer-element ${className}`,
    onLoad: () => {
      setLoaded(true);
      if (ref.current) onReady?.(ref.current);
    },
    onError: () => setFailed(true),
  };
  if (poster) props.poster = poster;
  if (iosSrc) props["ios-src"] = iosSrc;
  if (autoRotate) props["auto-rotate"] = "";
  if (ar) {
    props.ar = "";
    props["ar-modes"] = "webxr scene-viewer quick-look";
    props["ar-scale"] = "auto";
    props["ar-placement"] = "floor";
    props["xr-environment"] = "";
  }

  return (
    <div className={`model-viewer-container ${loaded ? "is-loaded" : ""}`}>
      {defined && <ModelViewerTag {...props} />}
      {!loaded && <div className="model-viewer-loader"><Loader2 className="spin" size={24} /><span>{defined ? "Loading 3D model" : "Starting 3D viewer"}</span></div>}
    </div>
  );
}
