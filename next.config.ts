import type { NextConfig } from "next";

/**
 * Two build modes:
 *  - default            → standalone server (VPS / Docker / Node hosting)
 *  - BUILD_MODE=pages   → static export into ./out (GitHub Pages / any CDN)
 *    (optionally set PAGES_BASE_PATH="/<repo>" for project pages)
 */
const isPages = process.env.BUILD_MODE === "pages";
const basePath = process.env.PAGES_BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(isPages
    ? {
        output: "export" as const,
        ...(basePath ? { basePath } : {}),
        images: { unoptimized: true },
      }
    : { output: "standalone" as const }),
  /* inlined into client bundles so runtime fetches/img srcs can be
   * basePath-aware (see withBase() in src/lib/utils.ts) */
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  allowedDevOrigins: ["preview-chat-901b4d20-7630-40d0-b98d-cc0acb503457.space-z.ai"],
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
};

export default nextConfig;
