'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function CreatorProfileEdit() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [description, setDescription] = useState('');
  const [platforms, setPlatforms] = useState([{ name: '', url: '' }]);
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const userId = session?.user?.id;

      if (!userId) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profile) {
        setFullName(profile.full_name || '');
        setUsername(profile.username || '');
        setDescription(profile.description || '');
        try {
          const parsed = JSON.parse(profile.social_links || '[]');
          setPlatforms(Array.isArray(parsed) ? parsed : [{ name: '', url: '' }]);
        } catch {
          setPlatforms([{ name: '', url: '' }]);
        }
      }
    };

    fetchProfile();
  }, [supabase]);

  const handleSave = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    if (!userId || !userEmail) return;

    let uploadedProfileUrl: string | null = null;

    if (profilePicFile) {
      const fileExt = profilePicFile.name.split('.').pop();
      const filePath = `${userId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, profilePicFile, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      uploadedProfileUrl = publicUrlData?.publicUrl ?? null;
    }

    const updates = {
      user_id: userId,
      email: userEmail,
      full_name: fullName,
      username,
      description,
      social_links: JSON.stringify(platforms),
      ...(uploadedProfileUrl && { profile_url: uploadedProfileUrl }),
    };

    const { error } = await supabase.from('profiles').upsert(updates, { onConflict: 'user_id' });

    if (error) {
      console.error('Update error:', error.message);
    } else {
      router.push('/dashboard/profile/creator/view');
    }
  };

  return (
    <section className="p-6 md:p-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-white">Edit Profile</h1>

      <input
        type="text"
        placeholder="Full Name"
        className="w-full p-2 rounded mb-4"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />

      <input
        type="text"
        placeholder="Username"
        className="w-full p-2 rounded mb-4"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <textarea
        placeholder="Description (optional)"
        className="w-full p-2 rounded mb-4"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="mb-4">
        <label className="block text-white mb-2">Profile Picture (optional)</label>
        <input type="file" accept="image/*" onChange={(e) => setProfilePicFile(e.target.files?.[0] || null)} />
      </div>

      <div className="mb-4">
        <label className="block text-white mb-2">Social Links</label>
        {platforms.map((p, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Platform"
              className="flex-1 p-2 rounded"
              value={p.name}
              onChange={(e) => {
                const updated = [...platforms];
                updated[i].name = e.target.value;
                setPlatforms(updated);
              }}
            />
            <input
              type="text"
              placeholder="URL"
              className="flex-1 p-2 rounded"
              value={p.url}
              onChange={(e) => {
                const updated = [...platforms];
                updated[i].url = e.target.value;
                setPlatforms(updated);
              }}
            />
          </div>
        ))}
        <button
          className="text-yellow-400 mt-2 text-sm"
          onClick={() => setPlatforms([...platforms, { name: '', url: '' }])}
        >
          + Add another platform
        </button>
      </div>

      <button
        onClick={handleSave}
        className="bg-yellow-400 text-black px-6 py-3 rounded-lg font-bold hover:bg-yellow-300"
      >
        Save Profile
      </button>
    </section>
  );
}
