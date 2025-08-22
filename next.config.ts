// next.config.ts
import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self';",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com;",
      "script-src-elem 'self' https://challenges.cloudflare.com;",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
      "font-src 'self' data: https://fonts.gstatic.com;",
      "img-src 'self' data: blob: https:;",
      "connect-src 'self' https: wss:;",
      "frame-src https://challenges.cloudflare.com;",
      "worker-src 'self' blob:;",
      "object-src 'none';",
      "base-uri 'self';",
      "frame-ancestors 'none';",
      "form-action 'self';",
      "upgrade-insecure-requests;",
    ].join(" "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
];

const nextConfig: NextConfig = {
  images: {
    domains: ["kjoiummoobdqrsfkoqva.supabase.co"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
