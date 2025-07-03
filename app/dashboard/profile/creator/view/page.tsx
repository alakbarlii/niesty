'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import StatBadge from '@/components/StatBadge';
import Image from 'next/image';

export default function CreatorProfileView() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [platforms, setPlatforms] = useState<{ name: string; url: string }[]>([]);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const userId = session?.user?.id;
        if (!userId) {
          throw new Error('No user session found');
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error || !data) {
          throw new Error('Profile not found');
        }

        setName(data.name || '');
        setBio(data.bio || '');
        setProfilePicUrl(data.profile_picture || null);

        try {
          const parsed = JSON.parse(data.social_links || '[]');
          setPlatforms(parsed);
        } catch {
          setPlatforms([]);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('Profile load error:', err);
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [supabase]);

  if (loading) return <p className="text-white p-6">Loading...</p>;
  if (error) return <p className="text-red-500 p-6">Error: {error}</p>;

  return (
    <div className="text-white p-6 max-w-3xl mx-auto bg-[#0b0b0b] rounded-2xl shadow-xl border border-white/10">
      <div className="flex justify-between items-start mb-6">
        <div className="flex gap-4">
          {profilePicUrl && (
            <Image
              src={profilePicUrl}
              alt="Profile Picture"
              width={80}
              height={80}
              className="rounded-full border border-white/20 object-cover"
            />
          )}
          <div>
            <h1 className="text-3xl font-bold mb-1">{name}</h1>
            {bio && <p className="text-white/70 max-w-md">{bio}</p>}
          </div>
        </div>
        <button className="bg-yellow-400 text-black px-4 py-2 rounded-lg font-semibold hover:bg-yellow-300">
          Edit Profile
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <StatBadge label="Deals Completed" value={3} />
        <StatBadge label="Avg. Rating" value="4.9 / 5" />
        <StatBadge label="Total Views" value="42k" />
      </div>

      <div className="mt-4">
        <h2 className="text-lg font-semibold mb-2">Social Platforms</h2>
        <ul className="space-y-2">
          {platforms.map((p, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-white/70">{p.name}:</span>
              <a
                href={p.url}
                className="text-yellow-400 hover:underline break-all"
                target="_blank"
                rel="noopener noreferrer"
              >
                {p.url}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
