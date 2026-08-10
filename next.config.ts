import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: process.env.VERCEL
      ? { "cloudflare:workers": "./lib/cloudflare-workers-vercel.ts" }
      : {},
  },
};

export default nextConfig;
