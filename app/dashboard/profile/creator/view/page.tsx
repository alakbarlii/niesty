'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function CreatorProfileView() {
  const supabase = createClient();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [platforms, setPlatforms] = useState<{ name: string; url: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const userId = session?.user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching creator profile:', error);
      } else {
        setName(data.name || '');
        setBio(data.bio || '');
        try {
          const parsed = JSON.parse(data.social_links || '[]');
          setPlatforms(parsed);
        } catch {
          setPlatforms([]);
        }
      }

      setLoading(false);
    };

    fetchProfile();
}, [supabase]);

  if (loading) return <p className="text-white p-6">Loading...</p>;

  return (
    <div className="text-white p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{name}</h1>
      {bio && <p className="mb-4 text-white/80">{bio}</p>}
      <div>
        <h2 className="text-lg font-semibold mb-2">Social Platforms</h2>
        <ul className="list-disc pl-6 space-y-1">
          {platforms.map((p, i) => (
            <li key={i}>
              <strong>{p.name}</strong>: <a href={p.url} className="text-yellow-400" target="_blank">{p.url}</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
