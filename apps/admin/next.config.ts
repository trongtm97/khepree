import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
