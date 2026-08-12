import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getProjectForUser, updateProject } from "@/lib/projects";

const schema = z.object({ isPublic: z.boolean() });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  const project = await getProjectForUser(user.id, id);
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid visibility." }, { status: 400 });
  const updated = await updateProject(user.id, id, { is_public: parsed.data.isPublic });
  return Response.json({ project: updated });
}

