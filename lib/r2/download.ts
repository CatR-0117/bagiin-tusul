import { isR2Configured } from "@/lib/config";
import { createDownloadUrl } from "@/lib/r2/presign";
import type { Project, ProjectAssetUrls } from "@/types/project";

export function localAssetUrl(key: string) {
  if (key === "demo/model.glb") return "/demo/model.glb";
  if (key === "demo/source.avif") return "/ar-coffee-table.avif";
  return `/api/mock-object?key=${encodeURIComponent(key)}`;
}

export async function getObjectUrl(key: string | null) {
  if (!key) return null;
  if (key.startsWith("demo/") || !isR2Configured()) return localAssetUrl(key);
  return createDownloadUrl(key);
}

export async function getProjectAssetUrls(
  project: Project,
): Promise<ProjectAssetUrls> {
  const [sourceImageUrl, glbUrl, usdzUrl, thumbnailUrl] = await Promise.all([
    getObjectUrl(project.source_image_key),
    getObjectUrl(project.glb_key),
    getObjectUrl(project.usdz_key),
    getObjectUrl(project.thumbnail_key ?? project.source_image_key),
  ]);
  return { sourceImageUrl, glbUrl, usdzUrl, thumbnailUrl };
}

