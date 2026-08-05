"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Download, RotateCcw, Smartphone } from "lucide-react";
import ModelViewer, { type ModelViewerHandle } from "./ModelViewer";
import { absoluteUrl, modelUrls, usePlatform, type Platform } from "@/lib/models";
import type { PublicTask } from "@/lib/meshy";

const HINTS: Record<Platform, string[]> = {
  ios: [
    "«Бодит орчинд байрлуулах» товчийг дарна",
    "Камерын зөвшөөрөл өгнө",
    "Утсаа шалан дээр аажим хөдөлгөж гадаргуу илрүүлнэ",
  ],
  android: [
    "«Бодит орчинд байрлуулах» товчийг дарна",
    "Google Play Services for AR суусан байх шаардлагатай",
    "Гадаргуу илэрмэгц дэлгэц дээр товшиж байрлуулна",
  ],
  desktop: [
    "AR горим зөвхөн утсан дээр ажиллана",
    "Хуудасны QR кодыг утсаараа уншуулна уу",
    "Компьютер дээр 3D загварыг чирж эргүүлж болно",
  ],
};

export default function ArViewer({
  id,
  initial,
}: {
  id: string;
  initial: PublicTask | null;
}) {
  const urls = modelUrls(id);
  const viewer = useRef<ModelViewerHandle>(null);

  const [task, setTask] = useState<PublicTask | null>(initial);
  const [arStatus, setArStatus] = useState<string>("not-presenting");
  const [note, setNote] = useState<string | null>(null);
  const platform = usePlatform();

  // Загвар бэлэн болтол төлөвийг тандана.
  useEffect(() => {
    if (task?.status === "SUCCEEDED" || task?.status === "FAILED") return;

    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/task/${id}`, { cache: "no-store" });
        if (!response.ok) return;
        const next = (await response.json()) as PublicTask;
        setTask(next);
        if (next.status === "SUCCEEDED" || next.status === "FAILED") {
          window.clearInterval(timer);
        }
      } catch {
        /* сүлжээ тасарсан — дараагийн эргэлтэд дахин оролдоно */
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [id, task?.status]);

  const openAr = useCallback(() => {
    if (viewer.current?.canActivateAR()) {
      viewer.current.activateAR();
      return;
    }
    // model-viewer AR-ыг идэвхжүүлж чадахгүй бол шууд файл руу шилжинэ.
    if (platform === "ios") {
      window.location.href = urls.usdz;
    } else if (platform === "android") {
      const file = absoluteUrl(urls.glb);
      window.location.href =
        `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(file)}` +
        `&mode=ar_preferred&resizable=false#Intent;scheme=https;` +
        `package=com.google.ar.core;action=android.intent.action.VIEW;end;`;
    } else {
      setNote("AR горим зөвхөн iPhone эсвэл Android утсан дээр ажиллана.");
    }
  }, [platform, urls.glb, urls.usdz]);

  const ready = task?.status === "SUCCEEDED";
  const failed = task?.status === "FAILED" || task?.status === "CANCELED";

  return (
    <div className="ar-standalone">
      <header>
        <Link href="/" className="ar-standalone-brand">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          MORPH AR
        </Link>
        <span className="ar-standalone-format">GLB · USDZ</span>
      </header>

      {failed ? (
        <div className="ar-standalone-state">
          <h1>Загвар бэлэн болсонгүй</h1>
          <p>{task?.error ?? "Үүсгэлт амжилтгүй боллоо."}</p>
          <Link href="/" className="button button-primary">
            Шинээр үүсгэх
          </Link>
        </div>
      ) : !ready ? (
        <div className="ar-standalone-state">
          <span className="ar-standalone-spinner" aria-hidden="true" />
          <h1>Загвар бэлтгэгдэж байна</h1>
          <p>
            {task ? `${Math.round(task.progress)}%` : "Холбогдож байна…"} · энэ
            хуудсыг нээлттэй үлдээгээрэй
          </p>
        </div>
      ) : (
        <>
          <div className="ar-standalone-stage">
            <ModelViewer
              ref={viewer}
              src={urls.glb}
              iosSrc={urls.usdz}
              poster={urls.poster}
              alt="AR-д бэлэн 3D загвар"
              ar
              arScale="auto"
              autoRotate={arStatus !== "session-started"}
              onArStatus={setArStatus}
              onError={setNote}
              className="ar-standalone-viewer"
            />
          </div>

          <div className="ar-standalone-panel">
            <button className="ar-standalone-cta" onClick={openAr}>
              <Smartphone size={18} />
              Бодит орчинд байрлуулах
            </button>

            <ol className="ar-standalone-hints">
              {HINTS[platform].map((hint, index) => (
                <li key={hint}>
                  <b>0{index + 1}</b>
                  {hint}
                </li>
              ))}
            </ol>

            <div className="ar-standalone-links">
              <a href={urls.glbDownload}>
                <Download size={14} /> GLB
              </a>
              <a href={urls.usdzDownload}>
                <Download size={14} /> USDZ
              </a>
              <button
                onClick={() => {
                  const shot = viewer.current?.screenshot();
                  if (!shot) return;
                  const link = document.createElement("a");
                  link.href = shot;
                  link.download = `morph-ar-${id}.png`;
                  link.click();
                }}
              >
                <Camera size={14} /> Зураг
              </button>
              <button
                onClick={() => {
                  const element = viewer.current?.element();
                  if (element) element.cameraOrbit = "0deg 75deg 105%";
                }}
              >
                <RotateCcw size={14} /> Сэргээх
              </button>
            </div>

            {note && <p className="ar-standalone-note">{note}</p>}
          </div>
        </>
      )}
    </div>
  );
}
