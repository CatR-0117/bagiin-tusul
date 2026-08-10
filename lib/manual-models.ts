import { env } from "cloudflare:workers";

export type ManualModelMeta = {
  id: string;
  name: string;
  hasUsdz: boolean;
  createdAt: number;
  /** Vercel Blob backend ашиглах үед нийтийн model URL-ууд. */
  glbUrl?: string;
  usdzUrl?: string;
};

export const MANUAL_MODEL_PREFIX = "upload_";

export function isManualModelId(id: string) {
  return /^upload_[0-9a-f-]{20,}$/i.test(id);
}

export function manualModelKey(id: string, file: string) {
  return `manual/${id}/${file}`;
}

export function getModelBucket(): R2Bucket {
  if (!env.MODELS) {
    throw new Error("3D model storage is unavailable.");
  }
  return env.MODELS;
}

export async function getManualModelMeta(
  id: string,
): Promise<ManualModelMeta | null> {
  if (!isManualModelId(id)) return null;

  if (process.env.VERCEL) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
    const { list } = await import("@vercel/blob");
    const pathname = manualModelKey(id, "meta.json");
    const result = await list({ prefix: pathname, limit: 1 });
    const metaBlob = result.blobs.find((blob) => blob.pathname === pathname);
    if (!metaBlob) return null;
    const response = await fetch(metaBlob.url, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as ManualModelMeta;
  }

  const object = await getModelBucket().get(manualModelKey(id, "meta.json"));
  if (!object) return null;

  try {
    return (await new Response(object.body).json()) as ManualModelMeta;
  } catch {
    return null;
  }
}
