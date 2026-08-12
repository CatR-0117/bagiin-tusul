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

    let glbKey: string;
    let usdzKey: string | null = null;
    let thumbnailKey: string | null = project.source_image_key;

    if (isMockAIEnabled()) {
      glbKey = "demo/model.glb";
    } else {
      const origin = new URL(request.url).origin;
      glbKey = `models/${user.id}/${id}/model.glb`;
      await uploadRemoteFile(glbKey, status.result.glbUrl, "model/gltf-binary", origin);
      if (status.result.usdzUrl) {
        usdzKey = `models/${user.id}/${id}/model.usdz`;
        await uploadRemoteFile(
          usdzKey,
          status.result.usdzUrl,
          "model/vnd.usdz+zip",
          origin,
        );
      }
      if (status.result.thumbnailUrl) {
        thumbnailKey = `thumbnails/${user.id}/${id}/preview.webp`;
        await uploadRemoteFile(
          thumbnailKey,
          status.result.thumbnailUrl,
          "image/webp",
          origin,
        );
      }
    }

    const ready = await updateProject(user.id, id, {
      glb_key: glbKey,
      usdz_key: usdzKey,
      thumbnail_key: thumbnailKey,
      status: "ready",
      error_message: null,
    });
    return Response.json({ ...status, project: ready });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not finalize generated assets.";
    await updateProject(user.id, id, { status: "failed", error_message: message });
    console.error("[generation-status]", error);
    return Response.json({ status: "failed", error: message }, { status: 502 });
  }
}

