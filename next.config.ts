import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // exceljs is a large CommonJS package; load it from node_modules at runtime.
  serverExternalPackages: ["exceljs"],
  experimental: {
    // The attendance workbook is uploaded through a Server Action.
    serverActions: { bodySizeLimit: "6mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
