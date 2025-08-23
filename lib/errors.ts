// lib/errors.ts
export function userSafe(internal?: unknown): string {
    // Optional: log internally in non-prod to help debugging
    if (process.env.NODE_ENV !== 'production' && internal) {
    
      console.error('[internal-error]', internal)
    }
    return 'Request failed'
  }
  