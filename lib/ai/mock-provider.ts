import type {
  GenerationJob,
  GenerationStatus,
  ImageTo3DProvider,
} from "@/lib/ai/provider";

function startedAt(jobId: string) {
  const match = /^mock_(\d+)_/.exec(jobId);
  return match ? Number(match[1]) : 0;
}

export class MockImageTo3DProvider implements ImageTo3DProvider {
  async generate(): Promise<GenerationJob> {
    return {
      jobId: `mock_${Date.now()}_${crypto.randomUUID()}`,
      status: "queued",
    };
  }

  async getStatus(jobId: string): Promise<GenerationStatus> {
    const elapsed = Date.now() - startedAt(jobId);
    if (!jobId.startsWith("mock_") || !Number.isFinite(elapsed)) {
      return { jobId, status: "failed", error: "Mock job was not found." };
    }
    if (elapsed < 1_500) {
      return { jobId, status: "queued", stage: "preparing" };
    }
    if (elapsed < 3_500) {
      return { jobId, status: "processing", stage: "geometry" };
    }
    if (elapsed < 5_000) {
      return { jobId, status: "processing", stage: "processing" };
    }
    if (elapsed < 6_500) {
      return { jobId, status: "processing", stage: "finalizing" };
    }
    return {
      jobId,
      status: "completed",
      stage: "complete",
      result: {
        glbUrl: "/demo/model.glb",
        thumbnailUrl: "/ar-coffee-table.avif",
      },
    };
  }
}

