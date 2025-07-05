'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import StatBadge from '@/components/StatBadge';
import Image from 'next/image';
import { useRouter } from 'next/navigation';


export default function BusinessProfileView() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setProfilePicUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
const [editHref, setEditHref] = useState<string | null>(null);


  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const userId = session?.user?.id;
        if (!userId) throw new Error('No user session found');

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error || !data) throw new Error('Profile not found');

        setCompanyName(data.company_name || '');
        setRole(data.role || '');
        setEditHref('/dashboard/profile/business/edit');
        setEmail(data.email || '');
        setDescription(data.description || '');
        setWebsite(data.website || '');
        setProfilePicUrl(data.profile_url || null);
      

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('Business profile load error:', err);
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [supabase]);

  if (loading) return <p className="text-white p-6">Loading...</p>;
  if (error) return <p className="text-red-500 p-6">Error: {error}</p>;

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
            <p className="text-sm text-yellow-400 capitalize">{role}</p>
            <p className="text-sm text-white/70 mt-1">Contact: {email}</p>
            {description && <p className="text-white/70 max-w-md mt-2">{description}</p>}
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

        {editHref && (
  <button
    onClick={() => router.push(editHref)}
    className="bg-yellow-400 text-black px-4 py-2 rounded-lg font-semibold hover:bg-yellow-300"
  >
    Edit Profile
  </button>
)}


      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatBadge label="Deals Completed" value={1} />
        <StatBadge label="Avg. Response Time" value="2h" />
        <StatBadge label="Campaigns Launched" value={5} />
      </div>
    </div>
  );
}
