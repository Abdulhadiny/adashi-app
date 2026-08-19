import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The postgres.js / Node DB driver must never be bundled for the browser or edge.
  // All DB access lives in server components, route handlers, and server actions.
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
