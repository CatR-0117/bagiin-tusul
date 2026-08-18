import { getImageTo3DProvider } from "@/lib/ai/generate";
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
  if (project.status === "optimizing") {
    return Response.json({ status: "processing", stage: "optimizing", project });
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
    const provider = getImageTo3DProvider();
    const isUsdzConversion = project.status === "converting";

    if (isUsdzConversion && !provider.getUsdzStatus) {
      return Response.json({ status: "processing", stage: "converting", project });
    }

    const status = isUsdzConversion
      ? await provider.getUsdzStatus!(project.ai_job_id)
      : await provider.getStatus(project.ai_job_id);

    if (status.status === "failed") {
      const failed = await updateProject(user.id, id, {
        status: "failed",
        error_message: status.error ?? "The AI provider could not create this model.",
      });
      return Response.json({ ...status, project: failed });
    }
    if (status.status !== "completed") {
      return Response.json({
        ...status,
        stage: isUsdzConversion ? "converting" : status.stage,
      });
    }

    const origin = new URL(request.url).origin;

    if (isUsdzConversion) {
      if (!status.result?.usdzUrl) {
        throw new Error("Tripo iPhone AR-д зориулсан USDZ файл буцаасангүй.");
      }
      const iosKey = `models/${id}/ios-ar.usdz`;
      const ios = await uploadRemoteFile(
        iosKey,
        status.result.usdzUrl,
        "model/vnd.usdz+zip",
        origin,
      );
      const ready = await updateProject(user.id, id, {
        ios_usdz_key: iosKey,
        ios_usdz_size: ios.size,
        usdz_key: iosKey,
        ios_optimization_status: ios.size <= 20 * 1024 * 1024 ? "excellent" : "good",
        status: "ready",
        processing_completed_at: new Date().toISOString(),
        processing_error: null,
        error_message: null,
      });
      return Response.json({ status: "completed", stage: "complete", project: ready });
    }

    if (!status.result?.glbUrl) {
      throw new Error("The AI provider did not return a GLB file.");
    }

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
    }

    const originalGlbKey = `models/${id}/original.glb`;
    const original = await uploadRemoteFile(
      originalGlbKey,
      status.result.glbUrl,
      "model/gltf-binary",
      origin,
    );
    if (status.result.thumbnailUrl) {
      thumbnailKey = `models/${id}/thumbnail.webp`;
      await uploadRemoteFile(
        thumbnailKey,
        status.result.thumbnailUrl,
        "image/webp",
        origin,
      );
    }

    const commonAssets = {
      original_glb_key: originalGlbKey,
      original_glb_size: original.size,
      web_glb_key: originalGlbKey,
      web_glb_size: original.size,
      android_glb_key: originalGlbKey,
      android_glb_size: original.size,
      glb_key: originalGlbKey,
      thumbnail_key: thumbnailKey,
      web_optimization_status: "excellent" as const,
      android_optimization_status: "excellent" as const,
      optimization_warnings: [],
      processing_started_at: new Date().toISOString(),
      processing_error: null,
      error_message: null,
    };

    if (status.result.usdzUrl) {
      const iosKey = `models/${id}/ios-ar.usdz`;
      const ios = await uploadRemoteFile(
        iosKey,
        status.result.usdzUrl,
        "model/vnd.usdz+zip",
        origin,
      );
      const ready = await updateProject(user.id, id, {
        ...commonAssets,
        ios_usdz_key: iosKey,
        ios_usdz_size: ios.size,
        usdz_key: iosKey,
        ios_optimization_status: ios.size <= 20 * 1024 * 1024 ? "excellent" : "good",
        status: "ready",
        processing_completed_at: new Date().toISOString(),
      });
      return Response.json({ status: "completed", stage: "complete", project: ready });
    }

    if (!provider.startUsdzConversion) {
      throw new Error("AI provider USDZ conversion дэмжихгүй байна.");
    }

    const conversion = await provider.startUsdzConversion(project.ai_job_id);
    const converting = await updateProject(user.id, id, {
      ...commonAssets,
      ai_job_id: conversion.jobId,
      status: "converting",
    });
    return Response.json({ status: "processing", stage: "converting", project: converting });
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
