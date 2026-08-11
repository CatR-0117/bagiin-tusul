"use client";

import Link from "next/link";
import Image from "next/image";
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
import {
  modelUrls,
  sceneViewerIntent,
  usePlatform,
  type Platform,
} from "@/lib/models";
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
    "Загварыг чирж шал, ширээний илэрсэн гадаргуу дээр тавина",
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
  initialPlatform,
}: {
  id: string;
  initial: PublicTask | null;
  manual: ManualModelMeta | null;
  pageUrl: string;
  initialPlatform: Platform;
}) {
  const urls = modelUrls(id, manual ?? undefined);
  const viewer = useRef<ModelViewerHandle>(null);

  const [task, setTask] = useState<PublicTask | null>(initial);
  const [arStatus, setArStatus] = useState<string>("not-presenting");
  const [note, setNote] = useState<string | null>(null);
  const [generatedArReady, setGeneratedArReady] = useState(false);
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    clientReady,
    serverReady,
  );
  const platform = usePlatform(initialPlatform);
  const ready = Boolean(manual) || task?.status === "SUCCEEDED";
  const failed = task?.status === "FAILED" || task?.status === "CANCELED";
  const hasGlb = !manual || manual.hasGlb !== false;
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

  const openAr = useCallback(() => {
    if (platform === "ios") {
      // Хадгалсан USDZ-тэй үед iOS салбар нь Apple-ийн шаарддаг `rel="ar"`
      // холбоосыг шууд render хийдэг. Энд зөвхөн runtime-д USDZ үүсгэдэг
      // model-viewer урсгал орж ирнэ.
      const generator = viewer.current;
      if (!generator) {
        setNote("AR үзүүлэгч ачаалагдсангүй. Хуудсаа дахин ачаална уу.");
        return;
      }
      setNote(null);
      generator.activateAR();
      return;
    }
    // Scene Viewer-ийн Depth occlusion нь гүний мэдээлэл муу үед загварыг
    // бүхэлд нь нэвт харагдуулдаг. Explicit intent-ээр уг горимыг унтраана.
    if (platform === "android") {
      if (!hasGlb) {
        setNote("Энэ USDZ загвар зөвхөн iPhone AR-д ажиллана. Android-д GLB файл хэрэгтэй.");
        return;
      }
      if (viewer.current?.canActivateAR()) {
        viewer.current.activateAR();
        return;
      }
      window.location.href = sceneViewerIntent(urls.glb);
      return;
    }
    if (viewer.current?.canActivateAR()) {
      viewer.current.activateAR();
      return;
    }
    setNote("AR горим зөвхөн iPhone эсвэл Android утсан дээр ажиллана.");
  }, [hasGlb, platform, urls.glb]);

  return (
    <div className="ar-standalone">
      <header>
        <Link href="/" className="ar-standalone-brand">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          SnapAR
        </Link>
        <span className="ar-standalone-format">
          {platform === "ios"
            ? "IPHONE · USDZ"
            : platform === "android"
              ? "ANDROID · GLB"
              : "GLB · USDZ"}
        </span>
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
              <h1>AR-д бэлэн боллоо</h1>
              <p>
                Камер нээгдсэний дараа утсаа аажим хөдөлгөж гадаргуу илрүүлээд
                загвараа байрлуулаарай.
              </p>
              <a
                className="ar-standalone-cta quick-look-link"
                href={urls.usdz}
                rel="ar"
                aria-label="AR-г шууд нээх"
              >
                <Image
                  className="ar-quick-look-trigger-image"
                  src="/ar-coffee-table.avif"
                  width={22}
                  height={22}
                  alt=""
                />
              </a>
              <small>
                Дээрх товчийг нэг удаа дарахад файл татахгүйгээр iPhone Quick
                Look нээгдэнэ.
              </small>
            </>
          ) : (
            <>
              <div className="ar-ios-generator" aria-hidden="true">
                <ModelViewer
                  ref={viewer}
                  src={urls.glb}
                  alt="iPhone AR-д бэлтгэж буй 3D загвар"
                  ar
                  arModes="quick-look"
                  arScale="auto"
                  cameraControls={false}
                  onLoad={() => {
                    setGeneratedArReady(true);
                    setNote(null);
                  }}
                  onError={setNote}
                />
              </div>
              <span className="ar-ios-icon" aria-hidden="true">
                {generatedArReady ? <Camera /> : <Smartphone />}
              </span>
              <span className="ar-ios-kicker">IPHONE · AUTO USDZ</span>
              <h1>
                {generatedArReady ? "AR-д бэлэн боллоо" : "AR бэлтгэж байна…"}
              </h1>
              <p>
                Оруулсан GLB загварыг iPhone Quick Look-д автоматаар бэлтгэнэ.
                Бэлэн болмогц доорх товчийг дарна уу.
              </p>
              <button
                className="ar-standalone-cta"
                onClick={openAr}
                disabled={!generatedArReady}
              >
                <Smartphone size={19} />
                {generatedArReady ? "AR-Г ШУУД НЭЭХ" : "БЭЛТГЭЖ БАЙНА…"}
              </button>
              <small>
                Эхний удаа загварын хэмжээнээс шалтгаалан хэдэн секунд зарцуулж
                болно.
              </small>
              {note && <span className="ar-ios-note">{note}</span>}
            </>
          )}
        </main>
      ) : (
        <>
          <div className="ar-standalone-stage">
            {hasGlb ? (
              <ModelViewer
                ref={viewer}
                src={urls.glb}
                iosSrc={!manual || manual.hasUsdz ? urls.usdz : undefined}
                poster={manual ? undefined : urls.poster}
                alt="AR-д бэлэн 3D загвар"
                ar
                arScale="auto"
                arModes={platform === "android" ? "webxr" : undefined}
                autoRotate={arStatus !== "session-started"}
                onArStatus={setArStatus}
                onError={setNote}
                className="ar-standalone-viewer"
              />
            ) : (
              <div className="ar-standalone-state ar-usdz-only-state">
                <Smartphone aria-hidden="true" />
                <h1>USDZ · iPhone AR</h1>
                <p>QR кодыг iPhone-оор уншуулж Quick Look-д нээнэ үү.</p>
              </div>
            )}
          </div>

          <div className="ar-standalone-panel">
            <span className={`ar-device-mode ar-device-mode-${platform}`}>
              {platform === "android"
                ? "ANDROID ТАНИГДЛАА · GLB SCENE VIEWER"
                : "КОМПЬЮТЕР · QR-ЭЭР УТАС РУУ ШИЛЖҮҮЛНЭ"}
            </span>
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
              {hasGlb && (
                <a href={urls.glbDownload}>
                  <Download size={14} /> GLB
                </a>
              )}
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
