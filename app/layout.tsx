// app/layout.tsx
import './globals.css'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers'
import { SupabaseProvider } from '@/lib/supabase/supabase-provider'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  
  const h = await headers()
  const nonce = h.get('x-csp-nonce') ?? undefined

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        {nonce ? <meta name="csp-nonce" content={nonce} /> : null}

        {/* Load Cloudflare Turnstile client script globally */}
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
          nonce={nonce}
        />
      </head>
      <body className={inter.className}>
        <SupabaseProvider>{children}</SupabaseProvider>
      </body>
    </html>
  )
}