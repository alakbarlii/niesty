'use client';

import { BellRing } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Notification {
  id: string;
  message: string;
  created_at: string;
}

export default function Page() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      // Replace with real Supabase call in production
      setLoading(true);
      setTimeout(() => {
        setNotifications([]); // Set to array of mock notifications if needed
        setLoading(false);
      }, 500);
    };

    fetchNotifications();
  }, []);

  return (
    <section className="p-6 md:p-10 max-w-4xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-6 flex items-center gap-2">
        <BellRing className="w-6 h-6 text-yellow-400" /> Notifications
      </h1>

      {loading ? (
        <p className="text-white/60">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
          <p className="text-white/60 text-base md:text-lg">
            When you have a notification, you will see it here.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {notifications.map((note) => (
            <li
              key={note.id}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-white shadow-sm hover:shadow-md transition"
            >
              <p className="text-sm text-white/90">{note.message}</p>
              <span className="text-xs text-white/50">
                {new Date(note.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
