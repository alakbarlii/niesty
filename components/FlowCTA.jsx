import React from 'react';
import Link from 'next/link';


const FlowCTA = () => {
  return (
    <section className="w-full bg-black text-white flex flex-col font-mono items-center text-center px-4 md:px-12 py-32">

      {/* Heading */}
      <section className="w-full text-center mt-3 sm:mt-5 md:mt-6 px-4 sm:px-6 md:px-12 lg:px-20">
  <h2 className="font-inter font-inter text-[34px] sm:text-[50px] md:text-[64.8px] font-bold mb-15 text-white leading-tight tracking-tight">
    MADE SIMPLE.
  </h2>
</section>

      {/* Subtext Flow */}
      <p className="text-sm sm:text-base md:text-xl font-light flex flex-nowrap justify-center items-center gap-x-1 gap-y-1 mb-6 leading-snug px-2">
  <span>Search</span>
  <span className="text-lg sm:text-xl md:text-3xl font-black relative px-1 tracking-wide">
    <span className="absolute inset-0 w-full h-full opacity-30 bg-white rounded-full -z-10"></span>
    →
  </span>
  <span>pick a <span className="font-semibold">fit</span> you like</span>
  <span className="text-lg sm:text-xl md:text-3xl  font-black relative px-1 tracking-wide">
    <span className="absolute inset-0 w-full h-full opacity-30 bg-white rounded-full -z-10"></span>
    →
  </span>
  <span>Close the <span className="font-semibold">DEAL</span></span>
</p>



      {/* Button with glow */}
      <div className="mt-6 flex flex-col items-center justify-center space-y-2">
  <div className="relative">
  <Link href="/waitlist">
    <button
      className="relative z-10 w-[230px] h-[47px] bg-yellow-400 text-black font-bold text-xl rounded-lg hover:opacity-100 hover:scale-105 transition-transform duration-200"
    >
      JOIN THE WAITLIST
    </button>
    </Link>
    <div className="absolute inset-0 z-0 blur-md bg-white opacity-50 rounded-lg pointer-events-none"></div>
  </div>

  <p className="text-[14px] font-normal opacity-70">
    Limited slots/week
  </p>
</div>
    </section>
  );
};

export default FlowCTA;