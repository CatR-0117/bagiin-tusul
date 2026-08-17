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

const arAssetSlugs = new Set([
  "sofa",
  "wooden-bowl-spoon",
  "travel-bag",
  "dartboard",
  "tissue-box",
]);

function parseByteRange(value: string, size: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return null;

  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    return {
      start: Math.max(0, size - suffixLength),
      end: size - 1,
    };
  }

  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(requestedEnd) ||
    start < 0 ||
    start >= size ||
    requestedEnd < start
  ) {
    return null;
  }

  return { start, end: Math.min(requestedEnd, size - 1) };
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

    const quickLookAssetMatch = url.pathname.match(
      /^\/ar-assets\/([^/]+)\/model\.usdz$/,
    );
    const publicModelAssetMatch = url.pathname.match(
      /^\/models\/([^/]+)\.(glb|usdz)$/,
    );
    const isRawStaticAsset = url.searchParams.get("__site_raw_asset") === "1";
    const assetSlug = quickLookAssetMatch?.[1] ?? publicModelAssetMatch?.[1];
    const assetFormat = quickLookAssetMatch
      ? "usdz"
      : publicModelAssetMatch?.[2];

    if (
      !isRawStaticAsset &&
      assetSlug &&
      assetFormat &&
      arAssetSlugs.has(assetSlug)
    ) {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response("Method not allowed", {
          status: 405,
          headers: { Allow: "GET, HEAD" },
        });
      }

      const assetUrl = new URL(
        `/models/${assetSlug}.${assetFormat}`,
        request.url,
      );
      assetUrl.searchParams.set("__site_raw_asset", "1");
      const assetHeaders = new Headers(request.headers);
      // Normalize ranges ourselves because static asset backends differ between
      // local and production runtimes (some ignore or misread suffix ranges).
      assetHeaders.delete("range");
      const assetRequest = new Request(assetUrl, {
        method: request.method,
        headers: assetHeaders,
      });
      const assetResponse = env.ASSETS
        ? await env.ASSETS.fetch(assetRequest)
        : await fetch(assetRequest);
      const headers = new Headers(assetResponse.headers);
      headers.set(
        "Content-Type",
        assetFormat === "usdz"
          ? "model/vnd.usdz+zip"
          : "model/gltf-binary",
      );
      headers.set("Accept-Ranges", "bytes");
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      headers.set("X-Content-Type-Options", "nosniff");
      if (assetFormat === "usdz") {
        headers.set(
          "Content-Disposition",
          `inline; filename="${assetSlug}.usdz"`,
        );
      }

      const rangeHeader = request.headers.get("range");
      if (
        request.method === "GET" &&
        rangeHeader &&
        assetResponse.status === 200
      ) {
        const fullAsset = await assetResponse.arrayBuffer();
        const range = parseByteRange(rangeHeader, fullAsset.byteLength);
        if (!range) {
          headers.set("Content-Range", `bytes */${fullAsset.byteLength}`);
          headers.set("Content-Length", "0");
          return new Response(null, { status: 416, headers });
        }

        const body = fullAsset.slice(range.start, range.end + 1);
        headers.set(
          "Content-Range",
          `bytes ${range.start}-${range.end}/${fullAsset.byteLength}`,
        );
        headers.set("Content-Length", String(body.byteLength));
        return new Response(body, { status: 206, headers });
      }

      return new Response(
        request.method === "HEAD" ? null : assetResponse.body,
        {
          status: assetResponse.status,
          statusText: assetResponse.statusText,
          headers,
        },
      );
    }

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
