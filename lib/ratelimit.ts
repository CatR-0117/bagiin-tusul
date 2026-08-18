/**
 * Энгийн IP-д суурилсан хязгаарлагч.
 *
 * Яагаад хэрэгтэй вэ: `/api/generate`-ийг хэт олон дуудах нь AI provider-ийн
 * кредитийг үр ашиггүй зарцуулна.
 *
 * Хэрэгжүүлэлт нь Cloudflare-ийн Cache API дээр суурилсан тул ямар ч
 * нэмэлт binding, тохиргоо шаардахгүй. Сул тал: тоолуур нь дата төв (colo)
 * тус бүрд тусдаа бөгөөд атомик биш. Ноцтой ачаалалд KV эсвэл Durable Object
 * руу шилжүүлэх нь зүйтэй — интерфейс нь ижил хэвээр үлдэнэ.
 */

import { edgeCache } from "./edge-cache";

const CACHE_BASE = "https://morph-ar.internal/ratelimit/";

type Bucket = { count: number; resetAt: number };

const memory = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  /** Дахин оролдох хүртэлх секунд */
  retryAfter: number;
  limit: number;
};

export function clientKey(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "anonymous"
  );
}

async function readBucket(key: string): Promise<Bucket | null> {
  const local = memory.get(key);
  if (local && local.resetAt > Date.now()) return local;

  const cache = edgeCache();
  if (!cache) return null;
  try {
    const hit = await cache.match(CACHE_BASE + key);
    if (!hit) return null;
    const bucket = (await hit.json()) as Bucket;
    return bucket.resetAt > Date.now() ? bucket : null;
  } catch {
    return null;
  }
}

async function writeBucket(key: string, bucket: Bucket): Promise<void> {
  memory.set(key, bucket);
  const cache = edgeCache();
  if (!cache) return;
  const ttl = Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000));
  try {
    await cache.put(
      CACHE_BASE + key,
      new Response(JSON.stringify(bucket), {
        headers: {
          "Cache-Control": `max-age=${ttl}`,
          "Content-Type": "application/json",
        },
      }),
    );
  } catch {
    /* кэш бичиж чадсангүй — санах ойн хуулбар үлдэнэ */
  }
}

/**
 * Хязгаарыг шалгаж, тоолуурыг нэмэгдүүлнэ.
 *
 * @param windowSeconds цонхны урт (жишээ нь 3600 = цаг)
 * @param limit нэг цонхонд зөвшөөрөх хамгийн их хүсэлт
 */
export async function rateLimit(
  request: Request,
  { windowSeconds = 3600, limit = 5 } = {},
  subject?: string,
): Promise<RateLimitResult> {
  const key = `${subject ?? "visitor"}:${clientKey(request)}:${windowSeconds}:${limit}`;
  const now = Date.now();
  const existing = await readBucket(key);

  const bucket: Bucket = existing ?? {
    count: 0,
    resetAt: now + windowSeconds * 1000,
  };

  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, retryAfter, limit };
  }

  bucket.count += 1;
  await writeBucket(key, bucket);

  return {
    ok: true,
    remaining: Math.max(0, limit - bucket.count),
    retryAfter,
    limit,
  };
}

/** Тоолуурыг буцаах (даалгавар үүсгэж чадаагүй үед кредит "буцаах"). */
export async function refundRateLimit(
  request: Request,
  { windowSeconds = 3600, limit = 5 } = {},
  subject?: string,
): Promise<void> {
  const key = `${subject ?? "visitor"}:${clientKey(request)}:${windowSeconds}:${limit}`;
  const bucket = await readBucket(key);
  if (!bucket || bucket.count === 0) return;
  await writeBucket(key, { ...bucket, count: bucket.count - 1 });
}

/** Орчны хувьсагчаас тохиргоог унших. */
export function rateLimitConfig() {
  const perHour = Number(process.env.MORPH_GENERATIONS_PER_HOUR ?? 1);
  const perDay = Number(process.env.MORPH_GENERATIONS_PER_DAY ?? 2);
  return {
    hour: { windowSeconds: 3600, limit: Number.isFinite(perHour) ? perHour : 1 },
    day: { windowSeconds: 86400, limit: Number.isFinite(perDay) ? perDay : 2 },
  };
}

/** Exact, case-insensitive email allowlist for trusted account generation. */
export function isGenerationRateLimitExempt(email: string | null | undefined) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return false;

  return (process.env.MORPH_UNLIMITED_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalizedEmail);
}
