import { getCurrentUser } from "@/lib/auth";
import { getProjectForUser } from "@/lib/projects";
import { getObjectUrl } from "@/lib/r2/download";

const FILE_FIELDS = {
  source: "source_image_key",
  glb: "glb_key",
  usdz: "usdz_key",
  thumbnail: "thumbnail_key",
} as const;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  const project = await getProjectForUser(user.id, id);
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });

  const file = new URL(request.url).searchParams.get("file") as keyof typeof FILE_FIELDS | null;
  if (!file || !(file in FILE_FIELDS)) {
    return Response.json({ error: "Unknown model asset." }, { status: 400 });
  }
  const key = project[FILE_FIELDS[file]];
  if (!key) return Response.json({ error: "Asset unavailable." }, { status: 404 });
  const url = await getObjectUrl(key);
  return Response.json({ url, expiresIn: key.startsWith("demo/") ? null : 3600 });
}

