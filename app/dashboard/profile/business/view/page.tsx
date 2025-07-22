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

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [profileUrl, setProfileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editHref, setEditHref] = useState<string | null>(null);
  const [dealCount, setDealCount] = useState<number>(0);

  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const userId = session?.user?.id;
        const userEmail = session?.user?.email;
        if (!userId || !userEmail) throw new Error('No user session found');

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        const { count } = await supabase
          .from('deals')
          .select('*', { count: 'exact', head: true })
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .eq('status', 'accepted');

        setDealCount(count || 0);

        if (error || !data) {
          const { data: waitlistData, error: waitlistError } = await supabase
            .from('waitlist')
            .select('full_name')
            .eq('email', userEmail)
            .single();

          if (!waitlistError && waitlistData?.full_name) {
            setFullName(waitlistData.full_name);
          }

          setUsername('');
          setEditHref('/dashboard/profile/business/edit');
        } else {
          setFullName(data.full_name || '');
          setUsername(data.username || '');
          setRole(data.role || '');
          setEmail(data.email || '');
          setDescription(data.description || '');
          setWebsite(data.website || '');
          setProfileUrl(data.profile_url || null);
          setEditHref('/dashboard/profile/business/edit');

          if (!data.full_name) {
            const { data: waitlistData } = await supabase
              .from('waitlist')
              .select('full_name')
              .eq('email', userEmail)
              .single();

            if (waitlistData?.full_name) setFullName(waitlistData.full_name);
          }
        }
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
    <section className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
        {profileUrl && (
          <div className="w-[140px] h-[140px] rounded-full overflow-hidden border border-white/20 relative">
            <Image
              src={profileUrl}
              alt="Profile Picture"
              width={140}
              height={140}
              className="object-cover w-full h-full"
            />
          </div>
        )}

        <div className="flex-1 bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-1 text-white">{fullName || 'Unnamed'}</h1>
              <p className="text-sm text-yellow-400">@{username || 'username'}</p>
              <p className="text-sm text-white/60 capitalize mt-1">{role}</p>
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
            {editHref && (
              <button
                onClick={() => router.push(editHref)}
                className="bg-yellow-400 text-black px-4 py-2 rounded-lg font-semibold hover:bg-yellow-300"
              >
                Edit Profile
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <StatBadge label="Deals Completed" value={dealCount} />
            <StatBadge label="Avg. Response Time" value="2h" />
            <StatBadge label="Campaigns Launched" value={5} />
          </div>
        </div>
      </div>
    </section>
  );
}
