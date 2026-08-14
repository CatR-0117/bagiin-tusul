import { getCurrentUser } from "@/lib/auth";
import { getProjectForUser } from "@/lib/projects";
import { getObjectUrl } from "@/lib/r2/download";

const FILE_FIELDS = {
  source: "source_image_key",
  original: "original_glb_key",
  web: "web_glb_key",
  android: "android_glb_key",
  ios: "ios_usdz_key",
  glb: "web_glb_key",
  usdz: "ios_usdz_key",
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
  const key =
    project[FILE_FIELDS[file]] ??
    (file === "glb" ? project.glb_key : file === "usdz" ? project.usdz_key : null);
  if (!key) return Response.json({ error: "Asset unavailable." }, { status: 404 });
  const url = await getObjectUrl(key);
  return Response.json({ url, expiresIn: key.startsWith("demo/") ? null : 3600 });
}
