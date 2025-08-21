import { NextResponse } from 'next/server';

export async function GET() {
  const host = process.env.VERCEL_URL || 'local';
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
  return NextResponse.json({
    host,
    feature: process.env.NEXT_PUBLIC_FEATURE_TURNSTILE || '0',
    siteKeyPrefix: siteKey ? siteKey.slice(0, 8) : '',
    siteKeyLen: siteKey.length,
  });
}
