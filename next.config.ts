import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dashboard pages read the database on every request, so they opt out of
  // prerendering with `export const dynamic = "force-dynamic"`; keep cache
  // components off so that segment config is honoured.
  // PGlite ships a WASM binary; keep it out of the server bundle.
  serverExternalPackages: ["@electric-sql/pglite"],
  // No floating dev badge: demos and screen recordings run against `next dev`.
  devIndicators: false,
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
