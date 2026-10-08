/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  outputFileTracingRoot: require("node:path").join(__dirname, "../.."),
  transpilePackages: ["@finsight/shared"],
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // Dynamic hosted/auth routes receive their nonce policy from middleware.
        source:
          "/:path((?!app(?:/|$)|sign-in(?:/|$)|sign-up(?:/|$)|auth(?:/|$)|dashboard(?:/|$)|transactions(?:/|$)|budgets(?:/|$)|goals(?:/|$)|accounts(?:/|$)|insights(?:/|$)|settings(?:/|$)|onboarding(?:/|$)|workspaces(?:/|$)|members(?:/|$)|audit(?:/|$)|security(?:/|$)|invitations(?:/|$)|recurring(?:/|$)|billing(?:/|$)|shared-reports(?:/|$)).*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'" +
              (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "") +
              "; connect-src 'self'" +
              (process.env.NODE_ENV === "development" ? " ws: wss:" : ""),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
