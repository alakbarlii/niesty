'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; 

export default function CreatorProfileEdit() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [description, setDescription] = useState('');
  const [platforms, setPlatforms] = useState([{ name: '', url: '' }]);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;
      const userId = user.id;

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
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;
    const userId = user.id;
    const userEmail = user.email;

    let uploadedProfileUrl = null;

    if (profileFile) {
      const fileExt = profileFile.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_url')
        .eq('user_id', userId)
        .single();

      if (profile?.profile_url) {
        const oldPath = profile.profile_url.split('/storage/v1/object/public/')[1];
        if (oldPath) await supabase.storage.from('profiles').remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, profileFile, { upsert: true });

      if (uploadError) {
        console.error('❌ Profile picture upload failed:', uploadError.message);
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('profiles')
          .getPublicUrl(filePath);
        uploadedProfileUrl = publicUrlData.publicUrl;
      }
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert(
        {
          user_id: userId,
          email: userEmail,
          full_name: fullName,
          username,
          description,
          social_links: JSON.stringify(platforms),
          profile_url: uploadedProfileUrl || undefined,
          role: 'creator',
        },
        { onConflict: 'user_id' }
      );

    if (updateError) {
      console.error('❌ Profile update failed:', updateError.message);
    } else {
      router.push('/dashboard/profile/creator/view');
    }

    setLoading(false);
  };

  return (
    <div className="text-white p-6 md:p-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Creator Profile</h1>
      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label className="block mb-1">Full Name</label>
          <input
            type="text"
            className="w-full p-2 rounded bg-white/10 border border-white/20"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block mb-1">Username</label>
          <input
            type="text"
            className="w-full p-2 rounded bg-white/10 border border-white/20"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block mb-1">Description</label>
          <textarea
            className="w-full p-2 rounded bg-white/10 border border-white/20"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>

        <div>
          <label className="block mb-2">Social Platforms</label>
          {platforms.map((p, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Platform"
                className="flex-1 p-2 rounded bg-white/10 border border-white/20"
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
                className="flex-1 p-2 rounded bg-white/10 border border-white/20"
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
            type="button"
            onClick={() => setPlatforms([...platforms, { name: '', url: '' }])}
            className="text-yellow-400 text-sm mt-1"
          >
            + Add another platform
          </button>
        </div>

        <div>
          <label className="block mb-1">Profile Picture (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setProfileFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-400 file:text-black hover:file:bg-yellow-300"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-yellow-400 text-black font-semibold rounded hover:bg-yellow-300"
        >
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}
