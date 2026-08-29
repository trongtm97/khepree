import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@khepree/ui", "@khepree/auth", "@khepree/config", "@khepree/commerce", "@khepree/entitlement", "@khepree/licensing", "@khepree/reseller", "@khepree/security"],
  poweredByHeader: false,
};

export default nextConfig;
