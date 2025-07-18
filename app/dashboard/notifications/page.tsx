'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { BellRing } from 'lucide-react';

interface Notification {
  id: string;
  content: string;
  created_at: string;
  recipient_id: string | null;
  target_role: string | null;
}

export default function Page() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('User not found:', userError?.message);
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData) {
        console.error('User role not found:', profileError?.message);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(
          `recipient_id.eq.${user.id},target_role.eq.${profileData.role}`
        )
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error.message);
        setLoading(false);
        return;
      }

      setNotifications(data || []);
      setLoading(false);
    };

    fetchNotifications();
  }, [supabase]);

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
              <p className="text-sm text-white/90">{note.content}</p>
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
