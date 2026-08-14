"use client";

import { ScanLine } from "lucide-react";
import ReactDOM from "react-dom";
import { useState } from "react";
import {
  ModelViewer,
  type ModelViewerElement,
} from "@/components/model/model-viewer";
import { MODEL_VIEWER_SRC } from "@/lib/cdn";

export function PublicArViewer({
  src,
  iosSrc,
  name,
}: {
  src: string;
  iosSrc: string;
  name: string;
}) {
  const [viewer, setViewer] = useState<ModelViewerElement | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  ReactDOM.preinitModule(MODEL_VIEWER_SRC, {
    crossOrigin: "anonymous",
  });
  ReactDOM.preload(src, {
    as: "fetch",
    crossOrigin: "anonymous",
    fetchPriority: "high",
  });

  function openQuickLook() {
    const anchor = document.createElement("a");
    const image = document.createElement("img");
    anchor.rel = "ar";
    anchor.href = new URL(iosSrc, window.location.href).toString();
    anchor.style.position = "fixed";
    anchor.style.width = "1px";
    anchor.style.height = "1px";
    anchor.style.left = "-10px";
    anchor.style.opacity = "0";
    anchor.style.pointerEvents = "none";
    image.alt = "";
    image.src =
      "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
    anchor.appendChild(image);
    document.body.appendChild(anchor);
    anchor.click();
    window.setTimeout(() => anchor.remove(), 30000);
  }

  function openSceneViewer() {
    const pageUrl = new URL(window.location.href);
    const modelUrl = new URL(src, pageUrl);
    const params = new URLSearchParams(modelUrl.search);

    pageUrl.hash = "model-viewer-no-ar-fallback";
    modelUrl.hash = "";
    params.set("mode", "ar_preferred");
    params.set("disable_occlusion", "true");

    const intent =
      `intent://arvr.google.com/scene-viewer/1.2?${params.toString()}` +
      `&file=${encodeURIComponent(modelUrl.toString())}` +
      "#Intent;scheme=https;package=com.google.android.googlequicksearchbox;" +
      "action=android.intent.action.VIEW;" +
      `S.browser_fallback_url=${encodeURIComponent(pageUrl.toString())};end;`;

    window.location.href = intent;
  }

  async function openAr() {
    const userAgent = navigator.userAgent;
    const isIos =
      /iPhone|iPad|iPod/i.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    setMessage(null);

    if (/Android/i.test(userAgent)) {
      openSceneViewer();
      return;
    }

    if (isIos) {
      if (viewer?.canActivateAR) {
        try {
          await viewer.activateAR();
          return;
        } catch {
          // The direct Quick Look link below is the iOS fallback.
        }
      }

      openQuickLook();
      return;
    }

    if (!viewer) {
      setMessage(
        "AR горимыг iPhone эсвэл Android утаснаас шууд нээх боломжтой.",
      );
      return;
    }

    if (!viewer.canActivateAR) {
      setMessage(
        "Энэ төхөөрөмж AR горим дэмжихгүй байна. 3D загварыг дэлгэц дээр эргүүлж үзэх боломжтой.",
      );
      return;
    }

    try {
      setMessage(null);
      await viewer.activateAR();
    } catch {
      setMessage(
        "AR горим нээгдсэнгүй. Chrome эсвэл Safari хөтчөөр дахин оролдоорой.",
      );
    }
  }

  return (
    <>
      <ModelViewer
        src={src}
        iosSrc={iosSrc}
        ar
        autoRotate
        className="public-detail-viewer"
        onElement={setViewer}
      />
      <div className="public-ar-control" id="ar-action">
        {message && <p role="status">{message}</p>}
        <button
          className="public-ar-button"
          type="button"
          onClick={openAr}
          aria-label={`${name} загварыг бодит орчинд AR-аар харах`}
        >
          <ScanLine size={19} />
          AR-аар шууд харах
        </button>
      </div>
    </>
  );
}
