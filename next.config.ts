import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.18.23', '192.168.1.9', '*.local', 'localhost'],
};

export default nextConfig;
