import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Do not ignore errors; enforce clean builds
  webpack: (config) => {
    // Enable WebAssembly for lang-detection WASM module during production builds
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    } as any;
    config.module.rules.push({ test: /\.wasm$/, type: "webassembly/async" });
    return config;
  },
  output: 'standalone',
};

export default nextConfig;
