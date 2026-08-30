import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { withStandalone } from "../../tooling/next-standalone";

const appDir = path.dirname(fileURLToPath(import.meta.url));

export default {
  ...withStandalone(appDir),
  transpilePackages: ["@khepree/catalog", "@khepree/storage", "@khepree/db", "@khepree/commerce", "@khepree/entitlement", "@khepree/licensing", "@khepree/auth", "@khepree/reseller", "@khepree/security", "@khepree/config"],
  poweredByHeader: false,
} satisfies NextConfig;
