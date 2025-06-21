import WaitlistForm from '@/components/WaitlistForm';
import Link from 'next/link';
import Image from 'next/image';


export default function WaitlistPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-xl shadow-lg p-10 space-y-6">
        <div className="text-center">

        <Image
        src="/niesty_header.png"
         alt="Niesty Logo"
          width={100} // You can adjust this
          height={60}
          className="mx-auto mb-4" />
          
          <h1 className="text-4xl font-bold">Join Niesty!</h1>
          <p className="text-sm mt-2 opacity-70">
            Get matched with perfect-fit creators or businesses. Claim your early access now.
          </p>
        </div>

        <WaitlistForm />

        <div className="text-center mt-4">
          <Link href="/" className="text-yellow-400 hover:underline text-sm">
            ← Back
          </Link>
        </div>
      </div>
    </div>
  );
}
