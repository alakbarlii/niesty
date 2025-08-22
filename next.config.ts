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
              // allow Next inline boot + Turnstile + Dev HMR (unsafe-eval ok in prod too for now)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com;",
              "script-src-elem 'self' https://challenges.cloudflare.com;",
              // styles + Google Fonts
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
              "font-src 'self' data: https://fonts.gstatic.com;",
              // images (local/data/blob/remote)
              "img-src 'self' data: blob: https:;",
              // APIs (Supabase, analytics, etc.) + Realtime (wss)
              "connect-src 'self' https: wss:;",
              // Turnstile iframe
              "frame-src https://challenges.cloudflare.com;",
              // workers (Next/Supabase)
              "worker-src 'self' blob:;",
              // hardening
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
