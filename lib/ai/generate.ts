import { HttpImageTo3DProvider } from "@/lib/ai/http-provider";
import { MockImageTo3DProvider } from "@/lib/ai/mock-provider";
import { TripoImageTo3DProvider } from "@/lib/ai/tripo-provider";
import type { ImageTo3DProvider } from "@/lib/ai/provider";
import { isMockAIEnabled } from "@/lib/config";

export function getImageTo3DProvider(): ImageTo3DProvider {
  if (isMockAIEnabled()) return new MockImageTo3DProvider();
  if (process.env.TRIPO_API_KEY) return new TripoImageTo3DProvider();
  return new HttpImageTo3DProvider();
}
