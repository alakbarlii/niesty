'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Image from 'next/image';
import { MoreVertical, Flag } from 'lucide-react';
import { sendDealRequest } from '@/lib/supabase/deals';

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
  const [showLink, setShowLink] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);
  const [dealMessage, setDealMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchProfileAndDeals = async () => {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (profileError || !profileData) return;

      const { count, error: dealError } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .or(`sender_id.eq.${profileData.id},receiver_id.eq.${profileData.id}`)
        .eq('deal_stage', 'Payment Released');

      if (dealError) {
        console.error('Error counting deals:', dealError);
      }

      setProfile({
        ...profileData,
        deals_completed: count ?? 0,
      });
    };

    fetchProfileAndDeals();
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
    <section className="p-4 sm:p-6 md:p-12">
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
        <div className="w-[120px] h-[120px] sm:w-[130px] sm:h-[130px] md:w-[140px] md:h-[140px] rounded-full overflow-hidden border-2 border-white/20 bg-white/10">
          <Image
            src={profile.profile_url || '/default-avatar.png'}
            alt="Profile Picture"
            width={140}
            height={140}
            className="object-cover w-full h-full"
          />
        </div>

        <div className="relative w-full bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 pt-8">
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreVertical size={20} />
          </button>

          {showMenu && (
            <div className="absolute right-4 top-12 bg-black border border-white/10 rounded-md shadow-md w-60 z-20 p-3">
              <div
                className="text-sm text-white font-medium mb-2 cursor-pointer"
                onClick={() => setShowLink(!showLink)}
              >
                Share this profile
              </div>

              {showLink && (
                <>
                  <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded mb-2 break-all">
                    {window.location.href}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="w-full py-1.5 bg-yellow-400 hover:bg-yellow-500 text-black rounded text-sm font-semibold mb-3"
                  >
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                </>
              )}

              <hr className="border-white/10 mb-3" />

              <button
                onClick={() => setReporting(true)}
                className="w-full py-1.5 text-sm text-red-500 hover:text-red-600 flex items-center gap-2"
              >
                <Flag size={16} /> Report this user
              </button>
            </div>
          )}

          <div className="text-white font-bold text-2xl mb-1 text-center">{profile.full_name}</div>
          <div className="text-yellow-400 font-semibold -mt-1 text-center">@{profile.username}</div>
          <div className="text-gray-400 text-sm mt-1 capitalize text-center">{profile.role}</div>
          <div className="text-gray-300 text-sm mt-1 text-center">Contact: {profile.email}</div>

          <div className="flex flex-col sm:flex-row justify-between items-center mt-5 gap-4">
            <div className="flex gap-4">
              <div
                className="bg-black px-4 py-2 rounded-xl text-center text-sm border border-white/10 text-white cursor-pointer"
                onClick={() =>
                  window.location.href = `/dashboard/view/${profile.username}/deals`
                }
              >
                <div className="text-yellow-400 font-semibold text-md">
                  {profile.deals_completed || 0}
                </div>
                <div className="text-xs text-gray-400">Deals Completed</div>
              </div>
              <div className="bg-black px-4 py-2 rounded-xl text-center text-sm border border-white/10 text-white">
                <div className="text-yellow-400 font-semibold text-md">
                  {profile.avg_rating || '⭐ 5.0'}
                </div>
                <div className="text-xs text-gray-400">Avg. Rating</div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDealModal(true)}
                className="px-4 py-2 rounded-full bg-yellow-400 text-black font-semibold hover:bg-yellow-500"
              >
                Request Deal
              </button>
              <button className="px-4 py-2 rounded-full bg-gray-700 text-white font-semibold hover:bg-gray-600">
                Send Message
              </button>
            </div>
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

          {showDealModal && (
            <div className="mt-6 bg-black/40 p-4 rounded-xl border border-yellow-500 text-white">
              <div className="text-yellow-400 font-semibold mb-2">
                Describe your sponsorship offer
              </div>
              <textarea
                value={dealMessage}
                onChange={(e) => setDealMessage(e.target.value)}
                placeholder="Type your offer here..."
                className="w-full bg-black/20 text-white p-2 rounded border border-white/10 focus:outline-none"
                rows={3}
              />
              <div className="mt-3 flex gap-3 justify-end">
                <button
                  onClick={() => setShowDealModal(false)}
                  className="px-4 py-1.5 bg-gray-700 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const { data: userData } = await supabase.auth.getUser();
                    const user = userData?.user;
                    if (!user) {
                      alert('You must be logged in.');
                      return;
                    }

                    const { error } = await sendDealRequest({
                      senderId: user.id,
                      receiverId: profile.id,
                      message: dealMessage,
                    });

                    if (error) {
                      alert('Failed to send deal: ' + error.message);
                    } else {
                      setShowToast(true);
                      setTimeout(() => setShowToast(false), 3000);
                      setShowDealModal(false);
                      setDealMessage('');
                    }
                  }}
                  className="px-4 py-1.5 bg-yellow-500 text-black rounded hover:bg-yellow-600"
                >
                  Send Deal
                </button>
              </div>
            </div>
          )}

          {showToast && (
            <div className="fixed bottom-6 right-6 bg-yellow-500 text-black px-5 py-3 rounded-lg shadow-lg text-sm font-semibold z-50">
              Your deal request has been successfully sent.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
