'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import StatBadge from '@/components/StatBadge';
import Image from 'next/image';

export default function BusinessProfileView() {
  const supabase = createClient();

  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
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
        console.error('Error fetching business profile:', error);
      } else {
        setCompanyName(data.company_name || '');
        setDescription(data.description || '');
        setWebsite(data.website || '');
        setLogoUrl(data.logo_url || null);
      }

      setLoading(false);
    };

    fetchProfile();
  }, [supabase]);

  if (loading) return <p className="text-white p-6">Loading...</p>;

  return (
    <div className="text-white p-6 max-w-3xl mx-auto bg-[#0b0b0b] rounded-2xl shadow-xl border border-white/10">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{companyName}</h1>
          {description && <p className="text-white/70 max-w-lg">{description}</p>}
          {website && (
            <p className="mt-2">
              Website:{' '}
              <a href={website} className="text-yellow-400 hover:underline" target="_blank">
                {website}
              </a>
            </p>
          )}
        </div>
        <button className="bg-yellow-400 text-black px-4 py-2 rounded-lg font-semibold hover:bg-yellow-300">
          Edit Profile
        </button>
      </div>

      {logoUrl && (
        <div className="mb-6">
          <Image
            src={logoUrl}
            alt="Company Logo"
            width={100}
            height={100}
            className="rounded-xl border border-white/20"
          />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatBadge label="Deals Completed" value={1} />
        <StatBadge label="Avg. Response Time" value="2h" />
        <StatBadge label="Campaigns Launched" value={5} />
      </div>
    </div>
  );
}
