"use client";

import { useSyncExternalStore } from "react";
import {
  platformFromBrowser,
  type Platform,
} from "@/lib/platform";

export type { Platform } from "@/lib/platform";

/** Клиент талын туслахууд: файлын хаяг, зураг бэлтгэх, локал сан. */

export type StoredModel = {
  id: string;
  name: string;
  status: "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "CANCELED";
  createdAt: number;
  quality: "fast" | "high";
  /** AI-аар үүсгэсэн эсвэл гараар оруулсан загвар */
  kind?: "image-to-3d" | "multi-image-to-3d" | "manual";
  /** Гараар оруулсан загвар iOS-д зориулсан USDZ хувилбартай эсэх */
  hasUsdz?: boolean;
  /** `false` бол USDZ-only загвар; хуучин бичлэгүүдэд байхгүй байж болно. */
  hasGlb?: boolean;
  /** Vercel Blob руу оруулсан файлыг redirect алгасаж шууд ачаална. */
  glbUrl?: string;
  usdzUrl?: string;
  /** Хэдэн эх зурагнаас үүсгэсэн */
  sourceCount?: number;
  /** Эх зургийн жижигрүүлсэн хувилбар (сангийн жагсаалтад харуулах) */
  thumbnail?: string;
};

const STORE_KEY = "morph-ar.models.v1";

export function modelUrls(
  id: string,
  direct?: Pick<StoredModel, "glbUrl" | "usdzUrl">,
) {
  return {
    glb: direct?.glbUrl ?? `/api/model/${id}/model.glb`,
    usdz: direct?.usdzUrl ?? `/api/model/${id}/model.usdz`,
    poster: `/api/model/${id}/preview.png`,
    glbDownload: `/api/model/${id}/model.glb?dl=1`,
    usdzDownload: `/api/model/${id}/model.usdz?dl=1`,
    arPage: `/ar/${id}`,
  };
}

export function absoluteUrl(path: string) {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}

/**
 * Android Scene Viewer-ийг Depth occlusion-гүйгээр шууд AR горимд нээнэ.
 * Depth map буруу тооцоологдох үед загвар бүхэлдээ нэвт харагдахээс сэргийлнэ.
 */
export function sceneViewerIntent(path: string) {
  const file = absoluteUrl(path);
  const fallback =
    typeof window === "undefined" ? "/" : window.location.href;

  return (
    `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(file)}` +
    `&mode=ar_only&resizable=false&disable_occlusion=true#Intent;scheme=https;` +
    `package=com.google.ar.core;action=android.intent.action.VIEW;` +
    `S.browser_fallback_url=${encodeURIComponent(fallback)};end;`
  );
}

/* ------------------------------- локал сан -------------------------------
 * localStorage бол React-ийн гадна орших "external store" тул
 * useSyncExternalStore-оор уншина. Ингэснээр SSR/hydration зөрөхгүй бөгөөд
 * effect дотор setState дуудах шаардлагагүй болно.
 * ------------------------------------------------------------------------ */

const EMPTY: StoredModel[] = [];

let cache: StoredModel[] | null = null;
const listeners = new Set<() => void>();

function read(): StoredModel[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as StoredModel[];
    return Array.isArray(parsed) ? parsed : EMPTY;
  } catch {
    return EMPTY;
  }
}

function commit(next: StoredModel[]) {
  const trimmed = next.slice(0, 60);
  cache = trimmed;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(trimmed));
  } catch {
    /* localStorage дүүрсэн эсвэл идэвхгүй */
  }
  listeners.forEach((listener) => listener());
  return trimmed;
}

function handleStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== STORE_KEY) return;
  cache = null;
  listeners.forEach((listener) => listener());
}

