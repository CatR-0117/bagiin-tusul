import {
  createTaskFromImages,
  getBalance,
  getTask,
  MeshyError,
  toPublicTask,
} from "@/lib/meshy";
import { rateLimit, rateLimitConfig, refundRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** Meshy зөвхөн jpg/jpeg/png хүлээж авдаг. */
const ALLOWED = /^data:image\/(jpeg|jpg|png);base64,/i;

/** Нэг зурагт зөвшөөрөх дээд хэмжээ (клиент талд аль хэдийн багасгасан). */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

/** Нэг даалгаварт зарцуулагдаж болзошгүй кредитийн ойролцоо тоо. */
const CREDIT_ESTIMATE = 30;

/** Data URI-ийн ойролцоо байтын хэмжээ. */
function approxBytes(dataUri: string) {
  const base64 = dataUri.slice(dataUri.indexOf(",") + 1);
  return Math.floor((base64.length * 3) / 4);
}

function reject(error: string, status: number, extra?: HeadersInit) {
  return Response.json({ error }, { status, headers: extra });
}

export async function POST(request: Request) {
  const limits = rateLimitConfig();

  // 1) Хурдны хязгаар — кредит шатаахаас хамгаална.
  const hourly = await rateLimit(request, limits.hour);
  if (!hourly.ok) {
    return reject(
      `Хэт олон хүсэлт илгээлээ. ${Math.ceil(hourly.retryAfter / 60)} минутын дараа дахин оролдоно уу.`,
      429,
      { "Retry-After": String(hourly.retryAfter) },
    );
  }

  const daily = await rateLimit(request, limits.day);
  if (!daily.ok) {
    await refundRateLimit(request, limits.hour);
    return reject(
      "Өдрийн хязгаарт хүрлээ. Маргааш дахин оролдоно уу.",
      429,
      { "Retry-After": String(daily.retryAfter) },
    );
  }

  const giveBack = async () => {
    await refundRateLimit(request, limits.hour);
    await refundRateLimit(request, limits.day);
  };

  // 2) Body уншиж, шалгах.
  let body: {
    images?: unknown;
    image?: unknown;
    quality?: unknown;
    imageEnhancement?: unknown;
    texturePrompt?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    await giveBack();
    return reject("Хүсэлтийн бүтэц буруу байна.", 400);
  }

  const raw = Array.isArray(body.images)
    ? body.images
    : typeof body.image === "string"
      ? [body.image]
      : [];

  const images = raw
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  if (images.length === 0) {
    await giveBack();
    return reject("Зураг илгээгээгүй байна.", 400);
  }
  if (images.length > 4) {
    await giveBack();
    return reject("Хамгийн ихдээ 4 зураг оруулах боломжтой.", 400);
  }

  let total = 0;
  for (const image of images) {
    const isHttp = /^https?:\/\//i.test(image);
    if (!isHttp && !ALLOWED.test(image)) {
      await giveBack();
      return reject("Зөвхөн JPG, JPEG, PNG формат дэмжинэ.", 400);
    }
    if (!isHttp) {
      const size = approxBytes(image);
      if (size > MAX_IMAGE_BYTES) {
        await giveBack();
        return reject("Зураг хэт том байна. 8 MB-аас бага байх ёстой.", 413);
      }
      total += size;
    }
  }
  if (total > MAX_TOTAL_BYTES) {
    await giveBack();
    return reject("Зургуудын нийт хэмжээ хэтэрлээ.", 413);
  }

  // 3) Кредит хүрэлцэх эсэхийг урьдчилан шалгах — Meshy-гээс 402 авахаас
  //    илүү ойлгомжтой алдаа өгнө.
  try {
    const balance = await getBalance();
    if (balance < CREDIT_ESTIMATE) {
      await giveBack();
      return reject(
        "Meshy дансны кредит хүрэлцэхгүй байна. Багцаа шинэчилнэ үү.",
        402,
      );
    }
  } catch (error) {
    // Балансыг шалгаж чадаагүй нь үүсгэлтийг зогсоох шалтгаан биш.
    if (error instanceof MeshyError && error.status === 503) {
      await giveBack();
      return reject(error.message, 503);
    }
  }

  // 4) Даалгавар үүсгэх.
  try {
    const { id, kind } = await createTaskFromImages({
      images,
      quality: body.quality === "fast" ? "fast" : "high",
      imageEnhancement: body.imageEnhancement !== false,
      texturePrompt:
        typeof body.texturePrompt === "string" ? body.texturePrompt : undefined,
    });

    const initial = await getTask(id, kind).catch(() => null);

    return Response.json(
      {
        id,
        kind,
        task: initial ? toPublicTask(initial.task, initial.kind) : null,
        remaining: { hour: hourly.remaining, day: daily.remaining },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    await giveBack();
    if (error instanceof MeshyError) {
      return reject(error.message, error.status);
    }
    console.error("[generate] unexpected", error);
    return reject("Загвар үүсгэх хүсэлт амжилтгүй боллоо.", 500);
  }
}
