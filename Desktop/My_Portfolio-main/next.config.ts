import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "http://localhost:3001",
    "http://192.168.0.11:3001",
  ],
};

export default nextConfig;