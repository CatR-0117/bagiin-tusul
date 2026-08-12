import { getCurrentUser } from "@/lib/auth";
import { isR2Configured, MAX_SOURCE_IMAGE_BYTES } from "@/lib/config";
import { putMockObject } from "@/lib/mock-storage";

const CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function PUT(request: Request) {
  if (isR2Configured()) return new Response(null, { status: 404 });
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const key = new URL(request.url).searchParams.get("key") ?? "";
  const expectedPrefix = `uploads/${user.id}/`;
  const contentType = request.headers.get("content-type")?.split(";")[0] ?? "";
  if (!key.startsWith(expectedPrefix) || key.includes("..") || !CONTENT_TYPES.has(contentType)) {
    return Response.json({ error: "Invalid upload." }, { status: 400 });
  }

  const body = await request.arrayBuffer();
  if (body.byteLength === 0 || body.byteLength > MAX_SOURCE_IMAGE_BYTES) {
    return Response.json({ error: "Image size is not allowed." }, { status: 413 });
  }

  putMockObject(key, body, contentType);
  return new Response(null, { status: 200 });
}

