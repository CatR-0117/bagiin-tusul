import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: process.env.VERCEL
      ? { "cloudflare:workers": "./lib/cloudflare-workers-vercel.ts" }
      : {},
  },
  async headers() {
    return [
      {
        source: "/models/:slug.usdz",
        headers: [
          { key: "Content-Type", value: "model/vnd.usdz+zip" },
          { key: "Content-Disposition", value: "inline" },
          { key: "Accept-Ranges", value: "bytes" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/models/:slug.glb",
        headers: [
          { key: "Content-Type", value: "model/gltf-binary" },
          { key: "Accept-Ranges", value: "bytes" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/ar-assets/:slug/model.usdz",
        headers: [
          { key: "Content-Type", value: "model/vnd.usdz+zip" },
          { key: "Content-Disposition", value: "inline" },
          { key: "Accept-Ranges", value: "bytes" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/ar-assets/:slug/model.usdz",
        destination: "/models/:slug.usdz",
      },
    ];
  },
};

export default nextConfig;
