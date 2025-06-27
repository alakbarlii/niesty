'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('');

    if (!role) {
      setError('Please select a role: Brand or Creator.');
      return;
    }

    try {
      const { data: existing, error: selectError } = await supabase
        .from('waitlist')
        .select('id')
        .eq('email', email);

      if (selectError) {
        console.error('Select error:', selectError);
        setError('Server error. Try again.');
        return;
      }

      if (existing.length > 0) {
        setError('This email is already registered.');
        return;
      }

      const { error: insertError } = await supabase
        .from('waitlist')
        .insert([{ email, full_name: fullName, role }]);

      if (insertError) {
        console.error('Insert error:', insertError);
        setError('Server error. Try again.');
        return;
      }

      try {
        await fetch('/api/send-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName, email }),
        });
      } catch (emailError) {
        console.error('Email send failed:', emailError);
      }

      setEmail('');
      setFullName('');
      setRole(null);
      setShowSuccess(true);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Unexpected error. Please try again.');
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
          <h1 className="text-4xl font-extrabold text-white text-center mb-2 tracking-tight">Join Niesty!</h1>
          <p className="text-white/60 text-sm text-center leading-relaxed">
            Get matched with perfect-fit creators or businesses.<br />
            Claim your early access now.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 w-full text-white relative z-10">
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full p-4 rounded-xl border border-white/20 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-4 rounded-xl border border-white/20 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
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

          <button
            type="submit"
            className="w-full py-4 bg-yellow-400 text-black font-bold rounded-xl text-xl hover:bg-yellow-300 active:scale-95 transition-all duration-200"
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
