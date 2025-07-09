// app/dashboard/view/[username]/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Image from 'next/image';
import { MessageSquare, Send, MoreVertical } from 'lucide-react';

interface Profile {
  full_name: string;
  username: string;
  role: 'creator' | 'business';
  description: string;
  email: string;
  website?: string;
  profile_url?: string;
  deals_completed?: number;
  avg_rating?: number;
  views?: number;
}

export default function PublicProfilePage() {
  const { username } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (!error && data) {
        setProfile(data);
      }
    };

    fetchProfile();
  }, [username]);

  if (!profile) {
    return <p className="text-center text-gray-400 mt-10">Loading...</p>;
  }

  return (
    <section className="p-6 md:p-12 flex justify-center">
      <div className="relative bg-[#111] rounded-xl border border-white/10 shadow-lg w-full max-w-3xl p-6 pt-8">
        {/* 3-dot menu */}
        <div className="absolute top-4 right-4 text-white cursor-pointer opacity-50 hover:opacity-100">
          <MoreVertical size={20} />
        </div>

        {/* Profile Image */}
        <div className="absolute -left-20 top-8 w-28 h-28 rounded-full overflow-hidden border-2 border-white/20">
          <Image
            src={profile.profile_url || '/default-avatar.png'}
            alt="Profile picture"
            width={112}
            height={112}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="pl-16">
          <h2 className="text-white font-bold text-2xl">{profile.full_name}</h2>
          <div className="text-yellow-400 font-semibold -mt-1">@{profile.username}</div>
          <div className="text-white text-sm mt-1 capitalize">{profile.role}</div>
          <div className="text-gray-300 text-sm mt-1">Contact: {profile.email}</div>

          {profile.description && (
            <p className="text-gray-300 text-sm mt-3 max-w-xl whitespace-pre-wrap">
              {profile.description}
            </p>
          )}

          {profile.website && (
            <p className="text-sm text-gray-300 mt-2">
              Website:{' '}
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-400 hover:underline"
              >
                {profile.website}
              </a>
            </p>
          )}

          {/* Stats */}
          <div className="flex gap-4 mt-6">
            <div className="bg-black/30 px-4 py-2 rounded-lg text-center">
              <div className="text-yellow-400 font-bold">
                {profile.deals_completed ?? 0}
              </div>
              <div className="text-xs text-white uppercase tracking-wide">
                Deals Completed
              </div>
            </div>
            <div className="bg-black/30 px-4 py-2 rounded-lg text-center">
              <div className="text-yellow-400 font-bold">
                {profile.avg_rating ? `${profile.avg_rating} / 5` : '—'}
              </div>
              <div className="text-xs text-white uppercase tracking-wide">
                Avg. Rating
              </div>
            </div>
            <div className="bg-black/30 px-4 py-2 rounded-lg text-center">
              <div className="text-yellow-400 font-bold">
                {profile.views ?? 0}
              </div>
              <div className="text-xs text-white uppercase tracking-wide">
                Total Views
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-4 mt-6">
            <button className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-4 py-2 rounded-full text-sm flex items-center gap-2">
              <Send size={16} /> Request Deal
            </button>
            <button className="bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2 rounded-full text-sm flex items-center gap-2">
              <MessageSquare size={16} /> Send Message
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
