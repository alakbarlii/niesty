'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

type SocialLink = {
  platform: string;
  url: string;
};

type Profile = {
  name: string;
  bio?: string;
  avatar_url?: string;
  social_links: SocialLink[];
};

export default function Page() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('No session found');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Profile fetch error:', error);
      } else {
        try {
          const parsedLinks = JSON.parse(data.social_links || '[]');
          setProfile({ ...data, social_links: parsedLinks });
        } catch (e) {
          console.error('Failed to parse social_links', e);
        }
      }
    };

    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!profile) {
    return (
      <div className="text-white text-center mt-10">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-10 px-4 text-white">
      <h1 className="text-3xl font-bold mb-4">{profile.name}</h1>

      {profile.avatar_url && (
        <Image
          src={`https://your-supabase-project-url.storage.supabase.ap-northeast-1.aws.dev/storage/v1/object/public/profile-pics/${profile.avatar_url}`}
          alt="Profile Picture"
          width={128}
          height={128}
          className="w-32 h-32 rounded-full object-cover mb-4"
        />
      )}

      <p className="mb-4">{profile.bio || 'No bio provided'}</p>

      <h2 className="font-semibold">Social Links:</h2>
      <ul className="list-disc list-inside">
        {profile.social_links?.map((link, index) => (
          <li key={index}>
            <strong>{link.platform}:</strong>{' '}
            <a
              href={link.url}
              className="text-yellow-400 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
