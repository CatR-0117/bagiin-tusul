"use client";

import { ScanLine } from "lucide-react";
import { useState } from "react";
import {
  ModelViewer,
  type ModelViewerElement,
} from "@/components/model/model-viewer";

export function PublicArViewer({
  src,
  name,
}: {
  src: string;
  name: string;
}) {
  const [viewer, setViewer] = useState<ModelViewerElement | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function openAr() {
    if (!viewer) return;

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
        ar
        autoRotate
        className="public-detail-viewer"
        onReady={setViewer}
      />
      <div className="public-ar-control" id="ar-action">
        {message && <p role="status">{message}</p>}
        <button
          className="public-ar-button"
          type="button"
          onClick={openAr}
          disabled={!viewer}
          aria-label={`${name} загварыг бодит орчинд AR-аар харах`}
        >
          <ScanLine size={19} />
          {viewer ? "AR-аар харах" : "AR бэлдэж байна…"}
        </button>
      </div>
    </>
  );
}
