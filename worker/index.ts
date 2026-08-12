interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: {
          format: string;
          quality: number;
        }): Promise<{ response(): Response }>;
      };
    };
  };
  MODELS: R2Bucket;
}

interface WorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const worker = {
  async fetch(
    request: Request,
    env: Env,
    ctx: WorkerExecutionContext,
  ): Promise<Response> {
    // Workerd currently exposes a stubbed console.createTask() that throws.
    // React development builds feature-detect it by presence, so hide the stub
    // before loading the RSC runtime. Production builds do not need this shim.
    if (process.env.NODE_ENV !== "production") {
      Object.defineProperty(console, "createTask", {
        configurable: true,
        value: undefined,
      });
    }

    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const {
        DEFAULT_DEVICE_SIZES,
        DEFAULT_IMAGE_SIZES,
        handleImageOptimization,
      } = await import("vinext/server/image-optimization");
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(
        request,
        {
          fetchAsset: (path) =>
            env.ASSETS.fetch(new Request(new URL(path, request.url))),
          transformImage: async (body, { width, format, quality }) => {
            const result = await env.IMAGES.input(body)
              .transform(width > 0 ? { width } : {})
              .output({ format, quality });
            return result.response();
          },
        },
        allowedWidths,
      );
    }

    const { default: handler } = await import("vinext/server/app-router-entry");
    return handler.fetch(request, env, ctx);
  },
};

export default worker;
