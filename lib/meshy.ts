/**
 * Meshy AI — Image to 3D API-тай харилцах серверийн давхарга.
 *
 * Энэ файл ЗӨВХӨН сервер талд (route handler, server component) ажиллана.
 * MESHY_API_KEY хэзээ ч браузер руу гарахгүй.
 *
 * Docs: https://docs.meshy.ai/en/api/image-to-3d
 */

import { edgeCache } from "./edge-cache";

const MESHY_BASE = "https://api.meshy.ai/openapi/v1";

export type MeshyStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED";

/** Нэг зурагнаас эсвэл 1–4 зурагнаас үүсгэсэн даалгавар. */
export type TaskKind = "image-to-3d" | "multi-image-to-3d";

export type MeshyTask = {
  id: string;
  type?: string;
  status: MeshyStatus;
  progress: number;
  model_urls?: {
    glb?: string;
    usdz?: string;
    fbx?: string;
    obj?: string;
    stl?: string;
  };
  thumbnail_url?: string;
  created_at?: number;
  started_at?: number;
  finished_at?: number;
  expires_at?: number;
  /** PENDING үед дарааллын өмнөх даалгаврын тоо */
  preceding_tasks?: number;
  task_error?: { message?: string };
  consumed_credits?: number;
};

export class MeshyError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "MeshyError";
    this.status = status;
  }
}

function apiKey(): string {
  const key = process.env.MESHY_API_KEY;
  if (!key) {
    throw new MeshyError(
      "MESHY_API_KEY тохируулаагүй байна. .env.local файлдаа нэмнэ үү.",
      503,
    );
  }
  return key;
}

