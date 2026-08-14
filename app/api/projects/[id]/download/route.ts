import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isR2Configured } from "@/lib/config";
import { getProjectForUser } from "@/lib/projects";
import { localAssetUrl } from "@/lib/r2/download";
import { createDownloadUrl } from "@/lib/r2/presign";

const formats = {
  glb: { field: "original_glb_key", fallback: "glb_key", contentType: "model/gltf-binary" },
  usdz: { field: "ios_usdz_key", fallback: "usdz_key", contentType: "model/vnd.usdz+zip" },
} as const;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  const format = new URL(request.url).searchParams.get("format") as keyof typeof formats | null;
  if (!format || !(format in formats)) {
    return Response.json({ error: "Unknown model format." }, { status: 400 });
  }
  const project = await getProjectForUser(user.id, id);
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });
  const key = project[formats[format].field] ?? project[formats[format].fallback];
  if (!key) return Response.json({ error: `${format.toUpperCase()} is unavailable.` }, { status: 404 });
  const safeTitle = (project.title || "snapar-model").replace(/[^a-zA-Z0-9._-]/g, "-");

  if (!isR2Configured() || key.startsWith("demo/")) {
    const assetUrl = new URL(localAssetUrl(key), request.url);
    const response = await fetch(assetUrl, { cache: "no-store" });
    if (!response.ok || !response.body) {
      return Response.json({ error: "The model file could not be downloaded." }, { status: 502 });
    }
    return new Response(response.body, {
      headers: {
        "Content-Type": formats[format].contentType,
        "Content-Disposition": `attachment; filename="${safeTitle}.${format}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const signedUrl = await createDownloadUrl(key, 300, `${safeTitle}.${format}`);
  return NextResponse.redirect(signedUrl);
}
