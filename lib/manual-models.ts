import { env } from "cloudflare:workers";

export type ManualModelMeta = {
  id: string;
  name: string;
  hasUsdz: boolean;
  createdAt: number;
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
  const object = await getModelBucket().get(manualModelKey(id, "meta.json"));
  if (!object) return null;

  try {
    return (await new Response(object.body).json()) as ManualModelMeta;
  } catch {
    return null;
  }
}
