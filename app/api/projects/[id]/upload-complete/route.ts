import { getCurrentUser } from "@/lib/auth";
import { getProjectForUser, updateProject } from "@/lib/projects";
import { z } from "zod";

const bodySchema = z.object({ key: z.string().min(1).max(500) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  const project = await getProjectForUser(user.id, id);
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid object key." }, { status: 400 });
  const expectedPrefix = `uploads/${user.id}/${project.id}/source.`;
  if (!parsed.data.key.startsWith(expectedPrefix) || parsed.data.key.includes("..")) {
    return Response.json({ error: "Invalid object key." }, { status: 400 });
  }

  const updated = await updateProject(user.id, id, {
    source_image_key: parsed.data.key,
    thumbnail_key: parsed.data.key,
    status: "uploaded",
    error_message: null,
  });
  return Response.json({ project: updated });
}

