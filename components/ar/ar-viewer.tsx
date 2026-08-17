"use client";

import Link from "next/link";
import { ArrowLeft, Box, Loader2, ScanLine, Smartphone, TriangleAlert } from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";
import { QuickLookLink } from "@/components/ar/quick-look-link";
import { ModelViewer, type ModelViewerElement } from "@/components/model/model-viewer";

type ArAssets = {
  webGlb: string;
  androidGlb: string;
  iosUsdz: string;
};

function isIosDevice() {
  return /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function openSceneViewer(url: string) {
  const fallback = new URL(window.location.href);
  fallback.hash = "model-viewer-no-ar-fallback";
  window.location.href =
    `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(url)}` +
    "&mode=ar_preferred&resizable=false&disable_occlusion=true" +
    "#Intent;scheme=https;package=com.google.android.googlequicksearchbox;" +
    "action=android.intent.action.VIEW;" +
    `S.browser_fallback_url=${encodeURIComponent(fallback.toString())};end;`;
}

export function ArViewer({
  projectId,
  title,
  initialAssets,
  posterUrl,
}: {
  projectId: string;
  title: string;
  initialAssets: ArAssets;
  posterUrl: string | null;
}) {
  const [assets, setAssets] = useState(initialAssets);
  const [element, setElement] = useState<ModelViewerElement | null>(null);
  const [launching, setLaunching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/models/${projectId}/assets`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as ArAssets & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "AR assets could not be refreshed.");
        if (active) setAssets(payload);
      })
      .catch((error) => {
        if (active) setMessage(error instanceof Error ? error.message : "AR assets could not be refreshed.");
      });
    return () => { active = false; };
  }, [projectId]);

  function launchAr(event: MouseEvent<HTMLAnchorElement>) {
    if (isIosDevice()) {
      setMessage(null);
      return;
    }

    event.preventDefault();
    if (launching) return;

    setLaunching(true);
    setMessage(null);

    void (async () => {
      try {
        if (/Android/i.test(navigator.userAgent)) {
          if (element?.canActivateAR) {
            await element.activateAR();
          } else {
            openSceneViewer(assets.androidGlb);
          }
          return;
        }
        if (element?.canActivateAR) {
          await element.activateAR();
          return;
        }
        setMessage("Open this page in Safari on iPhone or Chrome on an ARCore Android phone.");
      } catch {
        if (/Android/i.test(navigator.userAgent)) {
          openSceneViewer(assets.androidGlb);
        } else {
          setMessage("AR could not start on this device.");
        }
      } finally {
        setLaunching(false);
      }
    })();
  }

  return (
    <main className="ar-page">
      <header className="ar-header"><Link href="/"><ArrowLeft size={17} /> SnapAR</Link><span><i /> AR READY</span></header>
      <section className="ar-viewer-stage">
        <ModelViewer src={assets.androidGlb} iosSrc={assets.iosUsdz} poster={posterUrl} onReady={setElement} className="ar-model-viewer" />
        <div className="ar-title"><span className="eyebrow">Spatial preview</span><h1>{title}</h1><p><Box size={14} /> Drag to rotate · Pinch to zoom</p></div>
      </section>
      <section className="ar-action-sheet">
        <div><span className="ar-device-icon"><Smartphone size={22} /></span><span><strong>View at true scale</strong><small>Place this model on a detected surface.</small></span></div>
        <QuickLookLink
          className="button button-primary button-wide ar-launch"
          href={assets.iosUsdz}
          onClick={launchAr}
          aria-busy={launching}
          aria-disabled={launching}
        >
          {launching ? <Loader2 className="spin" size={19} /> : <ScanLine size={19} />}
          {launching ? "Starting AR…" : "View in AR"}
        </QuickLookLink>
        {message && <p className="ar-fallback"><TriangleAlert size={16} /> {message}</p>}
      </section>
    </main>
  );
}
