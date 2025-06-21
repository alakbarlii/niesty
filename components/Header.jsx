'use client'
import { useState } from 'react'
import Link from 'next/link';


export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="w-full bg-[#000322] py-5 px-5 sm:px-6 md:px-12 flex justify-between items-center relative">
      {/* Logo + Brand Name */}
      <div className="flex items-center">
  <img src="/niesty_header.png" alt="Niesty Logo" className="h-[70px] w-auto m-0 p-0 -translate-y-1" />
  <span className="text-white font-semibold text-[30px] leading-none -ml-3.5">Niesty.com</span>
</div>


      {/* Desktop Buttons */}
      <div className="hidden md:flex gap-5">
        <button className="w-[80px] h-[45px] border-[1px] border-[#FFD700] text-[#FFD700] text-1xl rounded-lg hover:bg-[#FFD700] hover:text-black transition">
          Login
        </button>
        <Link href="/waitlist">
        <button className="bg-yellow-400 text-black font-bold py-2 px-4 rounded-lg text-l.3xl hover:bg-yellow-300 transition">
          Join Now
        </button>
        </Link>
      </div>

      {/* Hamburger */}
      <button className="md:hidden focus:outline-none" onClick={() => setMenuOpen(!menuOpen)}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          {menuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile Dropdown */}
      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 bg-[#081421] flex flex-col items-stretch px-6 py-3 gap-3 border-t border-white/10 z-50 rounded-lg w-48 shadow-lg">
          <button className="w-full h-[45px] border-[1px] border-[#FFD700] text-[#FFD700] text-1xl rounded-md hover:bg-[#FFD700] hover:text-black transition text-left px-4">
            Login
          </button>
          <Link href="/waitlist">
          <button className="w-full bg-yellow-400 text-black font-bold py-2 px-4 rounded-md text-left hover:bg-yellow-300 transition">
            Join Now
          </button>
          </Link>
        </div>
      )}
    </header>
  )
}
