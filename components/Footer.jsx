import React from 'react';

const Footer = () => {
  return (
    <footer className="w-full bg-[#000322] text-white px-6 md:px-16 py-10 text-center md:text-left">

      {/* Top Message */}
      <div className="text-center text-gray-300 italic text-sm mb-2 mt-2">
        Built with love for the creator economy.
      </div>

      {/* Main Row */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 sm:mb-10 gap-10 md:gap-0">
        {/* Left: Site Name */}
        <div className="text-white text-2xl font-bold">NIESTY.COM</div>

        {/* Right: Logo and Log in */}
        <div className="flex flex-col items-center justify-center space-y-0">
          <img src="/niesty_header.png" alt="Niesty Logo" className="h-[60px] w-auto" />
          <button className="text-yellow-300 hover:underline transition duration-150 mb-2">
            Login
          </button>
        </div>
      </div>

      {/* Links */}
      <div className="flex flex-wrap justify-center gap-6 text-yellow-300 text-sm font-medium  mb-6 sm:mb-8 mt-7 sm:mt-10">
        <a href="#" className="hover:underline transition duration-150">Privacy Policy</a>
        <a href="#" className="hover:underline transition duration-150">Cookie Policy</a>
        <a href="#" className="hover:underline transition duration-150">Terms and Conditions</a>
        <a href="#" className="hover:underline transition duration-150">Contact Us</a>
        <a href="#" className="hover:underline transition duration-150">About Ibrahim Alakbarli</a>
      </div>

      {/* Bottom Legal Disclaimer */}
      <div className="text-gray-400 text-xs space-y-1 text-center leading-relaxed">
        <p>Niesty provides a platform for creators and sponsors to connect.</p>
        <p>Niesty team does not guarantee results, earnings, or sponsorship agreements.</p>
      </div>
    </footer>
  );
};

export default Footer;
