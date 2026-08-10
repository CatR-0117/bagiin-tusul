import { ASSET_CONTENT_TYPE, getAssetUrl, MeshyError } from "@/lib/meshy";
import type { AssetKind } from "@/lib/meshy";
import {
  getModelBucket,
  isManualModelId,
  manualModelKey,
} from "@/lib/manual-models";

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

const MANUAL_FILES: Record<string, string> = {
  "model.glb": "model/gltf-binary",
  "model.usdz": "model/vnd.usdz+zip",
};

async function serveManual(
  request: Request,
  id: string,
  file: string,
  head: boolean,
) {
  const contentType = MANUAL_FILES[file];
  if (!contentType) return new Response("Not found", { status: 404 });

  const range = request.headers.get("range");
  const object = await getModelBucket().get(
    manualModelKey(id, file),
    range ? { range: request.headers } : undefined,
  );
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", contentType);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Accept-Ranges", "bytes");
  headers.set("ETag", object.httpEtag);

  const download = new URL(request.url).searchParams.get("dl") === "1";
  headers.set(
    "Content-Disposition",
    `${download ? "attachment" : "inline"}; filename="${file}"`,
  );

  let status = 200;
  if (range && object.range) {
    const { offset, length } = object.range;
    headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
    headers.set("Content-Length", String(length));
    status = 206;
  } else {
    headers.set("Content-Length", String(object.size));
  }

  return new Response(head ? null : object.body, { status, headers });
}

async function proxy(request: Request, id: string, file: string, head = false) {
  if (isManualModelId(id)) {
    return serveManual(request, id, file, head);
  }
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
