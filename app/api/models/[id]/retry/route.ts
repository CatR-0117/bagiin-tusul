import { getCurrentUser } from "@/lib/auth";
import { getProjectForUser, updateProject } from "@/lib/projects";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  const project = await getProjectForUser(user.id, id);
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });
  if (project.status !== "failed") {
    return Response.json({ error: "Only failed processing can be retried." }, { status: 409 });
  }
  if (!project.original_glb_key) {
    return Response.json(
      { error: "The original GLB is unavailable; restart AI generation instead." },
      { status: 409 },
    );
  }

  const updated = await updateProject(user.id, id, {
    status: "optimizing",
    web_glb_key: null,
    web_glb_size: null,
    android_glb_key: null,
    android_glb_size: null,
    ios_usdz_key: null,
    ios_usdz_size: null,
    glb_key: null,
    usdz_key: null,
    analysis_after: null,
    triangle_count: null,
    web_optimization_status: null,
    android_optimization_status: null,
    ios_optimization_status: null,
    optimization_warnings: [],
    processing_error: null,
    error_message: null,
    processing_worker_id: null,
    processing_claimed_at: null,
    processing_started_at: null,
    processing_completed_at: null,
  });
  return Response.json({ project: updated }, { status: 202 });
}
