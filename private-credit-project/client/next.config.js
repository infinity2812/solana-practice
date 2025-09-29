/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
    NEXT_PUBLIC_PROGRAM_ID: process.env.PROGRAM_ID,
    NEXT_PUBLIC_ORCHESTRATOR_URL: process.env.ORCHESTRATOR_URL,
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

module.exports = nextConfig;
