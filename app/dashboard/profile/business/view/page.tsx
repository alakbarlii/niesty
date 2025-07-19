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
    <div className="p-6 max-w-4xl mx-auto text-white">
      <div className="flex flex-col md:flex-row gap-6 bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl shadow-md p-6 w-full">
        {/* Left: Image */}
        <div className="w-full md:w-[160px] h-[160px] flex-shrink-0">
          <Image
            src={profile.profile_url || '/default-avatar.png'}
            alt="Profile Avatar"
            width={160}
            height={160}
            className="rounded-xl border border-white/20 object-cover w-full h-full"
          />
        </div>

        {/* Right: Info */}
        <div className="flex-1 flex flex-col gap-2">
          <h1 className="text-2xl font-bold">{profile.full_name}</h1>
          <div className="flex flex-wrap gap-2 text-sm text-white">
            <span className="px-3 py-1 bg-white/10 rounded-full border border-white/20">
              Role: {profile.role}
            </span>
            <span className="px-3 py-1 bg-white/10 rounded-full border border-white/20">
              @{profile.username}
            </span>
            <span className="px-3 py-1 bg-white/10 rounded-full border border-white/20">
              Deals Completed: 0
            </span>
          </div>
          <p className="text-white/80 text-sm whitespace-pre-line mt-2">{profile.description}</p>
        </div>
      </div>

      {/* Platforms */}
      <div className="mt-6">
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
          <p className="text-gray-400">No platform is added.</p>
        )}
      </div>
    </div>
  );
}
