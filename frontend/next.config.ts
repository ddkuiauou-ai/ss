import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Proxy to avoid CORS: /api/* -> API_PROXY_TARGET/*
    const fallback = "http://127.0.0.1:8000"; // backend dev default
    const raw = process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_API_BASE || fallback;
    const target = raw.replace(/\/$/, "");
    return [
      {
        source: "/api/:path*",
        destination: `${target}/:path*`,
      },
    ];
  },
};

export default nextConfig;
