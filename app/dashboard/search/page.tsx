// app/dashboard/search/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/lib/supabase/supabase-provider';
import { createBrowserClient } from '@supabase/ssr';
import Image from 'next/image';
import Link from 'next/link';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  role: 'creator' | 'business';
  description: string;
  profile_url?: string;
}

export default function Page() {
  const session = useSession();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'creator' | 'business'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const fetchProfiles = async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (!error && data) {
        const others = data.filter((profile) => profile.user_id !== session?.user?.id);
        setProfiles(others);
      }
      // Always delay just a bit for smoother feel
      setTimeout(() => setLoading(false), 400);
    };

    if (session?.user?.id) {
      fetchProfiles();
    }
  }, [session]);

  useEffect(() => {
    const lowerSearch = searchTerm.toLowerCase();
    const filtered = profiles.filter((p) => {
      const matchesName = p.full_name?.toLowerCase().includes(lowerSearch);
      const matchesRole = roleFilter === 'all' || p.role === roleFilter;
      return matchesName && matchesRole;
    });
    setFilteredProfiles(filtered);
  }, [searchTerm, roleFilter, profiles]);

  return (
    <section className="p-4 md:p-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-white">Search</h1>

        {/* Search Bar */}
        <div className="relative w-full max-w-xl">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-xl border px-4 py-2 pr-14 text-lg focus:outline-none"
          />
          {loading ? (
            <div className="absolute right-3 top-2.5 w-6 h-6 border-2 border-t-white border-gray-400 rounded-full animate-spin" />
          ) : (
            searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1.5 text-3xl text-gray-400 hover:text-white"
              >
                &times;
              </button>
            )
          )}
        </div>

        {/* Role Filters */}
        <div className="flex gap-2 text-sm">
          {['all', 'creator', 'business'].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role as 'all' | 'creator' | 'business')}
              className={`px-3 py-1 rounded-full border ${
                roleFilter === role ? 'bg-white text-black' : 'bg-black text-white border-white'
              }`}
            >
              {role === 'all' ? 'All' : role === 'creator' ? 'Creators' : 'Businesses'}
            </button>
          ))}
        </div>

        {/* Loading / Empty / Results */}
        <div className="mt-6">
          {!loading && filteredProfiles.length === 0 && searchTerm ? (
            <p className="text-gray-400">No matching profiles found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProfiles.map((profile) => (
                <Link
                  key={profile.id}
                  href={`/dashboard/view/${profile.username}`}
                  className="bg-white/5 border border-white/10 p-4 rounded-xl hover:shadow-lg transition"
                >
                  <div className="flex gap-4 items-center">
                    <Image
                      src={profile.profile_url || '/default-avatar.png'}
                      alt="avatar"
                      width={48}
                      height={48}
                      className="rounded-full object-cover"
                    />
                    <div>
                      <div className="font-semibold text-white">{profile.full_name}</div>
                      <div className="text-sm text-gray-400 capitalize">{profile.role}</div>
                      <div className="text-sm text-gray-300 truncate max-w-xs">{profile.description}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
