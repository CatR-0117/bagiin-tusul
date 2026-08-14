import {
  dedup,
  meshopt,
  prune,
  simplify,
  textureCompress,
  weld,
} from "@gltf-transform/functions";
import sharp from "sharp";
import { analyzeDocument } from "@/lib/3d/analyze-model";
import {
  getModelIO,
  MeshoptEncoder,
  MeshoptSimplifier,
} from "@/lib/3d/model-io";
import type { ModelAnalysis } from "@/types/project";

const MB = 1024 * 1024;
const ANDROID_TARGET_BYTES = 10 * MB;

export type OptimizationLevel = "ready" | "light" | "normal" | "aggressive";

type OptimizationPlan = {
  level: OptimizationLevel;
  textureSize: number;
  textureQuality: number;
  textureEffort: number;
  targetTriangles: number;
  simplifyError: number;
};

export type OptimizedGlbResult = {
  webGlb: Uint8Array;
  androidGlb: Uint8Array;
  conversionGlb: Uint8Array;
  before: ModelAnalysis;
  after: ModelAnalysis;
  level: OptimizationLevel;
  warnings: string[];
};

const PLANS: Record<OptimizationLevel, OptimizationPlan> = {
  ready: {
    level: "ready",
    textureSize: 2048,
    textureQuality: 90,
    textureEffort: 5,
    targetTriangles: 100_000,
    simplifyError: 0.001,
  },
  light: {
    level: "light",
    textureSize: 2048,
    textureQuality: 86,
    textureEffort: 6,
    targetTriangles: 100_000,
    simplifyError: 0.0015,
  },
  normal: {
    level: "normal",
    textureSize: 2048,
    textureQuality: 82,
    textureEffort: 7,
    targetTriangles: 50_000,
    simplifyError: 0.004,
  },
  aggressive: {
    level: "aggressive",
    textureSize: 1024,
    textureQuality: 78,
    textureEffort: 8,
    targetTriangles: 40_000,
    simplifyError: 0.008,
  },
};

function assertGlb(bytes: Uint8Array) {
  const magic = String.fromCharCode(...bytes.subarray(0, 4));
  if (bytes.byteLength < 20 || magic !== "glTF") {
    throw new Error("The AI provider returned an invalid GLB file.");
  }
}

function initialLevel(size: number): OptimizationLevel {
  if (size < 10 * MB) return "ready";
  if (size <= 25 * MB) return "light";
  if (size <= 50 * MB) return "normal";
  return "aggressive";
}

function candidateLevels(size: number): OptimizationLevel[] {
  const levels: OptimizationLevel[] = ["ready", "light", "normal", "aggressive"];
  return levels.slice(levels.indexOf(initialLevel(size)));
}

async function optimizeWithPlan(
  original: Uint8Array,
  before: ModelAnalysis,
  plan: OptimizationPlan,
) {
  const io = await getModelIO();
  const document = await io.readBinary(original);
  const transforms = [
    dedup(),
    prune({ keepAttributes: false, keepExtras: true }),
    weld(),
  ];

  if (before.triangleCount > plan.targetTriangles) {
    transforms.push(
      simplify({
        simplifier: MeshoptSimplifier,
        ratio: Math.max(0.05, plan.targetTriangles / before.triangleCount),
        error: plan.simplifyError,
        lockBorder: true,
      }),
    );
  }

  transforms.push(
    textureCompress({
      encoder: sharp,
      formats: /(jpeg|jpg|png|webp|avif)/i,
      resize: [plan.textureSize, plan.textureSize],
      quality: plan.textureQuality,
      effort: plan.textureEffort,
      limitInputPixels: true,
    }),
    dedup(),
    prune({ keepAttributes: false, keepExtras: true }),
  );

  await document.transform(...transforms);

  // USDZ conversion uses this compatibility copy before EXT_meshopt_compression.
  const conversionGlb = await io.writeBinary(document);
  await document.transform(meshopt({ encoder: MeshoptEncoder, level: "high" }));
  const optimizedGlb = await io.writeBinary(document);
  const after = analyzeDocument(document, optimizedGlb.byteLength);
  return { optimizedGlb, conversionGlb, after };
}

export async function optimizeGlb(
  original: Uint8Array,
): Promise<OptimizedGlbResult> {
  assertGlb(original);
  const io = await getModelIO();
  let originalDocument;
  try {
    originalDocument = await io.readBinary(original);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown parser error";
    throw new Error(`The generated GLB could not be parsed: ${detail}`);
  }
  const before = analyzeDocument(originalDocument, original.byteLength);
  if (before.meshCount === 0 || before.triangleCount === 0) {
    throw new Error("The generated GLB does not contain renderable triangle geometry.");
  }
  let selected: Awaited<ReturnType<typeof optimizeWithPlan>> | null = null;
  let selectedLevel: OptimizationLevel = initialLevel(original.byteLength);

  for (const level of candidateLevels(original.byteLength)) {
    const candidate = await optimizeWithPlan(original, before, PLANS[level]);
    if (!selected || candidate.optimizedGlb.byteLength < selected.optimizedGlb.byteLength) {
      selected = candidate;
      selectedLevel = level;
    }
    if (candidate.optimizedGlb.byteLength <= ANDROID_TARGET_BYTES) {
      selected = candidate;
      selectedLevel = level;
      break;
    }
  }

  if (!selected) throw new Error("No optimized GLB output was produced.");
  const warnings: string[] = [];
  if (selected.optimizedGlb.byteLength > ANDROID_TARGET_BYTES) {
    warnings.push(
      `Android GLB is ${(selected.optimizedGlb.byteLength / MB).toFixed(1)} MB (preferred maximum: 10 MB).`,
    );
  }
  if (selected.after.triangleCount > 100_000) {
    warnings.push(
      `Optimized model has ${selected.after.triangleCount.toLocaleString()} triangles (preferred maximum: 100,000).`,
    );
  }

  return {
    webGlb: selected.optimizedGlb,
    androidGlb: selected.optimizedGlb,
    conversionGlb: selected.conversionGlb,
    before,
    after: selected.after,
    level: selectedLevel,
    warnings,
  };
}
