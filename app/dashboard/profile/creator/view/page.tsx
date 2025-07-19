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
  platforms?: { name: string; link: string }[];
}

export default function CreatorProfileView() {
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
    <div className="p-6 flex justify-center text-white">
      <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl shadow-md p-6 max-w-3xl w-full">
        <div className="flex flex-col items-center gap-4">
          <Image
            src={profile.profile_url || '/default-avatar.png'}
            alt="Profile Avatar"
            width={120}
            height={120}
            className="rounded-xl border border-white/20 object-cover w-30 h-30"
          />
          <h1 className="text-2xl font-bold">{profile.full_name}</h1>

          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-300 mt-2">
            <div className="bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
              <span className="font-semibold text-white">Role:</span> {profile.role}
            </div>
            <div className="bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
              <span className="font-semibold text-white">Username:</span> @{profile.username}
            </div>
            <div className="bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
              <span className="font-semibold text-white">Deals Completed:</span> 0
            </div>
          </div>

          <p className="text-white/80 text-center max-w-xl whitespace-pre-line mt-4">{profile.description}</p>

          <div className="mt-6 w-full">
            <h2 className="text-lg font-semibold mb-2 text-white">Social Platforms</h2>
            {profile.platforms && profile.platforms.length > 0 ? (
              <ul className="text-white/80 space-y-1">
                {profile.platforms.map((platform, idx) => (
                  <li key={idx}>
                    <span className="font-medium text-yellow-400">{platform.name}:</span>{' '}
                    <a
                      href={platform.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-yellow-300"
                    >
                      {platform.link}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">No platforms added.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
