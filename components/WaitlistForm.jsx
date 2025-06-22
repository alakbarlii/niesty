'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false); // ✅

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('');

    if (!role) {
      setError('Please select a role: Brand or Creator.');
      return;
    }

    const { data: existing, error: checkError } = await supabase
      .from('waitlist')
      .select('id')
      .eq('email', email);

    if (checkError) {
      setError('Something went wrong. Please try again.');
      console.error('Check error:', checkError);
      return;
    }

    if (existing && existing.length > 0) {
      setError('This email is already registered.');
      return;
    }

    const { error: insertError } = await supabase
      .from('waitlist')
      .insert([{ email, full_name: [fullName], role }]);

    if (insertError) {
      console.error('Insert error:', insertError);
      setError('Something went wrong. Please try again.');
      return;
    }

    try {
      await fetch('/api/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email }),
      });
    } catch (e) {
      console.error('⚠️ Email failed to send:', e);
    }

    setEmail('');
    setFullName('');
    setRole(null);
    setShowSuccess(true); // ✅ show success overlay
  };

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className="space-y-6 w-full text-white relative z-10">
        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full p-3 rounded border border-white/20 bg-transparent text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-3 rounded border border-white/20 bg-transparent text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
          className="w-full py-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-300 transition"
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
              We’ll notify you when early access opens. Thank you for joining Niesty!.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
