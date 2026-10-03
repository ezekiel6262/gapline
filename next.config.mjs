/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    // This workspace can deny webpack's filesystem snapshot calls on Windows.
    // Disabling the build cache keeps local and CI builds deterministic.
    config.cache = false;
    return config;
  },
};

export default nextConfig;
