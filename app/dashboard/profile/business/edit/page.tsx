'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function Page() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [logo, setLogo] = useState<File | null>(null);

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
        setCompanyName(data.company_name || '');
        setDescription(data.description || '');
        setWebsite(data.website || '');
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
    if (!userId) return;

    let logoUrl = null;

    if (logo) {
      const fileExt = logo.name.split('.').pop();
      const fileName = `${userId}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, logo, { upsert: true });

      if (uploadError) {
        console.error('Logo upload failed:', uploadError);
      } else {
        const { data: publicUrlData } = supabase
          .storage
          .from('logos')
          .getPublicUrl(filePath);

        logoUrl = publicUrlData?.publicUrl || null;
      }
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        company_name: companyName,
        description,
        website,
        logo_url: logoUrl,
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
          <label className="block mb-1">Company Name</label>
          <input
            type="text"
            className="w-full p-2 rounded bg-white/10 border border-white/20"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
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
          <label className="block mb-1">Company Logo (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                setLogo(e.target.files[0]);
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
