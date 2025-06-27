'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();

    //  STEP 1: Check if user exists in waitlist
    const { data: userCheck, error: checkError } = await supabase
      .from('waitlist')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      console.error('Check error:', checkError);
      setLoading(false);
      return alert('Something went wrong. Please try again.');
    }

    if (!userCheck) {
      setLoading(false);
      return alert('This email is not registered yet. Please join the waitlist first.');
    }

    //  STEP 2: Send login link
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/dashboard`,
      },
    });

    setLoading(false);
    if (!error) setSent(true);
    else {
      console.error(error);
      alert('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black via-[#0b0b0b] to-[#111] px-4">
      <div className="w-full max-w-xl bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-10 shadow-[0_0_30px_rgba(255,255,255,0.05)] transition-all duration-300">
        <div className="flex flex-col items-center mb-10">
          <Image
            src="/niesty_header.png"
            alt="Niesty Logo"
            width={160}
            height={160}
            className="mb-5"
          />
          <h1 className="text-4xl font-extrabold text-white text-center mb-4.5 tracking-tight">Login to your Niesty!</h1>
          <p className="text-white/60 text-sm text-center leading-relaxed">
            Where creators and sponsors rise together.<br />
            Every day with new sponsorship deals.
          </p>
        </div>

        {sent ? (
          <p className="text-green-400 text-center text-lg font-medium">
             Check your email for the login link!
          </p>
        ) : (
          <form onSubmit={handleLogin} className="space-y-5">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 active:scale-95 transition-all duration-200"
            >
              {loading ? 'Sending...' : 'Get Login Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
