"use client";

import Link from "next/link";
import { ArrowLeft, Box, Loader2, ScanLine, Smartphone, TriangleAlert } from "lucide-react";
import { useEffect, useState, useSyncExternalStore, type MouseEvent } from "react";
import { QuickLookLink } from "@/components/ar/quick-look-link";
import { ModelViewer, type ModelViewerElement } from "@/components/model/model-viewer";
import { platformFromBrowser } from "@/lib/platform";

type ArAssets = {
  webGlb: string;
  androidGlb: string;
  iosUsdz: string;
};

const noopSubscribe = () => () => {};

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
  const platform = useSyncExternalStore(
    noopSubscribe,
    platformFromBrowser,
    () => "desktop",
  );

  useEffect(() => {
    let active = true;
    fetch(`/api/models/${projectId}/assets`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as ArAssets & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "AR файлуудыг шинэчилж чадсангүй.");
        if (active) setAssets(payload);
      })
      .catch((error) => {
        if (active) setMessage(error instanceof Error ? error.message : "AR файлуудыг шинэчилж чадсангүй.");
      });
    return () => { active = false; };
  }, [projectId]);

  function launchAr(event: MouseEvent<HTMLAnchorElement>) {
    if (platform === "ios") {
      setMessage(null);
      return;
    }

    event.preventDefault();
    if (launching) return;

    setLaunching(true);
    setMessage(null);

    void (async () => {
      try {
        if (platform === "android") {
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
        setMessage("AR горимыг iPhone Safari эсвэл ARCore дэмждэг Android Chrome-оос нээнэ үү.");
      } catch {
        if (platform === "android") {
          openSceneViewer(assets.androidGlb);
        } else {
          setMessage("Энэ төхөөрөмж дээр AR горимыг эхлүүлж чадсангүй.");
        }
      } finally {
        setLaunching(false);
      }
    })();
  }

  const launchLabel = platform === "ios"
    ? "iPhone AR-д харах"
    : platform === "android"
      ? "Android AR-д харах"
      : "AR зөвхөн утсан дээр ажиллана";

  return (
    <main className="ar-page">
      <header className="ar-header"><Link href="/"><ArrowLeft size={17} /> OBJECT ROOM</Link><span><i /> AR БЭЛЭН</span></header>
      <section className="ar-viewer-stage">
        <ModelViewer src={assets.androidGlb} iosSrc={assets.iosUsdz} poster={posterUrl} onReady={setElement} className="ar-model-viewer" />
        <div className="ar-title"><span className="eyebrow">Орон зайн үзүүлэн</span><h1>{title}</h1><p><Box size={14} /> Чирж эргүүлэх · Чимхэж ойртуулах</p></div>
      </section>
      <section className="ar-action-sheet">
        <div><span className="ar-device-icon"><Smartphone size={22} /></span><span><strong>Бодит хэмжээгээр үзэх</strong><small>Загвараа илрүүлсэн гадаргуу дээр байрлуулаарай.</small></span></div>
        {platform === "desktop" ? (
          <button className="button button-primary button-wide ar-launch" type="button" disabled>
            <Smartphone size={19} /> {launchLabel}
          </button>
        ) : (
          <QuickLookLink
            className="button button-primary button-wide ar-launch"
            href={assets.iosUsdz}
            onClick={launchAr}
            aria-busy={launching}
            aria-disabled={launching}
          >
            {launching ? <Loader2 className="spin" size={19} /> : <ScanLine size={19} />}
            {launching ? "AR эхлүүлж байна…" : launchLabel}
          </QuickLookLink>
        )}
        {message && <p className="ar-fallback"><TriangleAlert size={16} /> {message}</p>}
      </section>
    </main>
  );
}
