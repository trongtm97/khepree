import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@khepree/ui",
    "@khepree/auth",
    "@khepree/config",
    "@khepree/reseller",
    "@khepree/catalog",
    "@khepree/entitlement",
    "@khepree/licensing",
    "@khepree/commerce",
    "@khepree/security",
  ],
  poweredByHeader: false,
};

export default nextConfig;
