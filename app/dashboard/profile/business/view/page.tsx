'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Image from 'next/image';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  role: 'creator' | 'business';
  description: string;
  profile_url?: string;
}

export default function BusinessProfileView() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!error && data) setProfile(data);
      setLoading(false);
    };

    fetchProfile();
  }, [supabase]);

  if (loading) {
    return <div className="p-6 text-white text-center">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="p-6 text-white text-center">No profile found.</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto text-white">
      <div className="flex flex-col items-center gap-4">
        <Image
          src={profile.profile_url || '/default-avatar.png'}
          alt="Profile Avatar"
          width={120}
          height={120}
          className="rounded-full border border-white/20 object-cover"
        />
        <h1 className="text-3xl font-bold">{profile.full_name}</h1>
        <p className="text-yellow-400 font-semibold capitalize">{profile.role}</p>
        <p className="text-white/80 text-center max-w-xl whitespace-pre-line">{profile.description}</p>
        <p className="text-gray-400 text-sm mt-2">@{profile.username}</p>
      </div>
    </div>
  );
}
