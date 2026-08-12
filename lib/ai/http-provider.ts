import { z } from "zod";
import type {
  Generate3DInput,
  GenerationJob,
  GenerationStatus,
  ImageTo3DProvider,
} from "@/lib/ai/provider";

const jobSchema = z.object({
  job_id: z.string().min(1),
  status: z.enum(["queued", "processing", "completed", "failed"]),
});

const statusSchema = jobSchema.extend({
  error: z.string().optional(),
  stage: z
    .enum(["preparing", "geometry", "processing", "finalizing", "complete"])
    .optional(),
  result: z
    .object({
      glb_url: z.string().min(1),
      usdz_url: z.string().min(1).optional(),
      thumbnail_url: z.string().min(1).optional(),
    })
    .optional(),
});

export class HttpImageTo3DProvider implements ImageTo3DProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    if (!process.env.AI_API_BASE_URL || !process.env.AI_API_KEY) {
      throw new Error("AI provider credentials are not configured.");
    }
    this.baseUrl = process.env.AI_API_BASE_URL.replace(/\/$/, "");
    this.apiKey = process.env.AI_API_KEY;
  }

  private async request(path: string, init?: RequestInit) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`AI provider request failed (${response.status}).`);
    }
    return response.json() as Promise<unknown>;
  }

  async generate(input: Generate3DInput): Promise<GenerationJob> {
    const parsed = jobSchema.parse(
      await this.request("/generate", {
        method: "POST",
        body: JSON.stringify({ image_url: input.imageUrl }),
      }),
    );
    return { jobId: parsed.job_id, status: parsed.status };
  }

  async getStatus(jobId: string): Promise<GenerationStatus> {
    const parsed = statusSchema.parse(
      await this.request(`/jobs/${encodeURIComponent(jobId)}`),
    );
    return {
      jobId: parsed.job_id,
      status: parsed.status,
      error: parsed.error,
      stage: parsed.stage,
      result: parsed.result
        ? {
            glbUrl: parsed.result.glb_url,
            usdzUrl: parsed.result.usdz_url,
            thumbnailUrl: parsed.result.thumbnail_url,
          }
        : undefined,
    };
  }
}

