'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function Page() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [description, setDescription] = useState('');
  const [platforms, setPlatforms] = useState([{ name: '', url: '' }]);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profileUrl, setProfileUrl] = useState<string | null>(null);

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
      const userEmail = session.user.email || '';

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError || !profileData) {
        const { data: waitlistData, error: waitlistError } = await supabase
          .from('waitlist')
          .select('full_name')
          .eq('email', userEmail)
          .single();

        if (!waitlistError && waitlistData?.full_name) {
          setFullName(waitlistData.full_name);
        }
      } else {
        setUsername(profileData.username || '');
        setFullName(profileData.full_name || '');
        setDescription(profileData.description || '');
        setProfileUrl(profileData.profile_url || null);

        try {
          const parsedLinks = JSON.parse(profileData.social_links || '[]');
          setPlatforms(parsedLinks);
        } catch (e) {
          console.error('Error parsing social links:', e);
        }

        if (!profileData.full_name) {
          const { data: waitlistData } = await supabase
            .from('waitlist')
            .select('full_name')
            .eq('email', userEmail)
            .single();

          if (waitlistData?.full_name) setFullName(waitlistData.full_name);
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
      error: sessionError,
    } = await supabase.auth.getSession();

    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    if (!userId || !userEmail || sessionError) {
      console.error('❌ User session not found or invalid');
      setLoading(false);
      return;
    }

    let uploadedProfileUrl = profileUrl;

    if (profileFile) {
      const fileExt = profileFile.name.split('.').pop();
      const fileName = `${userId}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, profileFile, { upsert: true });

      if (uploadError) {
        console.error('❌ Profile picture upload failed:', uploadError.message);
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('profiles')
          .getPublicUrl(filePath);

        uploadedProfileUrl = publicUrlData?.publicUrl || null;
      }
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert(
        {
          user_id: userId,
          full_name: fullName,
          username,
          description,
          social_links: JSON.stringify(platforms),
          profile_url: uploadedProfileUrl,
          role: 'creator',
          email: userEmail,
        },
        {
          onConflict: 'user_id',
        }
      );

    if (updateError) {
      console.error('❌ Profile update failed:', updateError.message);
    } else {
      console.log('✅ Profile saved successfully');
      router.push('/dashboard/profile/creator/view');
    }

    setLoading(false);
  };

  return (
    <div className="text-white p-6 md:p-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
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
          <label className="block mb-1">Description (optional)</label>
          <textarea
            className="w-full p-2 rounded bg-white/10 border border-white/20"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>

        <div>
          <label className="block mb-1">Profile Picture (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setProfileFile(e.target.files[0]);
              }
            }}
            className="block w-full text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-400 file:text-black hover:file:bg-yellow-300"
          />
        </div>

        <div>
          <label className="block mb-1">Social Links</label>
          {platforms.map((platform, index) => (
            <div key={index} className="flex flex-col sm:flex-row gap-2 mb-2">
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
