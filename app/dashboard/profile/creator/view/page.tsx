/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import StatBadge from '@/components/StatBadge';
import { useRouter } from 'next/navigation';

type Social = { name: string; url: string };

export default function CreatorProfileView() {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [platforms, setPlatforms] = useState<Social[]>([]);
  const [profileUrl, setProfileUrl] = useState<string | null>(null);
  const [dealCount, setDealCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // session
        const { data: { session }, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;
        const userId = session?.user?.id;
        const userEmail = (session?.user?.email || '').toLowerCase();
        if (!userId || !userEmail) throw new Error('No user session found');

        // profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        // ✅ FIX: correct column name; count deals where I'm sender OR receiver
        const { count, error: dealsErr } = await supabase
          .from('deals')
          .select('*', { count: 'exact', head: true })
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

        if (dealsErr) throw dealsErr;
        setDealCount(count || 0);

        if (!profile || profileError) {
          // fallback full name from waitlist
          try {
            const res = await fetch(`/api/waitlist?email=${encodeURIComponent(userEmail)}`, { cache: 'no-store' });
            const j = await res.json();
            if (res.ok && j?.ok && j?.full_name) setFullName(j.full_name as string);
          } catch { /* ignore */ }
          setUsername('');
          setRole('');
          setEmail(userEmail);
          setDescription('');
          setPlatforms([]);
          setProfileUrl(null);
        } else {
          setUsername(profile.username || '');
          setFullName(profile.full_name || '');
          setRole(profile.role || '');
          setEmail(profile.email || userEmail);
          setDescription(profile.description || '');
          setProfileUrl(profile.profile_url || null);

          try {
            const parsed = JSON.parse(profile.social_links || '[]');
            setPlatforms(Array.isArray(parsed) ? parsed : []);
          } catch {
            setPlatforms([]);
          }

          if (!profile.full_name) {
            try {
              const res = await fetch(`/api/waitlist?email=${encodeURIComponent(userEmail)}`, { cache: 'no-store' });
              const j = await res.json();
              if (res.ok && j?.ok && j?.full_name) setFullName(j.full_name as string);
            } catch { /* ignore */ }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        console.error('Profile load error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) return <p className="text-white p-6">Loading...</p>;
  if (error) return <p className="text-red-500 p-6">Error: {error}</p>;

  return (
    <section className="p-4 sm:p-6 md:p-10 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row gap-6 md:items-start items-center text-center md:text-left">
        <div className="w-[120px] h-[120px] sm:w-[130px] sm:h-[130px] md:w-[140px] md:h-[140px] rounded-full overflow-hidden border border-white/20">
          <img
            src={profileUrl || '/profile-default.png'}
            alt="Profile Picture"
            className="w-full h-full object-cover rounded-full"
            onError={(e) => { e.currentTarget.src = '/profile-default.png'; }}
          />
        </div>

        <div className="flex-1 w-full bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start mb-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1 text-white">{fullName || 'Unnamed'}</h1>
              <p className="text-sm text-yellow-400">@{username || 'username'}</p>
              <p className="text-sm text-white/60 capitalize mt-1">{role}</p>
              <p className="text-sm text-white/70 mt-1">Contact: {email}</p>
              {description && <p className="text-white/70 max-w-md mt-2">{description}</p>}
            </div>
            <button
              onClick={() => router.push('/dashboard/profile/creator/edit')}
              className="bg-yellow-400 text-black px-4 py-2 rounded-lg font-semibold hover:bg-yellow-300"
            >
              Edit Profile
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 mb-6">
            <StatBadge label="Deals Completed" value={dealCount} />
            <StatBadge label="Avg. Rating" value="4.9 / 5" />
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
                      rel="noopener noreferrer">
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
