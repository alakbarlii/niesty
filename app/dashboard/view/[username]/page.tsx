"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Image from 'next/image';
import { MoreVertical, Flag } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  role: string;
  email: string;
  profile_url?: string;
  deals_completed?: number;
  avg_rating?: number;
}

export default function PublicProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportMessage, setReportMessage] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('username', username).single();
      if (data) setProfile(data);
    };
    fetchProfile();
  }, [username, supabase]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleReport = async () => {
    await supabase.from('reports').insert({
      reported_user: profile!.id,
      message: reportMessage,
    });
    alert(`Reported with message: ${reportMessage || 'No message provided'}`);
    setReporting(false);
    setReportMessage('');
    setShowMenu(false);
  };

  if (!profile) return <div className="text-white p-10">Loading...</div>;

  return (
    <section className="p-6 md:p-12">
      <div className="relative max-w-4xl mx-auto">
        <div className="flex items-start gap-4">
          <div className="w-[96px] h-[96px] rounded-full overflow-hidden border-2 border-white/20 -ml-16 mt-10 bg-white/10">
            <Image
              src={profile.profile_url || '/default-avatar.png'}
              alt="Profile Picture"
              width={96}
              height={96}
              className="object-cover w-full h-full"
            />
          </div>

          <div className="relative bg-white/5 border border-white/10 rounded-2xl p-6 pt-8 w-full">
            <button
              className="absolute top-4 right-4 text-white hover:text-gray-300"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreVertical size={20} />
            </button>

            {showMenu && (
              <div className="absolute right-4 top-12 bg-black border border-white/10 rounded-md shadow-md w-60 z-20 p-3">
                <div className="text-sm text-white font-medium mb-2">Share this profile</div>
                <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded mb-2 break-all">
                  {window.location.href}
                </div>
                <button
                  onClick={handleCopy}
                  className="w-full py-1.5 bg-yellow-400 hover:bg-yellow-500 text-black rounded text-sm font-semibold mb-3"
                >
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>

                <hr className="border-white/10 mb-3" />

                <button
                  onClick={() => setReporting(true)}
                  className="w-full py-1.5 text-sm text-red-500 hover:text-red-600 flex items-center gap-2"
                >
                  <Flag size={16} /> Report this user
                </button>
              </div>
            )}

            <div className="text-white font-bold text-2xl mb-1">{profile.full_name}</div>
            <div className="text-yellow-400 font-semibold -mt-1">@{profile.username}</div>
            <div className="text-gray-400 text-sm mt-1 capitalize">{profile.role}</div>
            <div className="text-gray-300 text-sm mt-1">Contact: {profile.email}</div>

            <div className="flex gap-4 mt-5">
              <div className="bg-black px-4 py-2 rounded-xl text-center text-sm border border-white/10 text-white cursor-pointer" onClick={() => window.location.href = `/dashboard/view/${profile.username}/deals`}>
                <div className="text-yellow-400 font-semibold text-md">{profile.deals_completed || 0}</div>
                <div className="text-xs text-gray-400">Deals Completed</div>
              </div>
              <div className="bg-black px-4 py-2 rounded-xl text-center text-sm border border-white/10 text-white">
                <div className="text-yellow-400 font-semibold text-md">{profile.avg_rating || '-'}</div>
                <div className="text-xs text-gray-400">Avg. Rating</div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button className="px-4 py-2 rounded-full bg-yellow-400 text-black font-semibold hover:bg-yellow-500">
                Request Deal
              </button>
              <button className="px-4 py-2 rounded-full bg-gray-700 text-white font-semibold hover:bg-gray-600">
                Send Message
              </button>
            </div>

            {reporting && (
              <div className="mt-6 bg-black/40 p-4 rounded-xl border border-red-500 text-white">
                <div className="text-red-500 font-semibold mb-2">Report this user</div>
                <textarea
                  value={reportMessage}
                  onChange={(e) => setReportMessage(e.target.value)}
                  placeholder="Optional details..."
                  className="w-full bg-black/20 text-white p-2 rounded border border-white/10 focus:outline-none"
                  rows={3}
                />
                <button
                  onClick={handleReport}
                  className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
                >
                  Submit Report
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
