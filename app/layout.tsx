// app/layout.tsx
import "./globals.css";
import { Inter } from "next/font/google";
import { SupabaseProvider } from "@/lib/supabase/supabase-provider";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* TEMP: force CSP in-document so page boots; we can tighten later */}
        <meta
          httpEquiv="Content-Security-Policy"
          content={[
            "default-src 'self';",
            // Next app + inline chunks + Cloudflare Turnstile
            "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com;",
            "script-src-elem 'self' https://challenges.cloudflare.com;",
            // Styles + Google Fonts
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
            "font-src 'self' data: https://fonts.gstatic.com;",
            // Images (local, data, blob, remote)
            "img-src 'self' data: blob: https:;",
            // API/WS calls (Supabase etc.)
            "connect-src 'self' https: wss:;",
            // Turnstile iframe
            "frame-src https://challenges.cloudflare.com;",
            // Next/Supabase workers
            "worker-src 'self' blob:;",
            // Hardening
            "object-src 'none';",
            "base-uri 'self';",
            "frame-ancestors 'none';",
            "form-action 'self';",
            "upgrade-insecure-requests;",
          ].join(" ")}
        />
      </head>
      <body className={inter.className}>
        <SupabaseProvider>{children}</SupabaseProvider>
      </body>
    </html>
  );
}
