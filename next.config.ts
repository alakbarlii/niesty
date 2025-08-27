// next.config.ts
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  images: {
    // keep your Supabase storage domain; add others only if you really need them
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
              "base-uri 'self';",
              "frame-ancestors 'none';",
              "object-src 'none';",

              // Scripts: allow inline so Next can boot; keep Turnstile
              `script-src 'self' ${isDev ? "'unsafe-eval'" : ""} 'unsafe-inline' https://challenges.cloudflare.com;`,
              // (Optional hardening) forbid inline event handlers like onclick=
              "script-src-attr 'none';",

              // Styles: allow inline to stop your violations
              "style-src 'self' 'unsafe-inline' https:;",

              // Images: allow data: & blob: (Next/Supabase avatars/etc)
              "img-src 'self' data: blob: https:;",

              // Fonts
              "font-src 'self' data: https:;",

              // XHR/WebSocket: allow Supabase + Turnstile + generic https
              "connect-src 'self' https: wss: https://*.supabase.co https://challenges.cloudflare.com;",

              // Media/workers if ever used by libs
              "media-src 'self' blob: https:;",
              "worker-src 'self' blob:;",

              // Frames (for Turnstile)
              "frame-src 'self' https://challenges.cloudflare.com;",

              // Safer forms + upgrade mixed content
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