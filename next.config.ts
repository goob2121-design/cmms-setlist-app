import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true, // moved out of experimental

  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;