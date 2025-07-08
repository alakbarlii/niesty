// app/dashboard/search/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Image from 'next/image';
import Link from 'next/link';
import { Search } from 'lucide-react';

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
          const matchesName = p.full_name?.toLowerCase().includes(lowerSearch);
          const matchesUsername = p.username?.toLowerCase().includes(lowerSearch.replace(/^@/, '')) ||
                                   ('@' + p.username?.toLowerCase()).includes(lowerSearch);
          const matchesRole = roleFilter === 'all' || p.role === roleFilter;
          return (matchesName || matchesUsername) && matchesRole;
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
    <section className="p-6 md:p-12">
      <div className="flex flex-col gap-6 max-w-3xl mx-auto">
        <div className="flex flex-col gap-4 pt-10 mb-2">
          <h1 className="text-5xl font-extrabold text-white tracking-tight mb-3">Search</h1>
          <div className="relative w-full max-w-xl">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-full border px-5 py-3 pr-14 text-lg bg-black/40 backdrop-blur-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white"
            />
            <Search className="absolute right-10 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            {loading ? (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 border-2 border-t-white border-gray-400 rounded-full animate-spin" />
            ) : (
              searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-3xl text-gray-400 hover:text-white"
                >
                  &times;
                </button>
              )
            )}
          </div>
        </div>

        <div className="flex gap-2 text-sm -mt-2">
          {[{ label: 'All', value: 'all' }, { label: 'Creators', value: 'creator' }, { label: 'Businesses', value: 'business' }].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setRoleFilter(value as 'all' | 'creator' | 'business')}
              className={`px-4 py-1.5 rounded-full border text-sm font-medium transition ${
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
            <div className="flex flex-col gap-6 mt-6">
              {visibleProfiles.map((profile) => (
                <Link
                  key={profile.id}
                  href={`/dashboard/view/${profile.username}`}
                  className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl overflow-hidden hover:scale-[1.01] transition duration-200 shadow-md hover:shadow-xl"
                >
                  <div className="p-5 flex gap-4 items-start">
                    <div className="flex flex-col items-center w-[64px]">
                      <Image
                        src={profile.profile_url || '/default-avatar.png'}
                        alt="avatar"
                        width={64}
                        height={64}
                        className="w-[64px] h-[64px] rounded-full object-cover border border-white/20"
                      />
                      <div className="text-xs text-gray-400 mt-1 truncate">@{profile.username}</div>
                    </div>
                    <div className="flex flex-col justify-start w-full">
                      <div className="text-white font-extrabold text-xl mb-1">{profile.full_name}</div>
                      <div className="text-sm text-gray-400 capitalize mb-1">
                        {profile.role} <span className="text-yellow-400 ml-2">⭐ 5.0</span>
                      </div>
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
