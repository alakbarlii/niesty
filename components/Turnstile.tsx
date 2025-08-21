'use client';

import { Turnstile } from '@marsidev/react-turnstile';

export default function TurnstileWidget() {
  return (
    <div className="my-3">
      <Turnstile siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!} />
    </div>
  );
}
