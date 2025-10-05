import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@shorly/types', '@shorly/config', '@shorly/utils'],
  outputFileTracingRoot: '/Users/lamah/development/shorly',
};

export default nextConfig;
