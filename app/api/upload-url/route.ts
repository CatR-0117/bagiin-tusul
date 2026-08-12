import { getCurrentUser } from "@/lib/auth";
import { isR2Configured } from "@/lib/config";
import { getProjectForUser } from "@/lib/projects";
import { createUploadUrl } from "@/lib/r2/presign";
import {
  firstZodMessage,
  imageMimeToExtension,
  uploadUrlSchema,
} from "@/lib/validation";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const parsed = uploadUrlSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: firstZodMessage(parsed.error) },
      { status: 400 },
    );
  }

  const project = await getProjectForUser(user.id, parsed.data.projectId);
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });
  if (project.status !== "uploading") {
    return Response.json(
      { error: "This project is no longer accepting an upload." },
      { status: 409 },
    );
  }

  const extension = imageMimeToExtension[parsed.data.fileType];
  const key = `uploads/${user.id}/${project.id}/source.${extension}`;

  try {
    const uploadUrl = isR2Configured()
      ? await createUploadUrl(key, parsed.data.fileType)
      : `/api/mock-upload?key=${encodeURIComponent(key)}`;

    return Response.json({
      uploadUrl,
      key,
      contentType: parsed.data.fileType,
      expiresIn: 600,
    });
  } catch (error) {
    console.error("[upload-url]", error);
    return Response.json(
      { error: "A secure upload URL could not be created." },
      { status: 500 },
    );
  }
}

