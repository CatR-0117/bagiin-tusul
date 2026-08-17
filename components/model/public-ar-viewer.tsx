"use client";

import { QrCode, ScanLine } from "lucide-react";
import ReactDOM from "react-dom";
import { useState, useSyncExternalStore, type MouseEvent } from "react";
import { QuickLookLink } from "@/components/ar/quick-look-link";
import {
  ModelViewer,
  type ModelViewerElement,
} from "@/components/model/model-viewer";
import { MODEL_VIEWER_SRC } from "@/lib/cdn";
import { platformFromBrowser } from "@/lib/platform";

const noopSubscribe = () => () => {};

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
  const platform = useSyncExternalStore(
    noopSubscribe,
    platformFromBrowser,
    () => "desktop",
  );

  ReactDOM.preinitModule(MODEL_VIEWER_SRC, {
    crossOrigin: "anonymous",
  });
  ReactDOM.preload(src, {
    as: "fetch",
    crossOrigin: "anonymous",
    fetchPriority: "high",
  });

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

  function openAr(event: MouseEvent<HTMLAnchorElement>) {
    const userAgent = navigator.userAgent;
    const isIos =
      /iPhone|iPad|iPod/i.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    setMessage(null);

    if (isIos) {
      // Let Safari handle the real, user-tapped `rel="ar"` link below.
      return;
    }

    event.preventDefault();

    if (/Android/i.test(userAgent)) {
      openSceneViewer();
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
      void Promise.resolve(viewer.activateAR()).catch(() => {
        setMessage(
          "AR горим нээгдсэнгүй. Chrome эсвэл Safari хөтчөөр дахин оролдоорой.",
        );
      });
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
        {platform === "desktop" ? (
          <a className="public-ar-button" href="#qr">
            <QrCode size={19} />
            QR кодоор утсандаа нээх
          </a>
        ) : (
          <QuickLookLink
            className="public-ar-button"
            href={iosSrc}
            onClick={openAr}
            aria-label={`${name} загварыг бодит орчинд AR-аар харах`}
          >
            <ScanLine size={19} />
            {platform === "ios" ? "iPhone AR-д харах" : "Android AR-д харах"}
          </QuickLookLink>
        )}
      </div>
    </>
  );
}
