import React from 'react';

const About = () => {
  return (
    <section className="flex flex-col md:flex-row items-center justify-between gap-16 px-6 md:px-32 py-24 bg-black text-white">
      
      {/* Left: Founder Image with soft glow */}
      <div className="relative w-[300px] md:w-[300px] lg:w-[420px] ml-4 md:ml-12 lg:ml-20">

        {/* Glow like CTA button */}
        <span className="absolute inset-0 rounded-md bg-white blur-2xl opacity-30 scale-125 z-[-1]"></span>
        
        {/* Image */}
        <img
          src="/Alakbarli.jpg"
          alt="Ibrahim Alakabarli, Founder"
          className="w-full h-auto rounded-md relative z-10"
        />

        {/* Founder Badge */}
        <div className="flex justify-center mt-4">
          <div className="inline-flex items-center gap-2 bg-white text-black text-base md:text-lg font-semibold px-5 py-2 rounded-full shadow-md border border-gray-200">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-yellow-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 15l-5.878 3.09 1.122-6.545L.487 6.91l6.561-.955L10 0l2.952 5.955 6.561.955-4.757 4.635 1.122 6.545z" />
            </svg>
            Ibrahim Alakabarli, <span className="text-gray-600 font-medium">Founder</span>
          </div>
        </div>
      </div>

      {/*  Right: About Text */}
      <div className="flex-1 text-center max-w-[90ch] md:text-center space-y-8 text-[1.2rem] md:text-[2.3rem] leading-relaxed">

        <p>
          <strong className="text-white">Niesty</strong> is designed for connecting small to mid-sized content creators and brands/businesses that are looking for sponsorship deals.
        </p>
        <p>
          Everyone’s here for{' '}
          <span className="font-bold text-white relative inline-block">
            one reason:
            <span className="absolute left-0 bottom-0 w-full h-[2px] bg-yellow-400"></span>
          </span>
        </p>
        <p>
          to find and secure the <strong className="text-white">right</strong> partnership.
        </p>
      </div>
    </section>
  );
};

export default About;
