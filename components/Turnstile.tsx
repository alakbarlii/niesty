// components/Turnstile.tsx
'use client';

import { useEffect } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';

type Props = {
  onToken: (t: string | null) => void;
  className?: string;
  /** Optional: pass the action name so you can later check it server-side if you want */
  action?: string;
};

export default function TurnstileWidget({ onToken, className, action }: Props) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // If no site key is configured (dev/preview/local), hand back a dev token so the API can bypass.
  useEffect(() => {
    if (!siteKey) {
      console.warn('[Turnstile] No NEXT_PUBLIC_TURNSTILE_SITE_KEY set; using dev-ok fallback.');
      onToken('dev-ok');
    }
  }, [siteKey, onToken]);

  if (!siteKey) {
    // No widget to render; we already provided "dev-ok".
    return (
      <div className={className ?? 'w-full my-3'}>
        <div className="text-xs text-gray-400">
          Verification disabled (no site key). Using dev bypass.
        </div>
      </div>
    );
  }

  return (
    <div className={className ?? 'w-full my-3'}>
      <Turnstile
        siteKey={siteKey}
        options={{ theme: 'auto', action: action ?? 'send_deal' }}
        onSuccess={(t) => {
          console.log('[Turnstile] success, token len=', t?.length || 0);
          onToken(t || null);
        }}
        onExpire={() => {
          console.log('[Turnstile] expired');
          onToken(null);
        }}
        onError={(e) => {
          console.log('[Turnstile] error', e);
          onToken(null);
        }}
      />
    </div>
  );
}
