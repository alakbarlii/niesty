// components/Turnstile.tsx
'use client';

import { useEffect, useRef } from 'react';
import { Turnstile as CFTurnstile } from '@marsidev/react-turnstile';

type Props = {
  /** Receive the token (or null on expire/error). */
  onToken: (t: string | null) => void;
  className?: string;
  /** Optional Turnstile action string, helps with analytics/policies. */
  action?: string;
  /** If true, widget won't render; a single 'dev-ok' will be sent instead. */
  disabled?: boolean;
  /** If true (default), auto-sends 'dev-ok' in dev/no-key mode exactly once. */
  autoDev?: boolean;
};

export default function TurnstileWidget({
  onToken,
  className,
  action = 'send_deal',
  disabled = false,
  autoDev = true,
}: Props) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
  const sentDevRef = useRef(false);

  // In dev/no-key or when disabled, auto-satisfy caller once.
  useEffect(() => {
    const noKey = !siteKey || siteKey.trim().length === 0;
    if ((disabled || noKey) && autoDev && !sentDevRef.current) {
      sentDevRef.current = true;
      // Matches server-side bypass token expectation.
      onToken('dev-ok');
      // Optional: clear after a tick so future checks treat it as consumed
      // (keeps UX identical to real widget: success then "idle")
      setTimeout(() => onToken(null), 0);
    }
  }, [autoDev, disabled, onToken, siteKey]);

  // If disabled or no site key, show nothing (we already delivered dev-ok).
  if (disabled || !siteKey) {
    return null;
  }

  return (
    <div className={className ?? 'w-full my-3'}>
      <CFTurnstile
        siteKey={siteKey}
        options={{ action, theme: 'auto' }}
        onSuccess={(t) => {
          // Token is short-lived; hand it to caller immediately.
          console.log('[Turnstile] success; token length =', t?.length ?? 0);
          onToken(t || null);
        }}
        onExpire={() => {
          console.log('[Turnstile] expired');
          onToken(null);
        }}
        onError={(e) => {
          console.warn('[Turnstile] error', e);
          onToken(null);
        }}
      />
    </div>
  );
}
