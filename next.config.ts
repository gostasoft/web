import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Vinext inspects multipart POSTs before dispatching route handlers.
      // Allow the 10 MB CMS image plus its multipart envelope through that
      // pre-parser; the upload route still enforces its own 10 MB file cap.
      bodySizeLimit: "11mb",
    },
  },
};

export default nextConfig;
