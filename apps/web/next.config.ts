import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { withPublicMediaImages } from "../../tooling/next-public-images";
import { withStandalone } from "../../tooling/next-standalone";

const appDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = withPublicMediaImages({
  ...withStandalone(appDir),
  transpilePackages: [
    "@khepree/ui",
    "@khepree/config",
    "@khepree/catalog",
    "@khepree/reseller",
    "@khepree/security",
    "@khepree/storage",
    "@khepree/db",
    "@khepree/entitlement",
    "@khepree/licensing",
    "@khepree/commerce",
  ],
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: "/:locale(en|vi)/cookies",
        destination: "/:locale/privacy",
        permanent: true,
      },
    ];
  },
});

export default nextConfig;
