'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function Page() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [profileFile, setProfileFile] = useState<File | null>(null);

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

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError || !profileData) {
        console.warn('No profile data found, trying waitlist fallback.');

        const { data: waitlistData, error: waitlistError } = await supabase
          .from('waitlist')
          .select('full_name')
          .eq('email', session.user.email)
          .single();

        if (!waitlistError && waitlistData?.full_name) {
          setFullName(waitlistData.full_name);
        }
      } else {
        setUsername(profileData.username || '');
        setFullName(profileData.full_name || '');
        setDescription(profileData.description || '');
        setWebsite(profileData.website || '');
      }

      setLoading(false);
    };

    fetchProfile();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const userId = session?.user?.id;
    const email = session?.user?.email;
    if (!userId || !email) return;

    let uploadedProfileUrl: string | null = null;

    if (profileFile) {
      const fileExt = profileFile.name.split('.').pop();
      const fileName = `${userId}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, profileFile, { upsert: true });

      if (uploadError) {
        console.error('Profile picture upload failed:', uploadError);
      } else {
        const { data: publicUrlData } = supabase
          .storage
          .from('profiles')
          .getPublicUrl(filePath);

        uploadedProfileUrl = publicUrlData?.publicUrl || null;
      }
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        email,
        username,
        full_name: fullName,
        description,
        website,
        profile_url: uploadedProfileUrl,
        role: 'business',
      });

    if (error) console.error('Profile update error:', error);

    setLoading(false);
  };

  return (
    <div className="text-white p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Edit Business Profile</h1>
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
          <label className="block mb-1">Brand / Company Name</label>
          <input
            type="text"
            className="w-full p-2 rounded bg-white/10 border border-white/20"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block mb-1">Company Description</label>
          <textarea
            className="w-full p-2 rounded bg-white/10 border border-white/20"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>

        <div>
          <label className="block mb-1">Website</label>
          <input
            type="url"
            className="w-full p-2 rounded bg-white/10 border border-white/20"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        <div>
          <label className="block mb-1">Logo / Profile Picture (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setProfileFile(e.target.files[0]);
              }
            }}
            className="w-full p-2 rounded bg-white/10 border border-white/20"
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
