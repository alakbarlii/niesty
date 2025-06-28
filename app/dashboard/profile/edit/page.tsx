'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function Page() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [platforms, setPlatforms] = useState([{ name: '', url: '' }]);
  const [profilePic, setProfilePic] = useState<File | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('Session error or not found', sessionError);
        setLoading(false);
        return;
      }

      const userId = session.user.id;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Profile fetch error:', error);
      } else if (data) {
        setName(data.name || '');
        setBio(data.bio || '');
        try {
          const parsedLinks = JSON.parse(data.social_links || '[]');
          setPlatforms(parsedLinks);
        } catch (e) {
          console.error('Error parsing social links:', e);
        }
      }

      setLoading(false);
    };

    fetchProfile();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !platforms[0].name.trim() || !platforms[0].url.trim()) {
      alert('Name and at least one platform with a valid name & link are required.');
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      name,
      bio,
      social_links: JSON.stringify(platforms),
    });

    if (error) {
      alert('Failed to save profile.');
      console.error(error);
    } else {
      alert('Profile saved successfully.');
    }
  };

  return (
    <div className="text-white p-6">
      <h1 className="text-2xl font-bold mb-4">Edit Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block mb-1 font-medium">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full p-3 rounded bg-white/10 border border-white/20 text-white"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Bio (optional)</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full p-3 rounded bg-white/10 border border-white/20 text-white"
            rows={3}
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">Main Platform + Links</label>
          {platforms.map((p, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Platform (e.g. Instagram)"
                value={p.name}
                onChange={(e) => {
                  const updated = [...platforms];
                  updated[i].name = e.target.value;
                  setPlatforms(updated);
                }}
                className="flex-1 p-2 rounded bg-white/10 border border-white/20 text-white"
                required={i === 0}
              />
              <input
                type="url"
                placeholder="Link (e.g. https://instagram.com/yourname)"
                value={p.url}
                onChange={(e) => {
                  const updated = [...platforms];
                  updated[i].url = e.target.value;
                  setPlatforms(updated);
                }}
                className="flex-1 p-2 rounded bg-white/10 border border-white/20 text-white"
                required={i === 0}
              />
            </div>
          ))}
          {platforms.length < 10 && (
            <button
              type="button"
              onClick={() => setPlatforms([...platforms, { name: '', url: '' }])}
              className="text-yellow-400 mt-1 hover:underline"
            >
              + Add another platform
            </button>
          )}
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-yellow-400 text-black font-bold rounded hover:bg-yellow-300"
        >
          Save Profile
        </button>
      </form>
    </div>
  );
}
