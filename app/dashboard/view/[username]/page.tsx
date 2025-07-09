'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Image from 'next/image';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  role: 'creator' | 'business';
  description: string;
  profile_url?: string;
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
    return (
      <div className="p-10 text-white">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <section className="p-6 md:p-12">
      <div className="max-w-3xl mx-auto bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl p-6 shadow-lg text-white">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <Image
            src={profile.profile_url || '/default-avatar.png'}
            alt="avatar"
            width={120}
            height={120}
            className="rounded-full w-[120px] h-[120px] object-cover border border-white/20"
          />
          <div className="flex flex-col gap-1 text-center md:text-left">
            <h1 className="text-3xl font-bold">{profile.full_name}</h1>
            <p className="text-gray-400">@{profile.username}</p>
            <p className="capitalize text-yellow-400 font-medium">{profile.role}</p>
          </div>
        </div>

        <div className="mt-6 text-gray-300 text-lg leading-relaxed whitespace-pre-wrap">
          {profile.description || 'No description provided.'}
        </div>
      </div>
    </section>
  );
}
