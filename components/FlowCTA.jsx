import React from 'react';

const FlowCTA = () => {
  return (
    <section className="w-full bg-black text-white flex flex-col items-center text-center px-4 md:px-12 py-32">
      
      {/* Heading */}
      <h2 className="relative text-[44px] sm:text-[52px] md:text-[60px] pb-6 font-semibold tracking-wider mb-10 leading-tight">
  <span className="absolute inset-0 blur-2xl opacity-30 font-extralight text-white z-[-1]">MADE SIMPLE.</span>
  MADE SIMPLE.
</h2>


      {/* Subtext Flow */}
      <p className="text-lg sm:text-xl md:text-4xl font-light flex flex-wrap justify-center items-center gap-x-3 gap-y-4 mb-16">
        <span>Search</span>
        <span className="text-2xl" font-black>→</span>
        <span>pick a <span className="font-bold">fit</span> you like</span>
        <span className="text-2xl" font-black>→</span>
        <span>Close the <span className="font-bold">DEAL</span></span>
      </p>

      {/* Button with glow */}
      <div className="relative inline-block mt-3">
        <button
          className="relative z-10 w-[230px] h-[50px] bg-[#FFD700] text-black font-bold text-xl rounded-lg hover:opacity-100 transition"
        >
          JOIN THE WAITLIST
        </button>
        <div className="absolute inset-0 z-0 blur-2xl bg-white opacity-50 rounded-lg pointer-events-none"></div>
      </div>

      <p className=" text-[14px] mt-[4px] font-normal opacity-70">
        Limited slots/week
      </p>
    </section>
  );
};

export default FlowCTA;
