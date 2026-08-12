import { getCurrentUser } from "@/lib/auth";
import { isR2Configured } from "@/lib/config";
import { getMockObject } from "@/lib/mock-storage";
import { getProjectForAr } from "@/lib/projects";

export async function GET(request: Request) {
  if (isR2Configured()) return new Response(null, { status: 404 });
  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (key.includes("..")) return new Response(null, { status: 400 });
  const segments = key.split("/");
  if (segments.length < 4) return new Response(null, { status: 404 });

  const [, keyUserId, projectId] = segments;
  const user = await getCurrentUser();
  const project = await getProjectForAr(user?.id ?? null, projectId);
  if (!project || (project.user_id !== keyUserId && !project.is_public)) {
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
