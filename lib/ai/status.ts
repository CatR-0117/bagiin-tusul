import { getImageTo3DProvider } from "@/lib/ai/generate";

export async function getGenerationStatus(jobId: string) {
  return getImageTo3DProvider().getStatus(jobId);
}

