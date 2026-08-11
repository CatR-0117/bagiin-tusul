"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Camera, Download, RotateCcw, Smartphone } from "lucide-react";
import ModelViewer, { type ModelViewerHandle } from "./ModelViewer";
import QrCode from "./QrCode";
import { absoluteUrl, modelUrls, usePlatform, type Platform } from "@/lib/models";
import type { PublicTask } from "@/lib/meshy";
import type { ManualModelMeta } from "@/lib/manual-models";

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

const noopSubscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export default function ArViewer({
  id,
  initial,
  manual,
  pageUrl,
  autoLaunch,
}: {
  id: string;
  initial: PublicTask | null;
  manual: ManualModelMeta | null;
  pageUrl: string;
  autoLaunch: boolean;
}) {
  const urls = modelUrls(id);
  const viewer = useRef<ModelViewerHandle>(null);

  const [task, setTask] = useState<PublicTask | null>(initial);
  const [arStatus, setArStatus] = useState<string>("not-presenting");
  const [note, setNote] = useState<string | null>(null);
  const [autoOpening, setAutoOpening] = useState(false);
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    clientReady,
    serverReady,
  );
  const platform = usePlatform();
  const ready = Boolean(manual) || task?.status === "SUCCEEDED";
  const failed = task?.status === "FAILED" || task?.status === "CANCELED";
  const hasIosAsset = !manual || manual.hasUsdz;

  // Загвар бэлэн болтол төлөвийг тандана.
  useEffect(() => {
    if (manual) return;
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
  }, [id, manual, task?.status]);

  const launchIos = useCallback(() => {
    window.sessionStorage.setItem(`snapar.quick-look.${id}`, "opened");
    window.location.assign(urls.usdz);
  }, [id, urls.usdz]);

  // QR-аар орсон iPhone хэрэглэгчийг GLB viewer ачаалуулахгүйгээр Quick Look
  // руу шууд шилжүүлнэ. Safari автомат шилжилтийг хоригловол том товч үлдэнэ.
  useEffect(() => {
    if (!autoLaunch || platform !== "ios" || !ready || !hasIosAsset) return;
    const key = `snapar.quick-look.${id}`;
    if (window.sessionStorage.getItem(key) === "opened") return;

    setAutoOpening(true);
    const timer = window.setTimeout(launchIos, 450);
    return () => window.clearTimeout(timer);
  }, [autoLaunch, hasIosAsset, id, launchIos, platform, ready]);

  const openAr = useCallback(() => {
    if (platform === "ios") {
      if (manual && !manual.hasUsdz) {
        setNote("iPhone AR-д USDZ файл хэрэгтэй. GLB болон USDZ-ээ хамтад нь оруулна уу.");
      } else {
        launchIos();
      }
      return;
    }
    if (viewer.current?.canActivateAR()) {
      viewer.current.activateAR();
      return;
    }
    // model-viewer AR-ыг идэвхжүүлж чадахгүй бол шууд файл руу шилжинэ.
    if (platform === "android") {
      const file = absoluteUrl(urls.glb);
      window.location.href =
        `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(file)}` +
        `&mode=ar_preferred&resizable=false#Intent;scheme=https;` +
        `package=com.google.ar.core;action=android.intent.action.VIEW;end;`;
    } else {
      setNote("AR горим зөвхөн iPhone эсвэл Android утсан дээр ажиллана.");
    }
  }, [launchIos, manual, platform, urls.glb]);

  return (
    <div className="ar-standalone">
      <header>
        <Link href="/" className="ar-standalone-brand">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          SnapAR
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
      ) : !hydrated ? (
        <div className="ar-standalone-state">
          <span className="ar-standalone-spinner" aria-hidden="true" />
          <h1>Төхөөрөмж таньж байна</h1>
          <p>Танд тохирох AR горимыг бэлтгэж байна…</p>
        </div>
      ) : platform === "ios" ? (
        <main className="ar-ios-entry">
          {hasIosAsset ? (
            <>
              <span className="ar-ios-icon" aria-hidden="true">
                <Camera />
              </span>
              <span className="ar-ios-kicker">IPHONE · QUICK LOOK</span>
              <h1>{autoOpening ? "AR нээж байна…" : "AR-д бэлэн боллоо"}</h1>
              <p>
                Камер нээгдсэний дараа утсаа аажим хөдөлгөж гадаргуу илрүүлээд
                загвараа байрлуулаарай.
              </p>
              <a
                className="ar-standalone-cta"
                href={urls.usdz}
                onClick={(event) => {
                  event.preventDefault();
                  launchIos();
                }}
              >
                <Smartphone size={19} /> AR-Г ШУУД НЭЭХ
              </a>
              <small>Автоматаар нээгдэхгүй бол дээрх товчийг нэг удаа дарна уу.</small>
            </>
          ) : (
            <>
              <span className="ar-ios-icon is-warning" aria-hidden="true">
                <Smartphone />
              </span>
              <span className="ar-ios-kicker">IPHONE · USDZ ШААРДЛАГАТАЙ</span>
              <h1>iPhone AR файл дутуу байна</h1>
              <p>
                Энэ загварт USDZ хувилбар байхгүй. Website-д GLB болон USDZ
                файлаа хамтад нь оруулаад шинэ QR код уншуулна уу.
              </p>
              <Link href="/" className="ar-standalone-cta">
                ФАЙЛ ОРУУЛАХ
              </Link>
            </>
          )}
        </main>
      ) : (
        <>
          <div className="ar-standalone-stage">
            <ModelViewer
              ref={viewer}
              src={urls.glb}
              iosSrc={!manual || manual.hasUsdz ? urls.usdz : undefined}
              poster={manual ? undefined : urls.poster}
              alt="AR-д бэлэн 3D загвар"
              ar
              arScale="auto"
              shadowIntensity={0.28}
              shadowSoftness={0.18}
              autoRotate={arStatus !== "session-started"}
              onArStatus={setArStatus}
              onError={setNote}
              className="ar-standalone-viewer"
            />
          </div>

          <div className="ar-standalone-panel">
            {platform === "desktop" && pageUrl && (
              <div className="ar-standalone-qr">
                <QrCode value={pageUrl} size={188} />
                <div>
                  <b>Утсаараа уншуулна уу</b>
                  <span>QR код таны утсан дээр энэ загварын AR хуудсыг нээнэ.</span>
                </div>
              </div>
            )}
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
              {(!manual || manual.hasUsdz) && (
                <a href={urls.usdzDownload}>
                  <Download size={14} /> USDZ
                </a>
              )}
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
