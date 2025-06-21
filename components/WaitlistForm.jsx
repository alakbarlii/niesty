'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('creator');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('');

    // Check if email already exists
    const { data: existing, error: fetchError } = await supabase
      .from('waitlist')
      .select('id')
      .eq('email', email);

    if (existing && existing.length > 0) {
      setError(' This email is already registered.');
      return;
    }

    // Insert new entry
    const { error: insertError } = await supabase
      .from('waitlist')
      .insert([
        {
          email: email,
          full_name: fullName,
          role: role,
        },
      ]);

    if (insertError) {
      setError('Something went wrong. Please try again.');
    } else {
      setStatus('🎉 You’re on the waitlist! We’ll email you when it opens.');
      setEmail('');
      setFullName('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        placeholder="Full Name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
        className="w-full p-2 border rounded"
      />
      <input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full p-2 border rounded"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="w-full p-2 border rounded"
      >
        <option value="creator">Content Creator</option>
        <option value="business">Business / Brand</option>
      </select>

      <button
        type="submit"
        className="bg-black text-white px-4 py-2 rounded w-full hover:scale-105 transition"
      >
        Join the Waitlist
      </button>

      {status && <p className="text-green-600">{status}</p>}
      {error && <p className="text-red-600">{error}</p>}
    </form>
  );
}
