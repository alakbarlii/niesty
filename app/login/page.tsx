
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // guard double-submit
    setErr(null);
    setLoading(true);

    try {
      const normalized = email.trim().toLowerCase();

      // 1) Waitlist gate (server-protected using service role)
      const res = await fetch(
        `/api/waitlist?email=${encodeURIComponent(normalized)}`,
        { cache: 'no-store' }
      );
      const { ok } = await res.json();
      if (!ok) {
        setErr('This email is not registered in the waitlist.');
        setLoading(false);
        return;
      }

      // 2) Send magic link
      const { error } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });

      if (error) {
        console.error('[signInWithOtp]', error);
        setErr(error.message || 'Something went wrong. Please try again.');
      } else {
        setSent(true);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Login failed.';
      console.error('[login]', e);
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black via-[#0b0b0b] to-[#111] px-4">
      <div className="w-full max-w-xl bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-10 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
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