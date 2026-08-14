"use client";

/**
 * Гуравдагч талын браузерын сангуудыг CDN-ээс нэг л удаа ачаалах туслах.
 *
 * Яагаад CDN гэж? `@google/model-viewer` нь ~2 MB, зөвхөн браузерт ажилладаг
 * web component. Үүнийг Cloudflare Worker дээрх серверийн bundle-д оруулах нь
 * утгагүй тул client талд динамикаар ачаална.
 */

const QRCODE_VERSION = "1.5.4";

/** Same-origin copy: third-party CDN latency no longer blocks the 3D viewer. */
export const MODEL_VIEWER_SRC = "/vendor/model-viewer.min.js";

const cache = new Map<string, Promise<void>>();

function once(key: string, run: () => Promise<void>) {
  const existing = cache.get(key);
  if (existing) return existing;
  const promise = run().catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, promise);
  return promise;
}

/** `<model-viewer>` custom element бүртгэгдэх хүртэл хүлээнэ. */
export function loadModelViewer(): Promise<void> {
  return once("model-viewer", async () => {
    if (typeof window === "undefined") return;
    if (!customElements.get("model-viewer")) {
      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(
          `script[data-lib="model-viewer"]`,
        );
        if (existing) {
          existing.addEventListener("load", () => resolve());
          existing.addEventListener("error", () =>
            reject(new Error("model-viewer ачаалагдсангүй")),
          );
          return;
        }
        const script = document.createElement("script");
        script.type = "module";
        script.src = MODEL_VIEWER_SRC;
        script.dataset.lib = "model-viewer";
        script.crossOrigin = "anonymous";
        script.onload = () => resolve();
        script.onerror = () =>
          reject(new Error("model-viewer ачаалагдсангүй. Интернэт холболтоо шалгана уу."));
        document.head.appendChild(script);
      });
    }
    await customElements.whenDefined("model-viewer");
  });
}

type QrCodeLib = {
  toCanvas: (
    canvas: HTMLCanvasElement,
    text: string,
    options?: Record<string, unknown>,
  ) => Promise<void>;
};

declare global {
  interface Window {
    __morphQRCode?: QrCodeLib;
  }
}

/** QR кодын сан. jsDelivr-ийн `+esm` эндпойнтоос ESM хэлбэрээр ирнэ. */
export function loadQrCode(): Promise<QrCodeLib> {
  return once("qrcode", async () => {
    if (typeof window === "undefined") return;
    if (window.__morphQRCode) return;

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.type = "module";
      script.dataset.lib = "qrcode";
      // Динамик import-ыг Vite задлан шинжлэхээс сэргийлж inline module ашиглана.
      // CJS→ESM хөрвүүлэлт нь default эсвэл namespace хэлбэрээр ирж болох тул
      // хоёуланг нь шалгана.
      script.textContent = `
        import * as mod from "https://cdn.jsdelivr.net/npm/qrcode@${QRCODE_VERSION}/+esm";
        const lib = mod?.default?.toCanvas ? mod.default : mod;
        if (typeof lib?.toCanvas === "function") window.__morphQRCode = lib;
        window.dispatchEvent(new Event("morph:qrcode-ready"));
      `;
      const timer = window.setTimeout(
        () => reject(new Error("QR сан ачаалагдсангүй")),
        12000,
      );
      window.addEventListener(
        "morph:qrcode-ready",
        () => {
          window.clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
      document.head.appendChild(script);
    });
  }).then(() => {
    if (!window.__morphQRCode) throw new Error("QR сан ачаалагдсангүй");
    return window.__morphQRCode;
  });
}
