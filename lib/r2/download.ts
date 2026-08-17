import { GetObjectCommand } from "@aws-sdk/client-s3";
import { isR2Configured } from "@/lib/config";
import { getR2BucketName, getR2Client } from "@/lib/r2/client";
import { createDownloadUrl, createInlineDownloadUrl } from "@/lib/r2/presign";
import type { Project, ProjectAssetUrls } from "@/types/project";

export function localAssetUrl(key: string) {
  if (key === "demo/model.glb") return "/demo/model.glb";
  if (key === "demo/sofa.glb") return "/models/sofa.glb";
  if (key === "demo/sofa.usdz") return "/ar-assets/sofa/model.usdz?v=hq-1024";
  if (key === "demo/source.avif") return "/ar-coffee-table.avif";
  return `/api/mock-object?key=${encodeURIComponent(key)}`;
}

export async function getObjectUrl(key: string | null) {
  if (!key) return null;
  if (key.startsWith("demo/") || !isR2Configured()) return localAssetUrl(key);
  return createDownloadUrl(key);
}

async function getInlineObjectUrl(key: string | null, filename: string) {
  if (!key) return null;
  if (key.startsWith("demo/") || !isR2Configured()) return localAssetUrl(key);
  return createInlineDownloadUrl(key, 3600, filename);
}

export async function downloadObject(key: string) {
  const response = await getR2Client().send(
    new GetObjectCommand({ Bucket: getR2BucketName(), Key: key }),
  );
  if (!response.Body) throw new Error(`R2 object is empty: ${key}`);
  return new Uint8Array(await response.Body.transformToByteArray());
}

export async function getProjectAssetUrls(
  project: Project,
): Promise<ProjectAssetUrls> {
  const webKey = project.web_glb_key ?? project.glb_key;
  const androidKey = project.android_glb_key ?? webKey;
  const iosKey = project.ios_usdz_key ?? project.usdz_key;
  const [
    sourceImageUrl,
    originalGlbUrl,
    webGlbUrl,
    androidGlbUrl,
    iosUsdzUrl,
    thumbnailUrl,
  ] = await Promise.all([
    getObjectUrl(project.source_image_key),
    getInlineObjectUrl(project.original_glb_key, "original.glb"),
    getInlineObjectUrl(webKey, "web.glb"),
    getInlineObjectUrl(androidKey, "android-ar.glb"),
    getInlineObjectUrl(iosKey, "ios-ar.usdz"),
    getObjectUrl(project.thumbnail_key ?? project.source_image_key),
  ]);
  return {
    sourceImageUrl,
    originalGlbUrl,
    webGlbUrl,
    androidGlbUrl,
    iosUsdzUrl,
    glbUrl: webGlbUrl,
    usdzUrl: iosUsdzUrl,
    thumbnailUrl,
  };
}
