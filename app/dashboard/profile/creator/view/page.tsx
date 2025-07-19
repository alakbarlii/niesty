'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import StatBadge from '@/components/StatBadge';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function CreatorProfileView() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [platforms, setPlatforms] = useState<{ name: string; url: string }[]>([]);
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
        } else {
          setUsername(data.username || '');
          setFullName(data.full_name || '');
          setRole(data.role || '');
          setEditHref('/dashboard/profile/creator/edit');
          setEmail(data.email || '');
          setBio(data.bio || '');
          setProfileUrl(data.profile_url || null);

          try {
            const parsed = JSON.parse(data.social_links || '[]');
            setPlatforms(parsed);
          } catch {
            setPlatforms([]);
          }

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
        console.error('Profile load error:', err);
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
      <div className="flex flex-col md:flex-row gap-6">
        {profileUrl && (
          <div className="flex-shrink-0">
            <Image
              src={profileUrl}
              alt="Profile Picture"
              width={120}
              height={120}
              className="rounded-xl border border-white/20 object-cover"
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
              {bio && <p className="text-white/70 max-w-md mt-2">{bio}</p>}
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
            <StatBadge label="Avg. Rating" value="4.9 / 5" />
            <StatBadge label="Total Views" value="42k" />
          </div>

          <div className="mt-4">
            <h2 className="text-lg font-semibold mb-2 text-white">Social Platforms</h2>
            {platforms.length > 0 ? (
              <ul className="space-y-2">
                {platforms.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-white/70">{p.name}:</span>
                    <a
                      href={p.url}
                      className="text-yellow-400 hover:underline break-all"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {p.url}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-white/50 italic">No platforms added.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
