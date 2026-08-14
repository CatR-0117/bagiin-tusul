import type { Document } from "@gltf-transform/core";
import { inspect } from "@gltf-transform/functions";
import type { ModelAnalysis } from "@/types/project";

function parseResolution(value: string) {
  const match = /^(\d+)x(\d+)$/i.exec(value.trim());
  return match ? { width: Number(match[1]), height: Number(match[2]) } : null;
}

export function analyzeDocument(
  document: Document,
  fileSize: number,
): ModelAnalysis {
  const report = inspect(document);
  let largestTextureWidth: number | null = null;
  let largestTextureHeight: number | null = null;
  let largestTexturePixels = -1;

  for (const texture of report.textures.properties) {
    const resolution = parseResolution(texture.resolution);
    if (!resolution) continue;
    const pixels = resolution.width * resolution.height;
    if (pixels <= largestTexturePixels) continue;
    largestTexturePixels = pixels;
    largestTextureWidth = resolution.width;
    largestTextureHeight = resolution.height;
  }

  return {
    fileSize,
    triangleCount: report.meshes.properties.reduce(
      (total, mesh) => total + mesh.glPrimitives,
      0,
    ),
    meshCount: report.meshes.properties.length,
    materialCount: report.materials.properties.length,
    textureCount: report.textures.properties.length,
    largestTextureWidth,
    largestTextureHeight,
  };
}

export function formatModelAnalysis(analysis: ModelAnalysis) {
  const texture = analysis.largestTextureWidth
    ? `${analysis.largestTextureWidth}x${analysis.largestTextureHeight}`
    : "none";
  return [
    `${(analysis.fileSize / 1024 / 1024).toFixed(1)} MB`,
    `${analysis.triangleCount.toLocaleString()} triangles`,
    `${analysis.meshCount} meshes`,
    `${analysis.materialCount} materials`,
    `${analysis.textureCount} textures`,
    `${texture} max texture`,
  ].join(", ");
}
