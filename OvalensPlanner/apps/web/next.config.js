/** @type {import('next').NextConfig} */
const { withSentryConfig } = require("@sentry/nextjs");

const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: ["@helio/shared", "@helio/logger"],
  async rewrites() {
    const base = apiUrl.replace(/\/$/, "");
    return [
      {
        source: "/api/:path*",
        destination: `${base}/api/:path*`,
      },
      // Metrics: proxy to backend so GET /metrics works without auth (e.g. Prometheus scrape)
      {
        source: "/metrics",
        destination: `${base}/metrics`,
      },
    ];
  },
};

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || "",
  project: process.env.SENTRY_PROJECT || "",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
