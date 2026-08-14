"use client";

import { Box, Loader2 } from "lucide-react";
import { type FC, useEffect, useRef, useState } from "react";
import { loadModelViewer } from "@/lib/cdn";

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
  loading = "eager",
  className = "",
  onElement,
  onReady,
  onProgress,
}: {
  src: string;
  iosSrc?: string | null;
  poster?: string | null;
  ar?: boolean;
  autoRotate?: boolean;
  loading?: "eager" | "lazy" | "auto";
  className?: string;
  onElement?: (element: ModelViewerElement) => void;
  onReady?: (element: ModelViewerElement) => void;
  onProgress?: (progress: number) => void;
}) {
  const ref = useRef<ModelViewerElement | null>(null);
  const [defined, setDefined] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let active = true;
    loadModelViewer()
      .then(() => { if (active) setDefined(true); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!defined || !node) return;

    onElement?.(node);

    const handleProgress = (event: Event) => {
      const next = Math.min(
        1,
        Math.max(
          0,
          (event as CustomEvent<{ totalProgress?: number }>).detail
            ?.totalProgress ?? 0,
        ),
      );
      setProgress(next);
      onProgress?.(next);
    };

    node.addEventListener("progress", handleProgress);
    return () => node.removeEventListener("progress", handleProgress);
  }, [defined, onElement, onProgress]);

  if (failed) return <div className={`model-viewer-error ${className}`}><Box size={32} /><span>3D загвар ачаалагдсангүй.</span></div>;

  const props: Record<string, unknown> = {
    ref: (node: HTMLElement | null) => { ref.current = node as ModelViewerElement | null; },
    src,
    alt: "Interactive 3D model",
    "camera-controls": "",
    "touch-action": "pan-y",
    "shadow-intensity": "0.9",
    "environment-image": "neutral",
    exposure: "1.08",
    loading,
    reveal: "auto",
    className: `model-viewer-element ${className}`,
    onLoad: () => {
      setLoaded(true);
      setProgress(1);
      onProgress?.(1);
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
      {!loaded && <div className="model-viewer-loader"><Loader2 className="spin" size={24} /><span>{defined ? `3D загвар татаж байна · ${Math.round(progress * 100)}%` : "3D үзэгчийг нээж байна"}</span></div>}
    </div>
  );
}
