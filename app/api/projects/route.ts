import { getCurrentUser } from "@/lib/auth";
import { createProject } from "@/lib/projects";
import { createProjectSchema, firstZodMessage } from "@/lib/validation";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const parsed = createProjectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: firstZodMessage(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const project = await createProject(user.id, parsed.data.title);
    return Response.json({ project }, { status: 201 });
  } catch (error) {
    console.error("[projects:create]", error);
    return Response.json(
      { error: "The project could not be created." },
      { status: 500 },
    );
  }
}

