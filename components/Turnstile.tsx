// components/Turnstile.tsx
'use client';

import { Turnstile } from '@marsidev/react-turnstile';

type Props = {
  onToken: (t: string | null) => void;
  className?: string;
};

export default function TurnstileWidget({ onToken, className }: Props) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!;
  if (!siteKey) console.error('[TS] Missing NEXT_PUBLIC_TURNSTILE_SITE_KEY');

  return (
    <div className={className ?? ' w-full my-3'}>
      <Turnstile
        siteKey={siteKey}
        onSuccess={(t) => {
          console.log('[TS] success, token len=', t?.length || 0);
          onToken(t || null);
        }}
        onExpire={() => {
          console.log('[TS] expired');
          onToken(null);
        }}
        onError={(e) => {
          console.log('[TS] error', e);
          onToken(null);
        }}
        options={{ theme: 'auto' }}
      />
    </div>
  );
}
