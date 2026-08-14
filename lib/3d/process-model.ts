import { createAdminClient } from "@/lib/supabase/admin";
import { convertGlbToUsdz } from "@/lib/3d/convert-usdz";
import { formatModelAnalysis } from "@/lib/3d/analyze-model";
import { optimizeGlb } from "@/lib/3d/optimize-glb";
import { downloadObject } from "@/lib/r2/download";
import { uploadBuffer } from "@/lib/r2/upload";
import type {
  OptimizationStatus,
  Project,
  ProjectUpdate,
} from "@/types/project";

const MB = 1024 * 1024;

function evaluateSize(
  size: number,
  platform: "web" | "android" | "ios",
): OptimizationStatus {
  if (platform === "ios") {
    if (size <= 20 * MB) return "excellent";
    if (size <= 25 * MB) return "good";
    return "large";
  }
  if (size <= 10 * MB) return "excellent";
  if (size <= 25 * MB) return "good";
  return "large";
}

async function updateClaimedProject(
  projectId: string,
  workerId: string,
  patch: ProjectUpdate,
) {
  const { data, error } = await createAdminClient()
    .from("projects")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("processing_worker_id", workerId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`Could not update processing state: ${error.message}`);
  if (!data) throw new Error("The processing claim was lost or the model was deleted.");
}

export async function processModelProject(project: Project, workerId: string) {
  if (!project.original_glb_key) {
    throw new Error("The original GLB key is missing.");
  }

  const prefix = `models/${project.id}`;
  const webKey = `${prefix}/web.glb`;
  const androidKey = `${prefix}/android-ar.glb`;
  const iosKey = `${prefix}/ios-ar.usdz`;

  const original = await downloadObject(project.original_glb_key);
  if (project.original_glb_size && original.byteLength !== project.original_glb_size) {
    console.warn(
      `[model-processor:${project.id}] original size changed from ${project.original_glb_size} to ${original.byteLength} bytes`,
    );
  }

  const optimized = await optimizeGlb(original);
  console.info(
    `[model-processor:${project.id}] before: ${formatModelAnalysis(optimized.before)}`,
  );
  console.info(
    `[model-processor:${project.id}] after (${optimized.level}): ${formatModelAnalysis(optimized.after)}`,
  );

  const [webUpload, androidUpload] = await Promise.all([
    uploadBuffer(webKey, optimized.webGlb, "model/gltf-binary"),
    uploadBuffer(androidKey, optimized.androidGlb, "model/gltf-binary"),
  ]);

  await updateClaimedProject(project.id, workerId, {
    status: "converting",
    web_glb_key: webUpload.key,
    web_glb_size: webUpload.size,
    android_glb_key: androidUpload.key,
    android_glb_size: androidUpload.size,
    glb_key: webUpload.key,
    triangle_count: optimized.after.triangleCount,
    analysis_before: optimized.before,
    analysis_after: optimized.after,
    web_optimization_status: evaluateSize(webUpload.size, "web"),
    android_optimization_status: evaluateSize(androidUpload.size, "android"),
    optimization_warnings: optimized.warnings,
    processing_error: null,
    error_message: null,
  });

  const usdz = await convertGlbToUsdz(optimized.conversionGlb);
  const warnings = [...optimized.warnings];
  if (usdz.byteLength > 25 * MB) {
    warnings.push(
      `iOS USDZ is ${(usdz.byteLength / MB).toFixed(1)} MB (desired maximum: 25 MB).`,
    );
  }
  const iosUpload = await uploadBuffer(iosKey, usdz, "model/vnd.usdz+zip");

  await updateClaimedProject(project.id, workerId, {
    status: "ready",
    ios_usdz_key: iosUpload.key,
    ios_usdz_size: iosUpload.size,
    usdz_key: iosUpload.key,
    ios_optimization_status: evaluateSize(iosUpload.size, "ios"),
    optimization_warnings: warnings,
    processing_error: null,
    error_message: null,
    processing_completed_at: new Date().toISOString(),
    processing_worker_id: null,
    processing_claimed_at: null,
  });
}

export async function failModelProcessing(
  projectId: string,
  workerId: string,
  error: unknown,
) {
  const raw = error instanceof Error ? error.message : "Unknown processing failure";
  const message = raw.slice(0, 2_000);
  const { error: updateError } = await createAdminClient()
    .from("projects")
    .update({
      status: "failed",
      processing_error: message,
      error_message: message,
      processing_worker_id: null,
      processing_claimed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("processing_worker_id", workerId);
  if (updateError) {
    console.error(`[model-processor:${projectId}] could not persist failure`, updateError);
  }
}

export async function claimModelProcessingJob(workerId: string) {
  const { data, error } = await createAdminClient().rpc(
    "claim_model_processing_job",
    { p_worker_id: workerId },
  );
  if (error) throw new Error(`Could not claim processing job: ${error.message}`);
  return data[0] ?? null;
}

export async function renewModelProcessingClaim(projectId: string, workerId: string) {
  const { error } = await createAdminClient()
    .from("projects")
    .update({ processing_claimed_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("processing_worker_id", workerId);
  if (error) throw new Error(`Could not renew processing claim: ${error.message}`);
}
