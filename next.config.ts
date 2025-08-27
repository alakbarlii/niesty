// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    domains: ['kjoiummoobdqrsfkoqva.supabase.co'],
  },
  // Do NOT set CSP here — it’s set in middleware.ts
}

export default nextConfig