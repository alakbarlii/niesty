// app/login/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { Turnstile } from '@marsidev/react-turnstile';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Pull site key at build time; if Vercel env is missing, this is ''
  const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

  // CAPTCHA token + widget refresh key
  const [captchaToken, setCaptchaToken] = useState<string>('');
  const [widgetKey, setWidgetKey] = useState(0);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErr(null);
    setLoading(true);

    try {
      const normalized = email.trim().toLowerCase();

      // Hard guard: widget misconfigured
      if (!SITE_KEY) {
        setErr('CAPTCHA misconfigured: missing NEXT_PUBLIC_TURNSTILE_SITE_KEY in Vercel env.');
        setLoading(false);
        return;
      }

      // Always require a token because Supabase Attack Protection is enabled
      if (!captchaToken) {
        setErr('Please complete the CAPTCHA.');
        setLoading(false);
        return;
      }

      // 1) Waitlist gate (server-protected)
      const res = await fetch(`/api/waitlist?email=${encodeURIComponent(normalized)}`, { cache: 'no-store' });
      const { ok } = await res.json();
      if (!ok) {
        setErr('This email is not registered in the waitlist.');
        setLoading(false);
        // refresh widget so next attempt gets a fresh token
        setWidgetKey((k) => k + 1);
        setCaptchaToken('');
        return;
      }

      // 2) Send magic link (with CAPTCHA token)
      console.log('[LOGIN] signInWithOtp captchaToken len =', captchaToken.length);
      const { error } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          captchaToken, // ALWAYS pass it
        },
      });

      if (error) {
        console.error('[signInWithOtp]', error);
        const msg = /captcha/i.test(error.message)
          ? 'CAPTCHA failed. Try again.'
          : (error.message || 'Something went wrong. Please try again.');
        setErr(msg);
        // refresh widget after error to avoid stale/duplicate token
        setWidgetKey((k) => k + 1);
        setCaptchaToken('');
      } else {
        setSent(true);
        // refresh widget after success too
        setWidgetKey((k) => k + 1);
        setCaptchaToken('');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Login failed.';
      console.error('[login]', e);
      setErr(msg);
      setWidgetKey((k) => k + 1);
      setCaptchaToken('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black via-[#0b0b0b] to-[#111] px-4">
      {/* centered & responsive width (matches WaitlistForm) */}
      <div className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-10 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
        <div className="flex flex-col items-center mb-10">
          <Image src="/niesty_header.png" alt="Niesty Logo" width={160} height={160} className="mb-5" />
          <h1 className="text-4xl font-extrabold text-white text-center mb-4 tracking-tight">
            Login to your Niesty!
          </h1>
          <p className="text-white/60 text-sm text-center leading-relaxed">
            Where creators and sponsors connect.<br />
            Every day with new sponsorship deals!
          </p>
        </div>

        {sent ? (
          <p className="text-green-400 text-center text-lg font-medium">
            Check your email for the login link.
          </p>
        ) : (
          <form onSubmit={handleLogin} className="space-y-5" aria-busy={loading}>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              disabled={loading}
            />

            {/* Turnstile widget: full-width + responsive; force refresh via key */}
            {SITE_KEY ? (
              <div key={widgetKey} className="w-full">
                <Turnstile
                  siteKey={SITE_KEY}
                  onSuccess={(token) => {
                    console.log('[LOGIN] Turnstile onSuccess len =', token?.length || 0);
                    setCaptchaToken(token || '');
                  }}
                  onExpire={() => {
                    console.log('[LOGIN] Turnstile expired');
                    setCaptchaToken('');
                  }}
                  onError={(e) => {
                    console.log('[LOGIN] Turnstile error', e);
                    setCaptchaToken('');
                  }}
                  options={{
                    theme: 'auto',
                    size: 'flexible', // <— makes iframe follow container width
                  }}
                />
              </div>
            ) : (
              <p className="text-red-400 text-sm text-center">
                CAPTCHA misconfigured: set <code>NEXT_PUBLIC_TURNSTILE_SITE_KEY</code> in Vercel and redeploy.
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-4 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 active:scale-95 transition-all duration-200 disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Get Login Link'}
            </button>
            {err && <p className="text-red-400 text-sm text-center">{err}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
