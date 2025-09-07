/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    config.module.rules.push({ test: /\.wasm$/, type: 'webassembly/async' });
    return config;
  },
};

export default nextConfig;
