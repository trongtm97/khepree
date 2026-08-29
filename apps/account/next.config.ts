import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@khepree/ui", "@khepree/auth", "@khepree/config"],
  poweredByHeader: false,
};

export default nextConfig;
