import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { withStandalone } from "../../tooling/next-standalone";

const appDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  ...withStandalone(appDir),
  transpilePackages: [
    "@khepree/ui",
    "@khepree/auth",
    "@khepree/config",
    "@khepree/db",
    "@khepree/catalog",
    "@khepree/entitlement",
    "@khepree/licensing",
    "@khepree/commerce",
    "@khepree/reseller",
    "@khepree/security",
    "@khepree/types",
  ],
  poweredByHeader: false,
};

export default nextConfig;
