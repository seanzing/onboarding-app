import type { NextConfig } from "next";

// Next.js config without Tamagui webpack plugin to avoid CSS conflicts
const config: NextConfig = {
  transpilePackages: [
    'tamagui',
    '@tamagui/config',
    '@tamagui/core',
    '@tamagui/animations-css',
    'react-native-web',
  ],
  // Suppress React hydration errors in dev overlay
  reactStrictMode: false,
  // Allow ESLint warnings during production builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Skip TypeScript errors during builds
  typescript: {
    ignoreBuildErrors: true,
  },
  // Enable standalone output for optimized Docker builds (~150MB vs ~3GB)
  // Note: Local Windows builds may need admin privileges for symlinks
  // Docker builds work fine (Linux container has no symlink issues)
  output: 'standalone',
};

export default config;
