'use client';

export default function Header() {
  return (
    
    <header className="w-full bg-[#08142f] py-5 px-5 sm:px-6 md:px-12 lg:px-20 flex justify-between items-center">
    
      {/* Logo + Brand Name */}
      <div className="flex items-center gap-0">
        <img src="/niesty_header.png" alt="Niesty Logo" className="h-[60px] w-auto" />
        <span className="text-white font-semibold text-[30px]">Niesty.com</span>
      </div>

      {/* Auth Buttons */}
      <div className="flex gap-5">
      <button className="w-[100px] h-[45px] border-1 border-[#FFD700] text-[#FFD700] text-xl rounded-lg hover:bg-[#FFD700] hover:text-black transition">Login</button>
        <button className="bg-yellow-400 text-black font-bold py-2 px-4 rounded-lg hover:bg-yellow-300 transition">
          Join Now
        </button>
      </div>
    </header>
  );
}
