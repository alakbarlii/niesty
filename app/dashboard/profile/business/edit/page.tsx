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
  const [website, setWebsite] = useState('');
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profileUrl, setProfileUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        console.error('User fetch error', error);
        setLoading(false);
        return;
      }

      const userId = user.id;
      const userEmail = user.email || '';

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError || !profileData) {
        const { data: waitlistData } = await supabase
          .from('waitlist')
          .select('full_name')
          .eq('email', userEmail)
          .single();

        if (waitlistData?.full_name) setFullName(waitlistData.full_name);
      } else {
        setUsername(profileData.username || '');
        setFullName(profileData.full_name || '');
        setDescription(profileData.description || '');
        setWebsite(profileData.website || '');
        setProfileUrl(profileData.profile_url || null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.error('❌ User not found or invalid');
      setLoading(false);
      return;
    }

    const userId = user.id;
    const userEmail = user.email;

    let uploadedProfileUrl = profileUrl;

    if (profileFile) {
      const fileExt = profileFile.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      const { data: existing } = await supabase
        .from('profiles')
        .select('profile_url')
        .eq('user_id', userId)
        .single();

      if (existing?.profile_url) {
        const oldPath = existing.profile_url.split('/storage/v1/object/public/')[1];
        if (oldPath) await supabase.storage.from('profiles').remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, profileFile, { upsert: true });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from('profiles')
          .getPublicUrl(filePath);

        uploadedProfileUrl = publicUrlData?.publicUrl || null;
      } else {
        console.error('❌ Profile picture upload failed:', uploadError.message);
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
          website,
          profile_url: uploadedProfileUrl || undefined,
          role: 'business',
          email: userEmail,
        },
        { onConflict: 'user_id' }
      );

    if (updateError) {
      console.error('❌ Profile update failed:', updateError.message);
    } else {
      router.push('/dashboard/profile/business/view');
    }

    setLoading(false);
  };

  return (
    <div className="text-white p-6 md:p-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Business Profile</h1>
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
          <label className="block mb-1">Description</label>
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
