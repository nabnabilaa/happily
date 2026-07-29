import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.18.23', '192.168.1.9', '*.local', 'localhost'],

  // The dev route indicator defaults to bottom-left, where it sits on top of
  // the sidebar's Download Extension button. bottom-right is taken by the AI
  // Coach button, so it goes top-left — over the static brand block, which is
  // the only corner nothing interactive occupies. Dev-only either way.
  devIndicators: { position: 'top-left' },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
