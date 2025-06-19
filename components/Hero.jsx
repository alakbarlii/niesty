'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Hero() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Content Creator'); // default option
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!email) return;

    setLoading(true);
    const { error } = await supabase.from('waitlist').insert([
      { Email: email, Role: role },
    ]);

    setLoading(false);

    if (!error) {
      setSuccess(true);
      setEmail('');
    } else {
      alert('Something went wrong. Try again.');
    }
  };

  return (
    <section className="bg-black text-white py-16 px-4 sm:px-6 md:px-12 mt-[60px] lg:px-20 text-center font-normal">
      <h1 className="font-inter text-[45px] sm:text-[55px] md:text-[64.8px] font-bold leading-tight">
        SKIP THE GUESSWORK!
      </h1>

      <p className="text-[20px] font-semibold mt-[8px] opacity-70">
        We match brands/businesses with perfect-fit creators.
      </p>

      {/* Input Fields */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mt-10">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-[250px] h-[47px] px-4 rounded-md text-black text-md"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-[230px] h-[47px] px-3 rounded-md text-black text-md"
        >
          <option>Content Creator</option>
          <option>Business / Brand</option>
        </select>
        <div className="relative inline-block">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="relative z-10 w-[230px] h-[47px] bg-yellow-400 text-black font-bold text-xl rounded-lg hover:scale-105 transition-transform duration-200"
          >
            {loading ? 'Joining...' : success ? 'Joined ✅' : 'JOIN THE WAITLIST'}
          </button>
          <div className="absolute inset-0 z-0 blur-md bg-white opacity-50 rounded-lg pointer-events-none"></div>
        </div>
      </div>

      <p className="text-[14px] mt-[4px] font-normal opacity-70">
        Limited slots/week
      </p>
    </section>
  );
}
