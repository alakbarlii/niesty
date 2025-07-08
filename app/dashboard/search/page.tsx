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
          const matchesName = p.full_name?.toLowerCase().includes(lowerSearch) || p.username?.toLowerCase().includes(lowerSearch);
          const matchesRole = roleFilter === 'all' || p.role === roleFilter;
          return matchesName && matchesRole;
        });

        if (!searchTerm && roleFilter === 'all') {
          setFilteredProfiles(profiles);
          setVisibleProfiles(profiles.slice(0, pageSize));
          setHasMore(profiles.length > pageSize);
        } else {
          setFilteredProfiles(filtered);
          setVisibleProfiles(filtered.slice(0, pageSize));
          setHasMore(filtered.length > pageSize);
        }

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
    <section className="p-6 md:p-10">
      <div className="flex flex-col gap-8 max-w-4xl mx-auto">
        <div className="flex flex-col gap-4 pt-8 mb-3">
          <h1 className="text-4xl font-bold text-white">Explore Profiles</h1>
          <div className="relative w-full max-w-xl">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-xl border px-4 py-2 pr-14 text-base focus:outline-none"
            />
            {loading ? (
              <div className="absolute right-3 top-2.5 w-5 h-5 border-2 border-t-white border-gray-400 rounded-full animate-spin" />
            ) : (
              searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1.5 text-2xl text-gray-400 hover:text-white"
                >
                  &times;
                </button>
              )
            )}
          </div>
        </div>

        <div className="flex gap-2 text-sm">
          {[{ label: 'All', value: 'all' }, { label: 'Creators', value: 'creator' }, { label: 'Businesses', value: 'business' }].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setRoleFilter(value as 'all' | 'creator' | 'business')}
              className={`px-4 py-1.5 rounded-full border text-sm font-medium ${
                roleFilter === value ? 'bg-white text-black' : 'bg-black text-white border-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-[100px]">
          {loading && <p className="text-gray-400 mt-4">Searching...</p>}

          {!loading && visibleProfiles.length === 0 && (
            <p className="text-gray-400 mt-4">No matching profiles found.</p>
          )}

          {!loading && visibleProfiles.length > 0 && (
            <div className="flex flex-col gap-5 mt-4">
              {visibleProfiles.map((profile) => (
                <Link
                  key={profile.id}
                  href={`/dashboard/view/${profile.username}`}
                  className="relative bg-white/5 backdrop-blur-sm border border-white/10 p-5 rounded-2xl hover:scale-[1.01] transition duration-200 shadow-md hover:shadow-xl"
                >
                  <div className="flex gap-4 items-start">
                    <Image
                      src={profile.profile_url || '/default-avatar.png'}
                      alt="avatar"
                      width={64}
                      height={64}
                      className="rounded-full object-cover border border-white/20"
                    />
                    <div className="flex flex-col w-full gap-1">
                      <div className="text-white font-bold text-lg">{profile.full_name}</div>
                      <div className="text-sm text-gray-300">
                        {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} <span className="ml-2 text-yellow-400">⭐ 5.0</span>
                      </div>
                      <div className="text-sm text-gray-200 leading-snug line-clamp-2">
                        {profile.description}
                      </div>
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