function subscribeModels(onChange: () => void) {
  listeners.add(onChange);
  if (listeners.size === 1) window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0) {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

export function listModels(): StoredModel[] {
  if (cache === null) cache = read();
  return cache;
}

const serverModels = () => EMPTY;

/** React компонент дотор сангийн жагсаалтыг ажиглах. */
export function useModels(): StoredModel[] {
  return useSyncExternalStore(subscribeModels, listModels, serverModels);
}

export function saveModel(model: StoredModel) {
  return commit([model, ...listModels().filter((item) => item.id !== model.id)]);
}

export function updateModel(id: string, patch: Partial<StoredModel>) {
  const current = listModels();
  const target = current.find((item) => item.id === id);
  // Өөрчлөлт байхгүй бол дэмий дахин render хийхгүй.
  if (
    !target ||
    (Object.keys(patch) as (keyof StoredModel)[]).every(
      (key) => target[key] === patch[key],
    )
  ) {
    return current;
  }
  return commit(
    current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  );
}

export function removeModel(id: string) {
  return commit(listModels().filter((item) => item.id !== id));
}

/* ----------------------------- зураг бэлтгэх -----------------------------
 * ЧУХАЛ: эргүүлэх / тайрах нь ЗӨВХӨН харагдацад биш, Meshy рүү илгээх
 * өгөгдөлд бодитоор хэрэглэгдэнэ. Өмнө нь зөвхөн CSS transform байсан тул
 * хэрэглэгч эргүүлээд илгээхэд эргээгүй загвар ирдэг байсан.
 * ------------------------------------------------------------------------ */

export type Rotation = 0 | 90 | 180 | 270;

export type ImageAnalysis = {
  /** 0–1, дундаж гэрэлтүүлэг */
  brightness: number;
  /** 0–1, ялгарал (хэт хавтгай зураг муу үр дүн өгдөг) */
  contrast: number;
  /** 0–1, объект кадрын хэдэн хувийг эзэлж байгаа ойролцоо утга */
  subjectCoverage: number;
  /** 0–1, дэвсгэр хэр нэг өнгөтэй байгаа (өндөр = цэвэр) */
  backgroundUniformity: number;
};

export type SourceImage = {
  id: string;
  name: string;
  /** Файлаас уншсан анхны хэлбэр (эргүүлээгүй, тайраагүй) */
  original: string;
  /** UI-д харуулах жижиг хувилбар (эргүүлэлт/тайралт хэрэглэсэн) */
  preview: string;
  rotation: Rotation;
  cropped: boolean;
  analysis: ImageAnalysis | null;
};

const MAX_UPLOAD_SIZE = 1536;

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas дэмжигдэхгүй байна.");
  // PNG-ийн тунгалаг хэсгийг цагаанаар дүүргэнэ (JPEG тунгалаг дэмждэггүй).
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  return { canvas, context };
}

async function toBitmap(source: Blob | string): Promise<ImageBitmap> {
  if (typeof source !== "string") return createImageBitmap(source);
  const response = await fetch(source);
  return createImageBitmap(await response.blob());
}

/**
 * Эргүүлэлт, тайралт, хэмжээг бодитоор хэрэглэж JPEG data URI буцаана.
 * Энэ функцын гаралт нь Meshy рүү яг явах өгөгдөл.
 */
