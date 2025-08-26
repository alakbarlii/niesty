// next.config.ts
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Permissions-Policy', value: 'geolocation=(), camera=(), microphone=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  // Minimal sane CSP that won’t block Supabase or your assets
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: blob: https:",
      "style-src 'self' 'unsafe-inline' https:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
      "connect-src 'self' https: wss: https://*.supabase.co",
      "frame-src https://challenges.cloudflare.com",
      "font-src 'self' https: data:",
      "media-src 'self' https: blob:",
    ].join('; ')
  },
]

module.exports = {
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
    ]
  },
}

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
              // ⬇️ allow inline scripts so Next.js can boot
              `script-src 'self' ${isDev ? "'unsafe-eval'" : ""} 'unsafe-inline' https://challenges.cloudflare.com;`,
              "frame-src https://challenges.cloudflare.com;",
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
