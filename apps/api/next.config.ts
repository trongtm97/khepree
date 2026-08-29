import type { NextConfig } from "next";
export default {
  transpilePackages: ["@khepree/catalog", "@khepree/storage", "@khepree/db", "@khepree/commerce", "@khepree/entitlement", "@khepree/licensing", "@khepree/auth", "@khepree/reseller", "@khepree/security", "@khepree/config"],
  poweredByHeader: false,
} satisfies NextConfig;
