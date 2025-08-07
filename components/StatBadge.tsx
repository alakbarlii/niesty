'use client';
export default function StatBadge({ label, value }: { label: string, value: string | number }) {
    return (
      <div className="bg-white/10 border border-white/20 px-4 py-2 rounded-xl text-center">
        <div className="text-xl font-bold text-yellow-400">{value}</div>
        <div className="text-xs text-white/70 uppercase tracking-widest mt-1">{label}</div>
      </div>
    );
  }