async function meshyFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const response = await fetch(`${MESHY_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let message = text;
    try {
      const parsed = JSON.parse(text) as { message?: string; error?: string };
      message = parsed.message ?? parsed.error ?? text;
    } catch {
      /* текст хэвээр */
    }
    throw new MeshyError(
      message || `Meshy API алдаа (${response.status})`,
      response.status,
    );
  }

  return response;
}

export type CreateTaskOptions = {
  /** 1–4 зураг. Нийтэд нээлттэй URL эсвэл `data:image/...;base64,...` */
  images: string[];
  /** "fast" = хурдан/хямд, "high" = илүү нарийвчлалтай */
  quality?: "fast" | "high";
  /** AI-аар бодит хэмжээг тааж, эх цэгийг ёроолд нь тавина (AR-д чухал) */
  autoSize?: boolean;
  /** Оролтын зургийг Meshy сайжруулах эсэх (анхны төрхийг хадгалах бол false) */
  imageEnhancement?: boolean;
  texturePrompt?: string;
};

/** Нэг болон олон зурагт хуваалцах ерөнхий тохиргоо. */
function sharedBody({
  quality = "high",
  autoSize = true,
  imageEnhancement = true,
  texturePrompt,
}: Omit<CreateTaskOptions, "images">): Record<string, unknown> {
  const body: Record<string, unknown> = {
    ai_model: "latest",
    should_texture: true,
    // AR-д GLB (Android/WebXR) ба USDZ (iOS Quick Look) хоёулаа хэрэгтэй.
    // Зөвхөн хэрэгтэйг нь үүсгэвэл даалгавар хурдан дуусна.
    target_formats: ["glb", "usdz"],
    // Утсан дээр хөнгөн байлгахын тулд полигоныг хязгаарлана.
    should_remesh: true,
    topology: "triangle",
    target_polycount: quality === "fast" ? 20000 : 50000,
    texture_resolution: quality === "fast" ? "2k" : "4k",
    enable_pbr: quality === "high",
    remove_lighting: true,
    image_enhancement: imageEnhancement,
    // Бодит хэмжээгээр AR-д байрлуулах
    auto_size: autoSize,
    origin_at: "bottom",
  };

  if (texturePrompt) body.texture_prompt = texturePrompt.slice(0, 600);
  return body;
}

async function createTask(
  path: string,
  body: Record<string, unknown>,
): Promise<string> {
  const response = await meshyFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as { result?: string };
  if (!data.result) {
    throw new MeshyError("Meshy task id буцаасангүй.", 502);
  }
  return data.result;
}

/**
 * Шинэ даалгавар үүсгэнэ. Зургийн тооноос хамааран Image-to-3D эсвэл
 * Multi-Image-to-3D эндпойнтыг сонгоно.
 *
 * Олон өнцгөөс авсан 2–4 зураг өгвөл геометр мэдэгдэхүйц сайжирдаг.
 */
export async function createTaskFromImages(
  options: CreateTaskOptions,
): Promise<{ id: string; kind: TaskKind }> {
  const images = options.images.filter(Boolean);

  if (images.length === 0) {
    throw new MeshyError("Дор хаяж нэг зураг шаардлагатай.", 400);
  }
  if (images.length > 4) {
    throw new MeshyError("Хамгийн ихдээ 4 зураг оруулах боломжтой.", 400);
  }

  const base = sharedBody(options);

  if (images.length === 1) {
    const id = await createTask("/image-to-3d", {
      ...base,
      model_type: "standard",
      image_url: images[0],
    });
    return { id, kind: "image-to-3d" };
  }

  const id = await createTask("/multi-image-to-3d", {
    ...base,
    image_urls: images,
  });
  return { id, kind: "multi-image-to-3d" };
}

/** Тухайн эндпойнтоос даалгаврыг авах. */
async function fetchTask(id: string, kind: TaskKind): Promise<MeshyTask> {
  const response = await meshyFetch(`/${kind}/${encodeURIComponent(id)}`);
  return (await response.json()) as MeshyTask;
}

/**
 * Даалгаврыг төрлийг нь мэдэхгүйгээр авна.
 *
 * AR хуудас нь зөвхөн id-г л мэддэг (QR-аас) тул хоёр эндпойнтыг туршина.
 * Аль нь тохирсныг Cache API-д хадгалж дараагийн удаа шууд ононо.
 */
export async function getTask(
  id: string,
  hint?: TaskKind,
): Promise<{ task: MeshyTask; kind: TaskKind }> {
  const cached = hint ?? (await readKindCache(id));
  const order: TaskKind[] = cached
    ? [cached, cached === "image-to-3d" ? "multi-image-to-3d" : "image-to-3d"]
    : ["image-to-3d", "multi-image-to-3d"];

  let lastError: unknown;

  for (const kind of order) {
    try {
      const task = await fetchTask(id, kind);
      if (kind !== cached) void writeKindCache(id, kind);
      return { task, kind };
    } catch (error) {
      lastError = error;
      // 404 бол нөгөө эндпойнтыг үзнэ, бусад алдааг шууд дамжуулна.
      if (!(error instanceof MeshyError) || error.status !== 404) throw error;
    }
  }

  throw lastError instanceof MeshyError
    ? lastError
    : new MeshyError("Даалгавар олдсонгүй.", 404);
}

/* --------------------- даалгаврын төрлийн жижиг кэш --------------------- */

const KIND_CACHE_BASE = "https://morph-ar.internal/task-kind/";
const memoryKindCache = new Map<string, TaskKind>();

async function readKindCache(id: string): Promise<TaskKind | undefined> {
  if (memoryKindCache.has(id)) return memoryKindCache.get(id);
  const cache = edgeCache();
  if (!cache) return undefined;
  try {
    const hit = await cache.match(`${KIND_CACHE_BASE}${id}`);
    if (!hit) return undefined;
    const value = (await hit.text()) as TaskKind;
    memoryKindCache.set(id, value);
    return value;
  } catch {
    return undefined;
  }
}

async function writeKindCache(id: string, kind: TaskKind): Promise<void> {
  memoryKindCache.set(id, kind);
  const cache = edgeCache();
  if (!cache) return;
  try {
    await cache.put(
      `${KIND_CACHE_BASE}${id}`,
      new Response(kind, { headers: { "Cache-Control": "max-age=86400" } }),
    );
  } catch {
    /* кэш байхгүй бол зүгээр л дахин туршина */
  }
}

/** Дансны кредитийн үлдэгдэл. */
export async function getBalance(): Promise<number> {
  const response = await meshyFetch("/balance");
  const data = (await response.json()) as { balance?: number };
  return typeof data.balance === "number" ? data.balance : 0;
}

export type AssetKind = "glb" | "usdz" | "preview";

/**
 * Meshy-ийн гарын үсэгтэй (Expires=...) татах URL-ыг олж авна.
 * Эдгээр URL хугацаа дуусдаг тул клиент рүү шууд өгөхгүй — proxy-оор дамжуулна.
 */
export async function getAssetUrl(
  id: string,
  asset: AssetKind,
): Promise<{ url: string; task: MeshyTask }> {
  const { task } = await getTask(id);

  if (task.status === "FAILED" || task.status === "CANCELED") {
    throw new MeshyError(
      task.task_error?.message || "Загвар үүсгэлт амжилтгүй болсон.",
      409,
    );
  }
  if (task.status !== "SUCCEEDED") {
    throw new MeshyError("Загвар хараахан бэлэн болоогүй байна.", 425);
  }

  const url =
    asset === "preview" ? task.thumbnail_url : task.model_urls?.[asset];

  if (!url) {
    throw new MeshyError(`Энэ даалгаварт ${asset} формат байхгүй байна.`, 404);
  }

  return { url, task };
}

export const ASSET_CONTENT_TYPE: Record<AssetKind, string> = {
  // iOS Quick Look USDZ-г зөв Content-Type-аар л нээдэг.
  usdz: "model/vnd.usdz+zip",
  glb: "model/gltf-binary",
  preview: "image/png",
};

/** Клиент рүү буцаах аюулгүй (гарын үсэгтэй URL агуулаагүй) хэлбэр. */
export function toPublicTask(task: MeshyTask, kind?: TaskKind) {
  const startedAt = task.started_at || 0;
  const progress = task.progress ?? 0;

  // Одоогийн явцаас үлдсэн хугацааг ойролцоолох. Явц шугаман биш ч
  // "хэдэн % байна" гэдгээс хамаагүй ойлгомжтой.
  let etaSeconds: number | null = null;
  if (task.status === "IN_PROGRESS" && startedAt > 0 && progress > 3) {
    const elapsed = (Date.now() - startedAt) / 1000;
    etaSeconds = Math.max(5, Math.round((elapsed / progress) * (100 - progress)));
  }

  return {
    id: task.id,
    kind: kind ?? null,
    status: task.status,
    progress,
    hasGlb: Boolean(task.model_urls?.glb),
    hasUsdz: Boolean(task.model_urls?.usdz),
    hasPreview: Boolean(task.thumbnail_url),
    createdAt: task.created_at ?? null,
    finishedAt: task.finished_at ?? null,
    expiresAt: task.expires_at ?? null,
    creditsUsed: task.consumed_credits ?? 0,
    /** PENDING үед дараалалд хэдэн даалгавар өмнө байгаа */
    queuePosition:
      task.status === "PENDING" ? (task.preceding_tasks ?? 0) : null,
    etaSeconds,
    error:
      task.status === "FAILED" || task.status === "CANCELED"
        ? task.task_error?.message || "Үүсгэлт амжилтгүй боллоо."
        : null,
  };
}

export type PublicTask = ReturnType<typeof toPublicTask>;
