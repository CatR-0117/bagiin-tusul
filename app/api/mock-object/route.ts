import { getCurrentUser } from "@/lib/auth";
import { isR2Configured } from "@/lib/config";
import { getMockObject } from "@/lib/mock-storage";
import { getProjectForAr } from "@/lib/projects";

export async function GET(request: Request) {
  if (isR2Configured()) return new Response(null, { status: 404 });
  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (key.includes("..")) return new Response(null, { status: 400 });
  const segments = key.split("/");
  const user = await getCurrentUser();
  const kind = segments[0];
  const keyUserId = kind === "uploads" ? segments[1] : null;
  const projectId = kind === "uploads" ? segments[2] : kind === "models" ? segments[1] : null;
  if (!projectId || (kind === "uploads" && segments.length < 4) || (kind === "models" && segments.length < 3)) {
    return new Response(null, { status: 404 });
  }

  const project = await getProjectForAr(user?.id ?? null, projectId);
  if (
    !project ||
    (kind === "uploads" && project.user_id !== keyUserId && !project.is_public)
  ) {
    return new Response(null, { status: user ? 403 : 401 });
  }

  const object = getMockObject(key);
  if (!object) return new Response(null, { status: 404 });
  const body = Uint8Array.from(object.body).buffer;
  return new Response(body, {
    headers: {
      "Content-Type": object.contentType,
      "Content-Length": String(object.body.byteLength),
      "Cache-Control": "private, no-store",
      "Last-Modified": new Date(object.updatedAt).toUTCString(),
    },
  });
}
