import Image from 'next/image';

export default function Hero() {
  return (
    <section className="bg-black text-white py-16 px-4 sm:px-6 md:px-12 mt-[60px] lg:px-20 text-center font-normal">
      <h1 className="text-[64.8px] font-bold leading-tight">
        SKIP THE GUESSWORK!
      </h1>

      <p className="text-[20px] font-semibold mt-[14.5px] opacity-70">
        We match brands/businesses with perfect-fit creators.
      </p>

      <div className="relative inline-block mt-10">
        <button
          className="relative z-10 w-[230px] h-[47px] bg-[#FFD700] text-black font-bold text-xl rounded-lg hover:opacity-100 transition"
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
}
