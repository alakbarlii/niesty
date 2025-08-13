// app/login/page.tsx
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
    setErr(null);
    setLoading(true);

    const normalized = email.trim().toLowerCase();

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setErr(error.message);
      else setSent(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black via-[#0b0b0b] to-[#111] px-4">
      <div className="w-full max-w-xl bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-10">
        <div className="flex flex-col items-center mb-10">
          <Image src="/niesty_header.png" alt="Niesty Logo" width={160} height={160} className="mb-5" />
          <h1 className="text-4xl font-extrabold text-white text-center mb-4.5">Login to Niesty</h1>
        </div>

        {sent ? (
          <p className="text-green-400 text-center text-lg font-medium">Check your email for the login link.</p>
        ) : (
          <form onSubmit={handleLogin} className="space-y-5">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-yellow-400 text-black font-bold rounded-xl disabled:opacity-60"
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