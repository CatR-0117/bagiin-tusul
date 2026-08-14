import { getGenerationStatus } from "@/lib/ai/status";
import { getCurrentUser } from "@/lib/auth";
import { isMockAIEnabled } from "@/lib/config";
import { getProjectForUser, updateProject } from "@/lib/projects";
import { uploadRemoteFile } from "@/lib/r2/upload";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  const project = await getProjectForUser(user.id, id);
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });

  if (project.status === "ready" && project.glb_key) {
    return Response.json({ status: "completed", stage: "complete", project });
  }
  if (project.status === "optimizing" || project.status === "converting") {
    return Response.json({
      status: "processing",
      stage: project.status,
      project,
    });
  }
  if (project.status === "failed") {
    return Response.json({
      status: "failed",
      error: project.error_message ?? "Generation failed.",
      project,
    });
  }
  if (!project.ai_job_id) {
    return Response.json({ error: "Generation job not found." }, { status: 409 });
  }

  try {
    const status = await getGenerationStatus(project.ai_job_id);
    if (status.status === "failed") {
      const failed = await updateProject(user.id, id, {
        status: "failed",
        error_message: status.error ?? "The AI provider could not create this model.",
      });
      return Response.json({ ...status, project: failed });
    }
    if (status.status !== "completed") return Response.json(status);
    if (!status.result?.glbUrl) throw new Error("The AI provider did not return a GLB file.");

    let originalGlbKey: string;
    let originalGlbSize: number;
    let thumbnailKey: string | null = project.source_image_key;

    if (isMockAIEnabled()) {
      const ready = await updateProject(user.id, id, {
        original_glb_key: "demo/sofa.glb",
        original_glb_size: 207332,
        web_glb_key: "demo/sofa.glb",
        web_glb_size: 207332,
        android_glb_key: "demo/sofa.glb",
        android_glb_size: 207332,
        ios_usdz_key: "demo/sofa.usdz",
        ios_usdz_size: 2300540,
        glb_key: "demo/sofa.glb",
        usdz_key: "demo/sofa.usdz",
        web_optimization_status: "excellent",
        android_optimization_status: "excellent",
        ios_optimization_status: "excellent",
        optimization_warnings: [],
        thumbnail_key: thumbnailKey,
        status: "ready",
        processing_error: null,
        processing_started_at: new Date().toISOString(),
        processing_completed_at: new Date().toISOString(),
        error_message: null,
      });
      return Response.json({ ...status, project: ready });
    } else {
      const origin = new URL(request.url).origin;
      originalGlbKey = `models/${id}/original.glb`;
      const original = await uploadRemoteFile(
        originalGlbKey,
        status.result.glbUrl,
        "model/gltf-binary",
        origin,
      );
      originalGlbSize = original.size;
      if (status.result.thumbnailUrl) {
        thumbnailKey = `models/${id}/thumbnail.webp`;
        await uploadRemoteFile(
          thumbnailKey,
          status.result.thumbnailUrl,
          "image/webp",
          origin,
        );
      }
    }

    const queued = await updateProject(user.id, id, {
      original_glb_key: originalGlbKey,
      original_glb_size: originalGlbSize,
      thumbnail_key: thumbnailKey,
      status: "optimizing",
      processing_error: null,
      processing_worker_id: null,
      processing_claimed_at: null,
      error_message: null,
    });
    return Response.json({ status: "processing", stage: "optimizing", project: queued });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not finalize generated assets.";
    await updateProject(user.id, id, {
      status: "failed",
      processing_error: message,
      error_message: message,
    });
    console.error("[generation-status]", error);
    return Response.json({ status: "failed", error: message }, { status: 502 });
  }
}
