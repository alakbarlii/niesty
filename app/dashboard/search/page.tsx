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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const pageSize = 6;

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data?.user?.id ?? null);
    };

    fetchUser();
  }, [supabase]);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (!error && data) {
        setProfiles(data);
        console.log('Fetched profiles:', data);
      }
      setInitialLoad(false);
    };

    fetchProfiles();
  }, [supabase]);

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
    <section className="p-4 sm:p-6 md:p-12">
      <div className="flex flex-col gap-6 max-w-3xl mx-auto">
        <div className="flex flex-col gap-4 pt-3 mb-1">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-6">Search</h1>
          <div className="relative w-full max-w-2xl mx-auto">
            <Search className="absolute z-10 left-4.5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white" />

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-full border pl-12 pr-12 py-3 text-lg bg-black/40 backdrop-blur-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
            />
            {loading ? (
              <div className="absolute right-5 top-1/2 transform -translate-y-[55%] w-6 h-6 border-2 border-t-white border-gray-400 rounded-full animate-spin" />
            ) : (
              searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-5 top-1/2 transform -translate-y-[60%] text-3xl text-gray-400 hover:text-white"
                >
                  &times;
                </button>
              )
            )}
          </div>
        </div>

        <div className="flex gap-2 text-sm -mt-2 flex-wrap">
          {[{ label: 'All', value: 'all' }, { label: 'Creators', value: 'creator' }, { label: 'Businesses', value: 'business' }].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setRoleFilter(value as 'all' | 'creator' | 'business')}
              className={`px-4 py-1.5 rounded-full border text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-white focus:bg-white focus:text-black ${
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
                  href={
                    profile.user_id === currentUserId
                      ? `/dashboard/profile/${profile.role}/view`
                      : `/dashboard/view/${profile.username}`
                  }
                  className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl overflow-hidden hover:scale-[1.01] transition duration-200 shadow-md hover:shadow-xl"
                >
                  <div className="p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="flex flex-col items-center w-full sm:w-[64px]">
                      <div className="w-[96px] h-[96px] rounded-full overflow-hidden border border-white/20">
                        <Image
                          src={profile.profile_url || '/default-avatar.png'}
                          alt="avatar"
                          width={96}
                          height={96}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <div className="text-xs text-gray-400 mt-1 truncate sm:hidden">@{profile.username}</div>
                    </div>
                    <div className="flex flex-col justify-start w-full">
                      <div className="text-white font-extrabold text-xl mb-1">{profile.full_name}</div>
                      <div className="text-sm text-gray-400 capitalize mb-1">
                        {profile.role} <span className="text-yellow-400 ml-2">⭐ 5.0</span>
                      </div>
                      <div className="text-sm text-gray-300 line-clamp-3 pr-2 sm:pr-4">{profile.description}</div>
                      <div className="text-xs text-gray-400 mt-1 hidden sm:block">@{profile.username}</div>
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
