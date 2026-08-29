import type { NextConfig } from "next";
export default {
  transpilePackages: ["@khepree/catalog", "@khepree/storage", "@khepree/db"],
  poweredByHeader: false,
} satisfies NextConfig;
