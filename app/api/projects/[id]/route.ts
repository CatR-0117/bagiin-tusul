import { getCurrentUser } from "@/lib/auth";
import { deleteProjectRecord, getProjectForUser } from "@/lib/projects";
import { deleteObject } from "@/lib/r2/delete";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  const project = await getProjectForUser(user.id, id);
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });

  const keys = [
    project.source_image_key,
    project.original_glb_key,
    project.web_glb_key,
    project.android_glb_key,
    project.ios_usdz_key,
    project.glb_key,
    project.usdz_key,
    project.thumbnail_key === project.source_image_key ? null : project.thumbnail_key,
  ];
  const cleanup = await Promise.allSettled(
    [...new Set(keys)].map((key) => deleteObject(key)),
  );
  cleanup.forEach((result) => {
    if (result.status === "rejected") console.error("[project:delete-object]", result.reason);
  });

  await deleteProjectRecord(user.id, id);
  return Response.json({ ok: true });
}
