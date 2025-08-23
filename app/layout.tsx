import './globals.css'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers'
import { SupabaseProvider } from '@/lib/supabase/supabase-provider'

const inter = Inter({ subsets: ['latin'] })

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Await headers() properly
  const h = await headers()
  const nonce = h.get('x-csp-nonce') || undefined

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        {/* Expose nonce if you need inline <script>/<style> */}
        {nonce ? <meta name="csp-nonce" content={nonce} /> : null}
      </head>
      <body className={inter.className}>
        <SupabaseProvider>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  )
}
