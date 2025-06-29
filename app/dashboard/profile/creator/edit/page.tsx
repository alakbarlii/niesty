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
      const userEmail = session.user.email;
  
      // 1. Check if user exists in profiles
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
  
      // 2. If not found in profiles, create from waitlist
      if (profileError || !existingProfile) {
        const { data: waitlistData, error: waitlistError } = await supabase
          .from('waitlist')
          .select('role')
          .eq('email', userEmail)
          .single();
  
        if (waitlistError || !waitlistData) {
          console.error('User not found in waitlist either.');
          setLoading(false);
          return;
        }
  
        const { error: insertError } = await supabase.from('profiles').insert([
          {
            id: userId,
            role: waitlistData.role,
            name: '',
            bio: '',
            social_links: '[]',
            profile_picture: null,
            created_at: new Date().toISOString(),
          },
        ]);
  
        if (insertError) {
          console.error('Error inserting new profile:', insertError);
          setLoading(false);
          return;
        }
      }
  
      // 3. Now fetch full profile again
      const { data: fullProfile, error: finalError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
  
      if (finalError) {
        console.error('Final fetch error:', finalError);
      } else if (fullProfile) {
        setName(fullProfile.name || '');
        setBio(fullProfile.bio || '');
        try {
          const parsedLinks = JSON.parse(fullProfile.social_links || '[]');
          setPlatforms(parsedLinks);
        } catch (e) {
          console.error('Error parsing social links:', e);
        }
      }
  
      setLoading(false);
    };
  
    fetchProfile();
  }, [supabase]);
  




  const handlePlatformChange = (index: number, field: 'name' | 'url', value: string) => {
    const updated = [...platforms];
    updated[index][field] = value;
    setPlatforms(updated);
  };

  const addPlatform = () => {
    if (platforms.length < 10) {
      setPlatforms([...platforms, { name: '', url: '' }]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const userId = session?.user?.id;
    if (!userId) return;

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        name,
        bio,
        social_links: JSON.stringify(platforms),
        profile_picture: profilePic ? profilePic.name : null,
      });

    if (error) console.error('Profile update error:', error);

    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProfilePic(e.target.files[0]);
    }
  };

  return (
    <div className="text-white p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Edit Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block mb-1">Name</label>
          <input
            type="text"
            className="w-full p-2 rounded bg-white/10 border border-white/20"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block mb-1">Bio (optional)</label>
          <textarea
            className="w-full p-2 rounded bg-white/10 border border-white/20"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
          />
        </div>

        <div>
          <label className="block mb-1">Profile Picture (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-400 file:text-black hover:file:bg-yellow-300"
          />
        </div>

        <div>
          <label className="block mb-1">Social Links</label>
          {platforms.map((platform, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                className="flex-1 p-2 rounded bg-white/10 border border-white/20"
                placeholder="Platform (e.g. YouTube)"
                value={platform.name}
                onChange={(e) => handlePlatformChange(index, 'name', e.target.value)}
                required={index === 0}
              />
              <input
                type="url"
                className="flex-1 p-2 rounded bg-white/10 border border-white/20"
                placeholder="Link (e.g. https://youtube.com/@channel)"
                value={platform.url}
                onChange={(e) => handlePlatformChange(index, 'url', e.target.value)}
                required={index === 0}
              />
            </div>
          ))}
          {platforms.length < 10 && (
            <button
              type="button"
              onClick={addPlatform}
              className="text-sm text-yellow-400 hover:underline"
            >
              + Add another platform
            </button>
          )}
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
