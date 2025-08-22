// next.config.ts
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// ⚠️ your actual Supabase project ref domain:
const SUPABASE = "https://kjoiummoobdqrsfkoqva.supabase.co";

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

              // Next + Turnstile + (dev) eval for HMR
              `script-src 'self' ${isDev ? "'unsafe-eval'" : ""} 'unsafe-inline' https://challenges.cloudflare.com;`,
              "script-src-elem 'self' https://challenges.cloudflare.com;",

              // Turnstile iframe
              "frame-src https://challenges.cloudflare.com;",

              // Fonts + inline styles (Next/ Tailwind)
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",

              // Images (local, data, remote)
              "img-src 'self' data: blob: https:;",

              // Fonts (local + Google)
              "font-src 'self' data: https://fonts.gstatic.com;",

              // **Critical**: Supabase + HTTPS + WebSockets for realtime
              `connect-src 'self' ${SUPABASE} wss://kjoiummoobdqrsfkoqva.supabase.co https:;`,

              // Workers used by Next/Supabase in some paths
              "worker-src 'self' blob:;",

              // Harden the rest
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
