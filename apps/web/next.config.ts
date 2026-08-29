import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@khepree/ui",
    "@khepree/config",
    "@khepree/catalog",
    "@khepree/reseller",
    "@khepree/security",
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
};

export default nextConfig;
