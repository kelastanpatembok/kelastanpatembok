import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Add empty turbopack config to allow webpack config
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Make @google-cloud/storage optional during build (external)
      config.externals = config.externals || [];
      config.externals.push("@google-cloud/storage");
      // Also add to resolve.fallback to prevent build errors
      config.resolve = config.resolve || {};
      config.resolve.fallback = config.resolve.fallback || {};
      config.resolve.fallback["@google-cloud/storage"] = false;
    }
    return config;
  },
};

export default nextConfig;
