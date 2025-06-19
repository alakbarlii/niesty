import React from 'react';

const FlowCTA = () => {
  return (
    <section className="w-full bg-black text-white flex flex-col font-mono items-center text-center px-4 md:px-12 py-32">
      
      {/* Heading */}
      <section className="w-full text-center mt-16 px-4 sm:px-6 md:px-12 lg:px-20">
  <h2 className="font-inter font-inter text-[40px] sm:text-[55px] md:text-[64.8px] font-bold mb-12 text-white leading-tight tracking-tight">
    MADE SIMPLE.
  </h2>
</section>



      {/* Subtext Flow */}
      <p className="text-sm sm:text-base md:text-xl font-light flex flex-nowrap justify-center items-center gap-x-1 gap-y-1 mb-12 leading-snug px-2">
  <span>Search</span>
  <span className="text-lg sm:text-xl md:text-2xl font-black relative px-1">
    <span className="absolute inset-0 w-full h-full blur-[3px] opacity-30 bg-white rounded-full -z-10"></span>
    →
  </span>
  <span>pick a <span className="font-semibold">fit</span> you like</span>
  <span className="text-lg sm:text-xl md:text-2xl font-black relative px-1">
    <span className="absolute inset-0 w-full h-full blur-[3px] opacity-30 bg-white rounded-full -z-10"></span>
    →
  </span>
  <span>Close the <span className="font-semibold">DEAL</span></span>
</p>



      {/* Button with glow */}
      <div className="relative inline-block mt-3">
        <button
          className="relative z-10 w-[230px] h-[47px] bg-yellow-400 text-black font-bold text-xl rounded-lg hover:opacity-100 transition"
        >
          JOIN THE WAITLIST
        </button>
        <div className="absolute inset-0 z-0 blur-md bg-white opacity-50 rounded-lg pointer-events-none"></div>
      </div>

      <p className=" text-[14px] mt-[4px] font-normal opacity-70">
        Limited slots/week
      </p>
    </section>
  );
};

export default FlowCTA;
