import React from 'react';

const Footer = () => {
  return (
    <footer className="w-full bg-[#030B1A] text-white px-6 md:px-16 py-12 text-center md:text-left">

      {/* Top Message */}
      <div className="text-center text-gray-300 italic text-sm mb-1">
        Built with love for the creator economy.
      </div>

      {/* Main Row */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-10 md:gap-0">
        
        {/* Left: Site Name */}
        <div className="text-white text-2xl font-bold" >NIESTY.COM</div>

        {/* Right: Logo and Log in */}
        <div className="flex flex-col items-center gap-2">
          <img
            src="/niesty_header.png"  
            className="w-30 h-30 object-contain"
          />
          <div className="text-yellow-300 font-medium text-sm">Log in</div>
        </div>
      </div>

      {/* Links */}
      <div className="flex flex-wrap justify-center gap-6 text-yellow-300 text-sm font-medium mb-8">
        <a href="#">Privacy Policy</a>
        <a href="#">Cookie Policy</a>
        <a href="#">Terms and Conditions</a>
        <a href="#">Contact Us</a>
        <a href="#">About Ibrahim Alakbarli</a>
      </div>

      {/* Bottom Legal Disclaimer */}
      <div className="text-gray-400 text-xs space-y-1  text-center leading-relaxed">
        <p>Niesty provides a platform for creators and sponsors to connect.</p>
        <p>Niesty team does not guarantee results, earnings, or sponsorship agreements.</p>
      </div>
    </footer>
  );
};

export default Footer;
