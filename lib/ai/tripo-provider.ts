import {
  ModelVersion,
  OutputFormat,
  TaskStatus,
  TripoAPIError,
  TripoClient,
  TripoRequestError,
  type Task,
} from "@vastai/tripo-sdk";
import type {
  Generate3DInput,
  GenerationJob,
  GenerationStatus,
  ImageTo3DProvider,
} from "@/lib/ai/provider";
import { MAX_SOURCE_IMAGE_BYTES } from "@/lib/config";

const DEFAULT_BASE_URL = "https://openapi.tripo3d.ai/v3";
const DEFAULT_FACE_LIMIT = 10_000;

const imageTypes = {
  "image/jpeg": { extension: "jpg", contentType: "image/jpeg" },
  "image/png": { extension: "png", contentType: "image/png" },
  "image/webp": { extension: "webp", contentType: "image/webp" },
} as const;

type SupportedImageType = keyof typeof imageTypes;

function configuredFaceLimit() {
  const value = Number(process.env.TRIPO_FACE_LIMIT);
  return Number.isInteger(value) && value >= 500 && value <= 20_000
    ? value
    : DEFAULT_FACE_LIMIT;
}

function taskStage(progress = 0): GenerationStatus["stage"] {
  if (progress < 10) return "preparing";
  if (progress < 55) return "geometry";
  if (progress < 90) return "processing";
  return "finalizing";
}

function taskFailure(task: Task) {
  if (task.error_msg) return task.error_msg;
  switch (task.status) {
    case TaskStatus.BANNED:
      return "Tripo энэ зургийг контентын бодлогын улмаас боловсруулах боломжгүй гэж үзлээ.";
    case TaskStatus.CANCELLED:
      return "Tripo дээрх загвар үүсгэлт цуцлагдсан байна.";
    case TaskStatus.EXPIRED:
      return "Tripo даалгаврын хугацаа дууссан байна. Дахин үүсгэнэ үү.";
    case TaskStatus.UNKNOWN:
      return "Tripo даалгаврын төлөв тодорхойгүй байна. Дахин оролдоно уу.";
    default:
      return "Tripo 3D загварыг үүсгэж чадсангүй.";
  }
}

function errorMessage(error: unknown) {
  if (error instanceof TripoAPIError) {
    if (error.status === 401 || error.status === 403) {
      return "Tripo API key буруу эсвэл эрхгүй байна.";
    }
    if (error.status === 429) {
      return "Tripo хүсэлтийн хязгаарт хүрлээ. Түр хүлээгээд дахин оролдоно уу.";
    }
    const detail = error.suggestion || error.message;
    return `Tripo API алдаа: ${detail}`;
  }
  if (error instanceof TripoRequestError) {
    if (error.status === 401 || error.status === 403) {
      return "Tripo API key буруу эсвэл эрхгүй байна.";
    }
    if (error.status === 429) {
      return "Tripo хүсэлтийн хязгаарт хүрлээ. Түр хүлээгээд дахин оролдоно уу.";
    }
    return error.status
      ? `Tripo сервертэй холбогдоход алдаа гарлаа (${error.status}).`
      : "Tripo сервертэй холбогдож чадсангүй.";
  }
  return error instanceof Error ? error.message : "Tripo хүсэлт амжилтгүй боллоо.";
}

function supportedImageType(value: string | null | undefined): SupportedImageType {
  const contentType = value
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType && contentType in imageTypes) {
    return contentType as SupportedImageType;
  }
  throw new Error("Эх зураг JPG, PNG эсвэл WebP форматтай байх ёстой.");
}

function firstUrl(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    try {
      const url = new URL(value);
      if (url.protocol === "https:" || url.protocol === "http:") return value;
    } catch {
      // Ignore undocumented/non-URL output fields.
    }
  }
  return undefined;
}

