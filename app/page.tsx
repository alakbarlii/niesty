'use client';

import { useEffect, useState } from 'react';

import Header from '../components/Header';
import Hero from '../components/Hero';
import About from '../components/About';
import FlowCTA from '../components/FlowCTA';
import Footer from '../components/Footer';

export default function Home() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return null;

  return (
    <main className="flex justify-center bg-black text-white w-screen overflow-x-hidden">
      <div className="w-full max-w-[1440px] flex flex-col min-h-screen">
        <Header />
        <Hero />
        <About />
        <FlowCTA />
        <Footer />
      </div>
    </main>
  );
}
