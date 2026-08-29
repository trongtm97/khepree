import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@khepree/ui", "@khepree/config"],
  poweredByHeader: false,
};

export default nextConfig;
