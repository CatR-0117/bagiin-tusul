import { getImageTo3DProvider } from "@/lib/ai/generate";
import { getCurrentUser } from "@/lib/auth";
import { isR2Configured } from "@/lib/config";
import { getMockObject } from "@/lib/mock-storage";
import { getProjectForUser, updateProject } from "@/lib/projects";
import {
  isGenerationRateLimitExempt,
  rateLimit,
  rateLimitConfig,
  refundRateLimit,
} from "@/lib/ratelimit";
import { getObjectUrl } from "@/lib/r2/download";
import { firstZodMessage, projectIdSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const parsed = projectIdSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: firstZodMessage(parsed.error) }, { status: 400 });
  }

  const project = await getProjectForUser(user.id, parsed.data.projectId);
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });
  if (!project.source_image_key || !["uploaded", "failed"].includes(project.status)) {
    return Response.json(
      { error: "The source image is not ready for generation." },
      { status: 409 },
    );
  }

  const limits = rateLimitConfig();
  const isLimitExempt = isGenerationRateLimitExempt(user.email);
  if (!isLimitExempt) {
    const hourly = await rateLimit(request, limits.hour, user.id);
    if (!hourly.ok) {
      return Response.json(
        { error: "Нэг цагийн 3D үүсгэлтийн хязгаарт хүрлээ." },
        { status: 429, headers: { "Retry-After": String(hourly.retryAfter) } },
      );
    }
    const daily = await rateLimit(request, limits.day, user.id);
    if (!daily.ok) {
      await refundRateLimit(request, limits.hour, user.id);
      return Response.json(
        { error: "Өнөөдрийн 3D үүсгэлтийн хязгаарт хүрлээ." },
        { status: 429, headers: { "Retry-After": String(daily.retryAfter) } },
      );
    }
  }

  let generationSubmitted = false;
  try {
    let input;
    if (!isR2Configured()) {
      const source = getMockObject(project.source_image_key);
      if (!source) throw new Error("Source image is unavailable.");
      input = {
        imageData: source.body,
        contentType: source.contentType,
      };
    } else {
      const sourceUrl = await getObjectUrl(project.source_image_key);
      if (!sourceUrl) throw new Error("Source image is unavailable.");
      input = { imageUrl: new URL(sourceUrl, request.url).toString() };
    }
    const job = await getImageTo3DProvider().generate(input);
    generationSubmitted = true;
    await updateProject(user.id, project.id, {
      ai_job_id: job.jobId,
      status: "generating",
      error_message: null,
    });
    return Response.json({ job });
  } catch (error) {
    if (!generationSubmitted && !isLimitExempt) {
      await Promise.all([
        refundRateLimit(request, limits.hour, user.id),
        refundRateLimit(request, limits.day, user.id),
      ]);
    }
    const message = error instanceof Error ? error.message : "Generation could not be started.";
    await updateProject(user.id, project.id, {
      status: "failed",
      error_message: message,
    });
    console.error("[generate]", error);
    return Response.json({ error: message }, { status: 502 });
  }
}