export async function renderImage(
  source: string,
  {
    rotation = 0,
    cropped = false,
    maxSize = MAX_UPLOAD_SIZE,
    quality = 0.92,
  }: {
    rotation?: Rotation;
    cropped?: boolean;
    maxSize?: number;
    quality?: number;
  } = {},
): Promise<string> {
  const bitmap = await toBitmap(source);

  try {
    // 1) Тайрах — төвлөрсөн квадрат. Объект голд байгаа зурагт хамгийн тохиромжтой.
    let sx = 0;
    let sy = 0;
    let sw = bitmap.width;
    let sh = bitmap.height;

    if (cropped) {
      const side = Math.min(bitmap.width, bitmap.height);
      sx = Math.round((bitmap.width - side) / 2);
      sy = Math.round((bitmap.height - side) / 2);
      sw = side;
      sh = side;
    }

    // 2) Хэмжээг тааруулах
    const scale = Math.min(1, maxSize / Math.max(sw, sh));
    const dw = Math.max(1, Math.round(sw * scale));
    const dh = Math.max(1, Math.round(sh * scale));

    // 3) Эргүүлэх — 90/270 үед canvas-ын тал солигдоно
    const swap = rotation === 90 || rotation === 270;
    const { canvas, context } = makeCanvas(swap ? dh : dw, swap ? dw : dh);

    context.save();
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate((rotation * Math.PI) / 180);
    context.drawImage(bitmap, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
    context.restore();

    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    bitmap.close();
  }
}

/**
 * Зургийн чанарын бодит шинжилгээ.
 * Жижиг canvas дээр пиксел уншиж гэрэлтүүлэг, ялгарал, дэвсгэрийн цэвэр
 * байдал, объектын эзлэх талбайг тооцоолно.
 */
export async function analyzeImage(source: string): Promise<ImageAnalysis> {
  const bitmap = await toBitmap(source);
  const size = 96;

  try {
    const { canvas, context } = makeCanvas(size, size);
    context.drawImage(bitmap, 0, 0, size, size);
    const { data } = context.getImageData(0, 0, size, size);

    const luma = new Float64Array(size * size);
    let sum = 0;

    for (let i = 0; i < luma.length; i++) {
      const o = i * 4;
      const value =
        (0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]) / 255;
      luma[i] = value;
      sum += value;
    }

    const brightness = sum / luma.length;

    let variance = 0;
    for (let i = 0; i < luma.length; i++) {
      variance += (luma[i] - brightness) ** 2;
    }
    // Стандарт хазайлт ~0.35 бол маш сайн ялгарал гэж үзнэ.
    const contrast = Math.min(1, Math.sqrt(variance / luma.length) / 0.35);

    // Захын пикселүүдийг дэвсгэр гэж үзнэ.
    const edge: number[] = [];
    for (let i = 0; i < size; i++) {
      edge.push(luma[i], luma[(size - 1) * size + i]);
      edge.push(luma[i * size], luma[i * size + size - 1]);
    }
    const edgeMean = edge.reduce((a, b) => a + b, 0) / edge.length;
    const edgeVariance =
      edge.reduce((a, b) => a + (b - edgeMean) ** 2, 0) / edge.length;
    const backgroundUniformity = Math.max(
      0,
      1 - Math.sqrt(edgeVariance) / 0.25,
    );

    // Дэвсгэрээс мэдэгдэхүйц ялгаатай пикселүүдийг объект гэж тооцно.
    let subjectPixels = 0;
    for (let i = 0; i < luma.length; i++) {
      if (Math.abs(luma[i] - edgeMean) > 0.12) subjectPixels++;
    }
    const subjectCoverage = subjectPixels / luma.length;

    canvas.width = 0;
    return { brightness, contrast, subjectCoverage, backgroundUniformity };
  } finally {
    bitmap.close();
  }
}

/** Файлаас эх зураг үүсгэж, урьдчилсан харагдац болон шинжилгээг бэлтгэнэ. */
export async function loadSourceImage(file: File): Promise<SourceImage> {
  const original = await renderImage(
    await blobToDataUri(file),
    { maxSize: MAX_UPLOAD_SIZE },
  );

  const [preview, analysis] = await Promise.all([
    renderImage(original, { maxSize: 512, quality: 0.7 }),
    analyzeImage(original).catch(() => null),
  ]);

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    original,
    preview,
    rotation: 0,
    cropped: false,
    analysis,
  };
}

/** Эргүүлэлт/тайралт өөрчлөгдөхөд урьдчилсан харагдацыг дахин зурна. */
export async function refreshPreview(
  source: SourceImage,
): Promise<SourceImage> {
  const preview = await renderImage(source.original, {
    rotation: source.rotation,
    cropped: source.cropped,
    maxSize: 512,
    quality: 0.7,
  });
  return { ...source, preview };
}

/** Meshy рүү илгээх эцсийн өгөгдлийг бэлтгэнэ. */
export function renderForUpload(source: SourceImage): Promise<string> {
  return renderImage(source.original, {
    rotation: source.rotation,
    cropped: source.cropped,
    maxSize: MAX_UPLOAD_SIZE,
  });
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Файл уншиж чадсангүй."));
    reader.readAsDataURL(blob);
  });
}

/* ------------------------------ төхөөрөмж ------------------------------- */

export function detectPlatform(): Platform {
  return platformFromBrowser();
}

const noopSubscribe = () => () => {};

/**
 * Төхөөрөмжийн төрөл. Сервер дээр үргэлж "desktop" гэж дүрслэгдээд,
 * hydration-ий дараа жинхэнэ утга руу шилжинэ — hydration зөрөхгүй.
 */
export function usePlatform(initialPlatform: Platform = "desktop"): Platform {
  return useSyncExternalStore(
    noopSubscribe,
    detectPlatform,
    () => initialPlatform,
  );
}