export class TripoImageTo3DProvider implements ImageTo3DProvider {
  private readonly client: TripoClient;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.TRIPO_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("TRIPO_API_KEY тохируулаагүй байна.");
    }

    this.client = new TripoClient({
      apiKey,
      baseUrl: process.env.TRIPO_API_BASE_URL?.trim() || DEFAULT_BASE_URL,
      timeoutMs: 60_000,
      retries: 2,
    });
    this.model = process.env.TRIPO_MODEL_VERSION?.trim() || ModelVersion.P1;
  }

  async generate(input: Generate3DInput): Promise<GenerationJob> {
    try {
      let type: SupportedImageType;
      let blob: Blob;
      if (input.imageData) {
        type = supportedImageType(input.contentType);
        const bytes = Uint8Array.from(input.imageData);
        blob = new Blob([bytes.buffer], { type });
      } else if (input.imageUrl) {
        const response = await fetch(input.imageUrl, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Эх зургийг татаж чадсангүй (${response.status}).`);
        }
        type = supportedImageType(response.headers.get("content-type"));
        blob = await response.blob();
      } else {
        throw new Error("Эх зураг олдсонгүй.");
      }

      if (blob.size === 0) throw new Error("Эх зураг хоосон байна.");
      if (blob.size > MAX_SOURCE_IMAGE_BYTES) {
        throw new Error("Эх зураг 10 MB-аас бага байх ёстой.");
      }

      const image = imageTypes[type];
      const uploaded = await this.client.uploadFile(blob, {
        filename: `source.${image.extension}`,
        contentType: image.contentType,
      });
      const jobId = await this.client.imageToModel({
        file: { file_token: uploaded.file_token, type: image.extension },
        model: this.model,
        face_limit: configuredFaceLimit(),
        enable_image_autofix: true,
        texture: true,
        pbr: true,
        texture_quality: "standard",
        auto_size: true,
      });
      if (!jobId) throw new Error("Tripo даалгаврын ID буцаасангүй.");
      return { jobId, status: "queued" };
    } catch (error) {
      throw new Error(errorMessage(error), { cause: error });
    }
  }

  async getStatus(jobId: string): Promise<GenerationStatus> {
    try {
      const task = await this.client.getTask(jobId);
      const progress = Math.min(100, Math.max(0, task.progress ?? 0));

      if (task.status === TaskStatus.QUEUED) {
        return {
          jobId,
          status: "queued",
          stage: "preparing",
          progress,
        };
      }
      if (task.status === TaskStatus.RUNNING) {
        return {
          jobId,
          status: "processing",
          stage: taskStage(progress),
          progress,
        };
      }
      if (task.status !== TaskStatus.SUCCESS) {
        return {
          jobId,
          status: "failed",
          error: taskFailure(task),
          progress,
        };
      }

      const output = task.output ?? {};
      const glbUrl = firstUrl(
        output.model_url,
        output.pbr_model,
        output.model,
        output.base_model,
        ...(Array.isArray(output.model_urls) ? output.model_urls : []),
      );
      const thumbnailUrl = firstUrl(
        output.rendered_image_url,
        output.rendered_image,
      );

      return {
        jobId,
        status: "completed",
        stage: "complete",
        progress: 100,
        result: glbUrl ? { glbUrl, thumbnailUrl } : undefined,
      };
    } catch (error) {
      throw new Error(errorMessage(error), { cause: error });
    }
  }

  async startUsdzConversion(sourceJobId: string): Promise<GenerationJob> {
    try {
      const jobId = await this.client.convertModel({
        input: sourceJobId,
        format: OutputFormat.USDZ,
        texture_size: 1024,
        pivot_to_center_bottom: true,
      });
      if (!jobId) throw new Error("Tripo USDZ даалгаврын ID буцаасангүй.");
      return { jobId, status: "queued" };
    } catch (error) {
      throw new Error(errorMessage(error), { cause: error });
    }
  }

  async getUsdzStatus(jobId: string): Promise<GenerationStatus> {
    try {
      const task = await this.client.getTask(jobId);
      const progress = Math.min(100, Math.max(0, task.progress ?? 0));

      if (task.status === TaskStatus.QUEUED) {
        return { jobId, status: "queued", stage: "preparing", progress };
      }
      if (task.status === TaskStatus.RUNNING) {
        return {
          jobId,
          status: "processing",
          stage: taskStage(progress),
          progress,
        };
      }
      if (task.status !== TaskStatus.SUCCESS) {
        return {
          jobId,
          status: "failed",
          error: taskFailure(task),
          progress,
        };
      }

      const output = task.output ?? {};
      const usdzUrl = firstUrl(
        output.model_url,
        output.model,
        output.pbr_model,
        output.base_model,
        ...(Array.isArray(output.model_urls) ? output.model_urls : []),
      );

      return {
        jobId,
        status: "completed",
        stage: "complete",
        progress: 100,
        result: usdzUrl ? { usdzUrl } : undefined,
      };
    } catch (error) {
      throw new Error(errorMessage(error), { cause: error });
    }
  }
}
