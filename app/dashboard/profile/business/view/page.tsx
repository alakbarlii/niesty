'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import StatBadge from '@/components/StatBadge';
import Image from 'next/image';

export default function BusinessProfileView() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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
      if (!userId) {
        console.warn('No user session found');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
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
        <div className="flex gap-4">
          {logoUrl && (
            <Image
              src={logoUrl}
              alt="Company Logo"
              width={80}
              height={80}
              className="rounded-xl border border-white/20 object-cover"
            />
          )}
          <div>
            <h1 className="text-3xl font-bold mb-1">{companyName}</h1>
            {description && <p className="text-white/70 max-w-md">{description}</p>}
            {website && (
              <p className="mt-2">
                <span className="text-white/60">Website:</span>{' '}
                <a
                  href={website}
                  className="text-yellow-400 hover:underline break-all"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {website}
                </a>
              </p>
            )}
          </div>
        </div>
        <button className="bg-yellow-400 text-black px-4 py-2 rounded-lg font-semibold hover:bg-yellow-300">
          Edit Profile
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatBadge label="Deals Completed" value={1} />
        <StatBadge label="Avg. Response Time" value="2h" />
        <StatBadge label="Campaigns Launched" value={5} />
      </div>
    </div>
  );
}
