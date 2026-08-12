"use client";

import Link from "next/link";
import { ArrowLeft, Box, Loader2, ScanLine, Smartphone, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { ModelViewer, type ModelViewerElement } from "@/components/model/model-viewer";

export function ArViewer({
  title,
  glbUrl,
  usdzUrl,
  posterUrl,
}: {
  title: string;
  glbUrl: string;
  usdzUrl: string | null;
  posterUrl: string | null;
}) {
  const [element, setElement] = useState<ModelViewerElement | null>(null);
  const [launching, setLaunching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function launchAr() {
    if (!element) return;
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isIos && !usdzUrl) {
      setMessage("An iOS USDZ file is not available yet. You can still explore the 3D model here.");
      return;
    }
    if (!element.canActivateAR) {
      setMessage("AR is not available in this browser. Try Safari on iPhone or Chrome on an ARCore Android phone.");
      return;
    }
    setLaunching(true);
    setMessage(null);
    try { await element.activateAR(); }
    catch { setMessage("AR could not start on this device."); }
    finally { setLaunching(false); }
  }

  return (
    <main className="ar-page">
      <header className="ar-header"><Link href="/"><ArrowLeft size={17} /> SnapAR</Link><span><i /> AR READY</span></header>
      <section className="ar-viewer-stage">
        <ModelViewer src={glbUrl} iosSrc={usdzUrl} poster={posterUrl} onReady={setElement} className="ar-model-viewer" />
        <div className="ar-title"><span className="eyebrow">Spatial preview</span><h1>{title}</h1><p><Box size={14} /> Drag to rotate · Pinch to zoom</p></div>
      </section>
      <section className="ar-action-sheet">
        <div><span className="ar-device-icon"><Smartphone size={22} /></span><span><strong>View at true scale</strong><small>Place this model on a detected surface.</small></span></div>
        <button className="button button-primary button-wide ar-launch" type="button" onClick={launchAr} disabled={!element || launching}>
          {launching ? <Loader2 className="spin" size={19} /> : <ScanLine size={19} />}
          {launching ? "Starting AR…" : "View in your space"}
        </button>
        {message && <p className="ar-fallback"><TriangleAlert size={16} /> {message}</p>}
        {!usdzUrl && <p className="ar-format-note">GLB web and Android AR are ready. iOS Quick Look needs a USDZ output from the connected AI provider.</p>}
      </section>
    </main>
  );
}
