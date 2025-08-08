'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { MoreVertical, Flag } from 'lucide-react';
import { sendDealRequest } from '@/lib/supabase/deals';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  role: 'creator' | 'business' | string;
  email: string;
  profile_url?: string;
  deals_completed?: number;
  avg_rating?: number;
}

export default function PublicProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerRole, setViewerRole] = useState<'creator' | 'business' | null>(null);

  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [showLink, setShowLink] = useState(false);

  const [showDealModal, setShowDealModal] = useState(false);
  const [dealMessage, setDealMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // pricing state
  const [pricingMode, setPricingMode] = useState<'negotiable' | 'fixed' | 'range'>('negotiable');
  const [amountMin, setAmountMin] = useState<string>('');
  const [amountMax, setAmountMax] = useState<string>('');
  const [currency, setCurrency] = useState<string>('USD');

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

      if (!dealError) {
        setProfile({
          ...profileData,
          deals_completed: count ?? 0,
        });
      } else {
        setProfile(profileData);
      }

      // viewer info (role + id)
      const { data: me } = await supabase.auth.getUser();
      const uid = me?.user?.id ?? null;
      setViewerId(uid);

      if (uid) {
        const { data: myProf } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', uid)
          .maybeSingle();
        const r = myProf?.role;
        setViewerRole(r === 'creator' || r === 'business' ? r : null);
      }
    };

    fetchProfileAndDeals();
  }, [username]);

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

  const isSelf = !!viewerId && viewerId === profile.id;
  const sameRole =
    !!viewerRole &&
    (viewerRole === (profile.role === 'creator' ? 'creator' : profile.role === 'business' ? 'business' : 'x'));

  const canSendDeal = !isSelf && !!viewerRole && (sameRole ? false : (viewerRole === 'creator' || viewerRole === 'business'));

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
                    {typeof window !== 'undefined' ? window.location.href : ''}
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
                  (window.location.href = `/dashboard/view/${profile.username}/deals`)
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
              {!isSelf && (
                <button
                  onClick={() => setShowDealModal(true)}
                  className="px-4 py-2 rounded-full bg-yellow-400 text-black font-semibold hover:bg-yellow-500 disabled:opacity-50"
                  disabled={!canSendDeal}
                  title={
                    isSelf
                      ? 'Cannot send a deal to yourself'
                      : !viewerRole
                      ? 'Login required'
                      : sameRole
                      ? 'Deals can only be sent to the opposite role'
                      : undefined
                  }
                >
                  Request Deal
                </button>
              )}
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

              {/* Pricing mode */}
              <div className="grid sm:grid-cols-4 gap-3 mb-3">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="pmode"
                    checked={pricingMode === 'negotiable'}
                    onChange={() => setPricingMode('negotiable')}
                  />
                  <span className="text-sm">Negotiate</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="pmode"
                    checked={pricingMode === 'fixed'}
                    onChange={() => setPricingMode('fixed')}
                  />
                  <span className="text-sm">Fixed</span>
                </label>
                <label className="flex items-center gap-2 sm:col-span-2">
                  <input
                    type="radio"
                    name="pmode"
                    checked={pricingMode === 'range'}
                    onChange={() => setPricingMode('range')}
                  />
                  <span className="text-sm">Range</span>
                </label>
              </div>

              {/* Amount inputs */}
              {pricingMode === 'fixed' && (
                <div className="flex items-center gap-3 mb-3">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="bg-black/20 border border-white/10 rounded px-2 py-1 text-sm"
                  >
                    <option>USD</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    step="1"
                    placeholder="Amount"
                    value={amountMin}
                    onChange={(e) => setAmountMin(e.target.value)}
                    className="flex-1 bg-black/20 text-white p-2 rounded border border-white/10 text-sm"
                  />
                </div>
              )}

              {pricingMode === 'range' && (
                <div className="flex items-center gap-3 mb-3">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="bg-black/20 border border-white/10 rounded px-2 py-1 text-sm"
                  >
                    <option>USD</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    step="1"
                    placeholder="Min"
                    value={amountMin}
                    onChange={(e) => setAmountMin(e.target.value)}
                    className="w-32 bg-black/20 text-white p-2 rounded border border-white/10 text-sm"
                  />
                  <input
                    type="number"
                    min={1}
                    step="1"
                    placeholder="Max"
                    value={amountMax}
                    onChange={(e) => setAmountMax(e.target.value)}
                    className="w-32 bg-black/20 text-white p-2 rounded border border-white/10 text-sm"
                  />
                </div>
              )}

              {/* Message */}
              <textarea
                value={dealMessage}
                onChange={(e) => setDealMessage(e.target.value)}
                placeholder="Scope, deliverables, dates, etc."
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
                    if (isSelf) {
                      alert('You cannot send a deal to yourself.');
                      return;
                    }
                    if (!canSendDeal) {
                      alert('Deals can only be sent to the opposite role.');
                      return;
                    }

                    // client-side validation mirroring server
                    if (pricingMode === 'fixed') {
                      const v = Number(amountMin);
                      if (!v || v <= 0) return alert('Enter a valid fixed amount');
                    }
                    if (pricingMode === 'range') {
                      const v1 = Number(amountMin), v2 = Number(amountMax);
                      if (!v1 || !v2 || v1 <= 0 || v2 <= 0 || v1 > v2) {
                        return alert('Enter a valid range (min ≤ max)');
                      }
                    }

                    const { error } = await sendDealRequest({
                      senderId: user.id,
                      receiverId: profile.id,
                      message: dealMessage,
                      pricingMode,
                      amountMin: amountMin ? Number(amountMin) : null,
                      amountMax: amountMax ? Number(amountMax) : null,
                      currency,
                    });

                    if (error) {
                      alert('Failed to send deal: ' + error.message);
                    } else {
                      setShowToast(true);
                      setTimeout(() => setShowToast(false), 3000);
                      setShowDealModal(false);
                      setDealMessage('');
                      setAmountMin('');
                      setAmountMax('');
                      setPricingMode('negotiable');
                    }
                  }}
                  className="px-4 py-1.5 bg-yellow-500 text-black rounded hover:bg-yellow-600 disabled:opacity-50"
                  disabled={!canSendDeal}
                  title={!canSendDeal ? 'Opposite role only' : undefined}
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
