
import Link from 'next/link';

export default function Hero() {
  return (
    <section className="bg-black text-white py-16 px-4 sm:px-6 md:px-12 mt-[60px] lg:px-20 text-center font-normal">
 <h1 className="font-inter text-[45px] sm:text-[55px] md:text-[64.8px] font-bold leading-tight">
  SKIP THE GUESSWORK!
</h1>


      <p className="text-[20px] font-semibold mt-[8px] opacity-70">
        We match brands/businesses with perfect-fit creators.
      </p>

      <div className="mt-10 flex flex-col items-center justify-center space-y-2">
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
}