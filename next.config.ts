// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["kjoiummoobdqrsfkoqva.supabase.co"],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self';",
              // Turnstile requires these:
              "script-src 'self' https://challenges.cloudflare.com;",
              "frame-src https://challenges.cloudflare.com;",
              // hygiene
              "style-src 'self' 'unsafe-inline';",
              "img-src 'self' data: https:;",
              "font-src 'self' data:;",
              "connect-src 'self' https:;",
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
        ],
      },
    ];
  },
};

export default nextConfig;
