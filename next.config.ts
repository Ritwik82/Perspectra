import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The system prompt is read from disk at request time. Without this, a
  // production build will not include prompt/ in the server bundle.
  outputFileTracingIncludes: {
    "/api/analyze": ["./prompt/**"],
  },
  // Next 16 writes an AGENTS.md into the project root by default.
  agentRules: false,
  // No dev overlay badge — this screen gets projected and screenshotted.
  devIndicators: false,
};

export default nextConfig;
