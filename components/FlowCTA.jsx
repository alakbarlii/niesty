'use client';
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const FlowCTA = () => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email || !role) {
      setError('Please fill out all fields.');
      return;
    }

    const { data, error } = await supabase.from('waitlist').insert([{ email, role }]);
    if (error) {
      setError('Failed to join waitlist.');
    } else {
      setSuccess(true);
      setTimeout(() => {
        setModalOpen(false);
        setEmail('');
        setRole('');
        setSuccess(false);
      }, 2000);
    }
  };

  return (
    <section className="w-full bg-black text-white flex flex-col font-mono items-center text-center px-4 md:px-12 py-32">
      {/* Heading */}
      <section className="w-full text-center mt-4 sm:mt-6 md:mt-8 px-4 sm:px-6 md:px-12 lg:px-20">
        <h2 className="font-inter text-[34px] sm:text-[50px] md:text-[64.8px] font-bold mb-20 text-white leading-tight tracking-tight">
          MADE SIMPLE.
        </h2>
      </section>

      {/* Subtext Flow */}
      <p className="text-sm sm:text-base md:text-xl font-light flex flex-nowrap justify-center items-center gap-x-1 gap-y-1 mb-12 leading-snug px-2">
        <span>Search</span>
        <span className="text-lg sm:text-xl md:text-3xl font-black relative px-1 tracking-wide">
          <span className="absolute inset-0 w-full h-full opacity-30 bg-white rounded-full -z-10"></span>→
        </span>
        <span>pick a <span className="font-semibold">fit</span> you like</span>
        <span className="text-lg sm:text-xl md:text-3xl font-black relative px-1 tracking-wide">
          <span className="absolute inset-0 w-full h-full opacity-30 bg-white rounded-full -z-10"></span>→
        </span>
        <span>Close the <span className="font-semibold">DEAL</span></span>
      </p>

      {/* Button with glow */}
      <div className="relative inline-block mt-3">
        <button
          onClick={() => setModalOpen(true)}
          className="relative z-10 w-[230px] h-[47px] bg-yellow-400 text-black font-bold text-xl rounded-lg hover:opacity-100 hover:scale-105 transition-transform duration-200"
        >
          JOIN THE WAITLIST
        </button>
        <div className="absolute inset-0 z-0 blur-md bg-white opacity-50 rounded-lg pointer-events-none"></div>
      </div>
      <p className="text-[14px] mt-[4px] font-normal opacity-70">Limited slots/week</p>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <div className="bg-white text-black p-6 rounded-lg w-[90%] max-w-md text-left space-y-4">
            <h3 className="text-xl font-bold">Join the Waitlist</h3>
            <input
              type="email"
              placeholder="Your email"
              className="w-full px-4 py-2 border rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select
              className="w-full px-4 py-2 border rounded"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="">Select your role</option>
              <option value="Content Creator">Content Creator</option>
              <option value="Business / Brand">Business / Brand</option>
            </select>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {success && <p className="text-green-600 text-sm">You’re in the waitlist!</p>}

            <div className="flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className="text-sm text-gray-600">Cancel</button>
              <button onClick={handleSubmit} className="bg-yellow-400 px-4 py-2 rounded font-bold text-black hover:bg-yellow-300">
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default FlowCTA;
