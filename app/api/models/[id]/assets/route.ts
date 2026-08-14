import { getCurrentUser } from "@/lib/auth";
import { isR2Configured } from "@/lib/config";
import { getProjectForAr } from "@/lib/projects";
import { getObjectUrl } from "@/lib/r2/download";
import { createInlineDownloadUrl } from "@/lib/r2/presign";

export const dynamic = "force-dynamic";

const URL_TTL_SECONDS = 3600;

async function createAssetUrl(key: string | null, filename: string) {
  if (!key) return null;
  if (!isR2Configured() || key.startsWith("demo/")) return getObjectUrl(key);
  return createInlineDownloadUrl(key, URL_TTL_SECONDS, filename);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const project = await getProjectForAr(user?.id ?? null, id);
  if (!project) return Response.json({ error: "Model not found." }, { status: 404 });
  if (project.status !== "ready") {
    return Response.json(
      { error: "Model assets are still being prepared.", status: project.status },
      { status: 409 },
    );
  }

  const webKey = project.web_glb_key ?? project.glb_key;
  const androidKey = project.android_glb_key ?? webKey;
  const iosKey = project.ios_usdz_key ?? project.usdz_key;
  const [webGlb, androidGlb, iosUsdz] = await Promise.all([
    createAssetUrl(webKey, "web.glb"),
    createAssetUrl(androidKey, "android-ar.glb"),
    createAssetUrl(iosKey, "ios-ar.usdz"),
  ]);

  if (!webGlb || !androidGlb || !iosUsdz) {
    return Response.json(
      { error: "One or more required AR assets are unavailable." },
      { status: 503 },
    );
  }

  return Response.json(
    { webGlb, androidGlb, iosUsdz, expiresIn: URL_TTL_SECONDS },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
