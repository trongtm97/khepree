import type { NextConfig } from "next";
export default {
  transpilePackages: ["@khepree/ui", "@khepree/config", "@khepree/catalog", "@khepree/db", "@khepree/storage"],
  poweredByHeader: false,
} satisfies NextConfig;
