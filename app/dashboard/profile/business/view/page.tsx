'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
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
    <div className="text-white p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{companyName}</h1>
      {description && <p className="mb-4 text-white/80">{description}</p>}
      {website && (
        <p className="mb-4">
          Website:{' '}
          <a href={website} className="text-yellow-400" target="_blank" rel="noreferrer">
            {website}
          </a>
        </p>
      )}
      
        {logoUrl && (
            <Image
              src={logoUrl}
              alt="Company Logo"
              width={100} // <- set appropriate width
              height={100} // <- set appropriate height
              className="..." // <- keep any styles if needed
            />
          )}
      
    </div>
  );
}
