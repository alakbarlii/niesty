import WaitlistForm from '@/components/WaitlistForm';

export default function WaitlistPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md p-8 rounded shadow border">
        <h1 className="text-2xl font-bold mb-4">Join the Waitlist</h1>
        <WaitlistForm />
      </div>
    </div>
  );
}
