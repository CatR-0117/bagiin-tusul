import { ASSET_CONTENT_TYPE, getAssetUrl, MeshyError } from "@/lib/meshy";
import type { AssetKind } from "@/lib/meshy";

export const dynamic = "force-dynamic";

/**
 * Meshy-ийн гарын үсэгтэй URL хугацаа дуусдаг бөгөөд `?Expires=...` query-тэй.
 * iOS Quick Look болон Android Scene Viewer нь ЦЭВЭР, өргөтгөлтэй URL шаарддаг
 * тул энэ route нь тогтвортой хаягаар дамжуулж өгнө:
 *
 *   /api/model/<taskId>/model.glb   → Android Scene Viewer / WebXR / model-viewer
 *   /api/model/<taskId>/model.usdz  → iOS Quick Look
 *   /api/model/<taskId>/preview.png → thumbnail
 */
const FILE_MAP: Record<string, AssetKind> = {
  "model.glb": "glb",
  "model.usdz": "usdz",
  "preview.png": "preview",
};

async function proxy(request: Request, id: string, file: string, head = false) {
  const kind = FILE_MAP[file];

  if (!kind) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const { url } = await getAssetUrl(id, kind);

    // Quick Look/Scene Viewer нь Range хүсэлт явуулдаг тул дамжуулна.
    const range = request.headers.get("range");
    const init: RequestInit & { cf?: Record<string, unknown> } = {
      headers: range ? { Range: range } : undefined,
      // Загвар өөрчлөгддөггүй тул Cloudflare-ийн ирмэг дээр кэшлэнэ.
      cf: { cacheEverything: true, cacheTtl: 3600 },
    };
    const upstream = await fetch(url, init);

    if (!upstream.ok && upstream.status !== 206) {
      return new Response("Файл татахад алдаа гарлаа.", {
        status: upstream.status,
      });
    }

    const headers = new Headers();
    headers.set("Content-Type", ASSET_CONTENT_TYPE[kind]);
    headers.set("Cache-Control", "public, max-age=3600");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Accept-Ranges", "bytes");

    // `?dl=1` үед хөтөч файлыг татаж авна, эсрэг тохиолдолд шууд нээнэ
    // (Quick Look-д `inline` байх ёстой).
    const download = new URL(request.url).searchParams.get("dl") === "1";
    headers.set(
      "Content-Disposition",
      `${download ? "attachment" : "inline"}; filename="${file}"`,
    );

    const length = upstream.headers.get("content-length");
    if (length) headers.set("Content-Length", length);
    const contentRange = upstream.headers.get("content-range");
    if (contentRange) headers.set("Content-Range", contentRange);

    return new Response(head ? null : upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    if (error instanceof MeshyError) {
      return new Response(error.message, { status: error.status });
    }
    console.error("[model proxy] unexpected", error);
    return new Response("Дотоод алдаа.", { status: 500 });
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; file: string }> },
) {
  const { id, file } = await context.params;
  return proxy(request, id, file);
}

export async function HEAD(
  request: Request,
  context: { params: Promise<{ id: string; file: string }> },
) {
  const { id, file } = await context.params;
  return proxy(request, id, file, true);
}
