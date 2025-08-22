'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Turnstile } from '@marsidev/react-turnstile';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Show widget only if a site key exists
  const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

  // captcha token + force-refresh key (fresh token each attempt)
  const [captchaToken, setCaptchaToken] = useState('');
  const [widgetKey, setWidgetKey] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('');

    if (!role) {
      setError('Please select a role: Brand or Creator.');
      return;
    }

    // If we expect a captcha (SITE_KEY present), require a token
    if (SITE_KEY && !captchaToken) {
      setError('Please complete the CAPTCHA.');
      return;
    }

    const normalized = email.trim().toLowerCase();

    try {
      console.log('[WL] submit', { email: normalized, role, tokenLen: captchaToken?.length || 0 });

      // Check if already in waitlist
      const chk = await fetch(`/api/waitlist?email=${encodeURIComponent(normalized)}`, { cache: 'no-store' });
      let chkJson = {};
      try { chkJson = await chk.json(); } catch {}
      console.log('[WL] check exists', chk.status, chkJson);

      if (chk.ok && chkJson?.ok) {
        setError('This email is already registered.');
        setWidgetKey((k) => k + 1); // refresh widget for next attempt
        setCaptchaToken('');
        return;
      }

      // Submit (server verifies Turnstile if token provided)
      const res = await fetch('/api/waitlist/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalized,
          full_name: fullName,
          role,
          token: SITE_KEY ? captchaToken : undefined,
        }),
      });

      console.log('[WL] submit response', res.status);

      if (res.status === 405) {
        setError('Server route missing: /api/waitlist/submit (405). Deploy app/api/waitlist/submit/route.ts');
        setWidgetKey((k) => k + 1);
        setCaptchaToken('');
        return;
      }

      let j = {};
      try { j = await res.json(); } catch (e2) { console.warn('[WL] json parse failed', e2); }

      if (!res.ok || !j?.ok) {
        throw new Error(j?.error || `Submit failed (${res.status})`);
      }

      // fire-and-forget confirmation email
      fetch('/api/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email: normalized }),
      }).catch(() => {});

      setEmail('');
      setFullName('');
      setRole(null);
      setShowSuccess(true);
      setStatus('You’re on the waitlist!');

      setWidgetKey((k) => k + 1); // refresh widget after success
      setCaptchaToken('');
      console.log('[WL] success');
    } catch (err) {
      console.error('[WL] error', err);
      setError(err?.message || 'Something went wrong. Please try again.');
      setWidgetKey((k) => k + 1); // refresh widget after error
      setCaptchaToken('');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black via-[#0b0b0b] to-[#111] px-4">
      <div className="w-full max-w-xl bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-10">
        <div className="flex flex-col items-center mb-10">
          <Image src="/niesty_header.png" alt="Niesty Logo" width={160} height={160} className="mb-5" />
          <h1 className="text-4xl font-extrabold text-white text-center mb-2">Join Niesty!</h1>
          <p className="text-white/60 text-sm text-center leading-relaxed">
            Where creators and sponsors connect.<br />
            Every day with new sponsorship deals!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 w-full text-white relative z-10">
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-center">Who are you here as?</h2>
            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={() => setRole('business')}
                className={`px-4 py-2 rounded-lg font-semibold border transition ${
                  role === 'business'
                    ? 'bg-yellow-400 text-black border-yellow-400'
                    : 'bg-transparent border-white text-white hover:bg-white/10'
                }`}
              >
                Brand / Business
              </button>
              <button
                type="button"
                onClick={() => setRole('creator')}
                className={`px-4 py-2 rounded-lg font-semibold border transition ${
                  role === 'creator'
                    ? 'bg-yellow-400 text-black border-yellow-400'
                    : 'bg-transparent border-white text-white hover:bg-white/10'
                }`}
              >
                Content Creator
              </button>
            </div>
            <p className="text-sm text-center opacity-70">
              Choose the role that describes you best. We'll tailor Niesty to fit your needs.
            </p>
          </div>

          {/* Turnstile widget — render if site key exists; responsive width */}
          {SITE_KEY ? (
            <div key={widgetKey}>
            <Turnstile
              siteKey={SITE_KEY}
              options={{ action: 'waitlist_submit', cData: 'wl_waitlist', theme: 'auto', size: 'flexible' }}
              onSuccess={(token) => {
                console.log('[WL] Turnstile onSuccess len=', token?.length || 0);
                setCaptchaToken(token || '');
          
                // DEV helper: stash & copy token when debug flag is on
                if (process.env.NEXT_PUBLIC_DEBUG_CAPTCHA === '1') {
                  try {
                    window.__WL_TOKEN__ = token || '';
                    if (token && navigator?.clipboard?.writeText) {
                      navigator.clipboard.writeText(token);
                      console.log('[WL] token copied to clipboard');
                    }
                  } catch (e) {
                    console.warn('[WL] token copy failed', e);
                  }
                }
              }}
              onExpire={() => {
                console.log('[WL] Turnstile expired');
                setCaptchaToken('');
              }}
              onError={(e) => {
                console.log('[WL] Turnstile error', e);
                setCaptchaToken('');
              }}
              className="w-full"
            />
          </div>
          
          ) : (
            <p className="text-red-400 text-sm text-center">
              CAPTCHA misconfigured: set <code>NEXT_PUBLIC_TURNSTILE_SITE_KEY</code> in Vercel and redeploy.
            </p>
          )}

          <button
            type="submit"
            className="w-full py-4 bg-yellow-400 text-black font-bold rounded-xl text-xl hover:bg-yellow-300"
          >
            Join the Waitlist
          </button>

          {status && <p className="text-green-400 text-sm text-center">{status}</p>}
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </form>

        {showSuccess && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="text-center bg-white text-black rounded-xl p-6 w-[90%] max-w-md shadow-xl">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-2">You’re on the waitlist!</h2>
              <p className="text-base opacity-80">
                We’ll notify you when early access opens. Thank you for joining Niesty!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
