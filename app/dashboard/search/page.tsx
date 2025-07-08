// app/dashboard/search/page.tsx
'use client';

import { useEffect, useState } from 'react';
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
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [visibleProfiles, setVisibleProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'creator' | 'business'>('all');
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  const pageSize = 6;

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const fetchProfiles = async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (!error && data) {
        setProfiles(data);
        console.log('Fetched profiles:', data);
      }
      setInitialLoad(false);
    };

    fetchProfiles();
  }, []);

  useEffect(() => {
    if (!initialLoad) {
      setLoading(true);
      const timeout = setTimeout(() => {
        const lowerSearch = searchTerm.toLowerCase();
        const filtered = profiles.filter((p) => {
          const matchesName = p.full_name?.toLowerCase().startsWith(lowerSearch);
          const matchesRole = roleFilter === 'all' || p.role === roleFilter;
          return matchesName && matchesRole;
        });
        console.log('Filtered profiles:', filtered);
        setFilteredProfiles(filtered);
        setVisibleProfiles(filtered.slice(0, pageSize));
        setHasMore(filtered.length > pageSize);
        setLoading(false);
      }, 300);

      return () => clearTimeout(timeout);
    }
  }, [searchTerm, roleFilter, profiles, initialLoad]);

  const loadMore = () => {
    const next = filteredProfiles.slice(visibleProfiles.length, visibleProfiles.length + pageSize);
    setVisibleProfiles([...visibleProfiles, ...next]);
    setHasMore(filteredProfiles.length > visibleProfiles.length + next.length);
  };

  return (
    <section className="p-6 md:p-12">
      <div className="flex flex-col gap-8 max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 pt-6 mb-4">
          <h1 className="text-4xl font-bold text-white">Search</h1>
          <div className="relative w-full max-w-xl">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-xl border px-4 py-3 pr-14 text-lg focus:outline-none"
            />
            {loading ? (
              <div className="absolute right-3 top-3 w-6 h-6 border-2 border-t-white border-gray-400 rounded-full animate-spin" />
            ) : (
              searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2 text-3xl text-gray-400 hover:text-white"
                >
                  &times;
                </button>
              )
            )}
          </div>
        </div>

        <div className="flex gap-2 text-sm">
          {['all', 'creator', 'business'].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role as 'all' | 'creator' | 'business')}
              className={`px-4 py-1.5 rounded-full border text-sm font-medium ${
                roleFilter === role ? 'bg-white text-black' : 'bg-black text-white border-white'
              }`}
            >
              {role === 'all' ? 'All' : role === 'creator' ? 'Creators' : 'Businesses'}
            </button>
          ))}
        </div>

        <div className="min-h-[100px]">
          {loading && searchTerm && <p className="text-gray-400 mt-4">Searching...</p>}

          {!loading && searchTerm && visibleProfiles.length === 0 && (
            <p className="text-gray-400 mt-4">No matching profiles found.</p>
          )}

          {!loading && visibleProfiles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
              {visibleProfiles.map((profile) => (
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

          {!loading && hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={loadMore}
                className="px-5 py-2 rounded-full bg-white text-black font-semibold hover:bg-gray-200"
              >
                See More
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
