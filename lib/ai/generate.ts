import { HttpImageTo3DProvider } from "@/lib/ai/http-provider";
import { MockImageTo3DProvider } from "@/lib/ai/mock-provider";
import type { ImageTo3DProvider } from "@/lib/ai/provider";
import { isMockAIEnabled } from "@/lib/config";

export function getImageTo3DProvider(): ImageTo3DProvider {
  return isMockAIEnabled()
    ? new MockImageTo3DProvider()
    : new HttpImageTo3DProvider();
}

