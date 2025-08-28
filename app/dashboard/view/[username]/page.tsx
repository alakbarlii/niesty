'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { MoreVertical, Flag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { sendDealRequest, PricingMode } from '@/lib/supabase/deals';
import { Turnstile } from '@marsidev/react-turnstile';

type Role = 'creator' | 'business';

interface Profile {
  id: string;                 // profiles.id (UUID)
  user_id: string;            // auth uid (FK)
  username: string;
  full_name: string;
  role: Role | string;
  email: string;
  profile_url?: string | null;
  deals_completed?: number | null;
  avg_rating?: number | null;
}

export default function PublicProfile() {
  const params = useParams<{ username: string }>();
  const usernameParam = useMemo(() => {
    const raw = params?.username as unknown;
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw) && raw.length > 0) return raw[0]!;
    return '';
  }, [params]);

  const [profile, setProfile] = useState<Profile | null>(null);

  const [viewerRole, setViewerRole] = useState<Role | null>(null); // current user role
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [showLink, setShowLink] = useState(false);

  const [showDealModal, setShowDealModal] = useState(false);
  const [dealMessage, setDealMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const [pricingMode, setPricingMode] = useState<PricingMode>('negotiable');
  const [currency, setCurrency] = useState<string>('USD');
  const [budget, setBudget] = useState<string>('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Turnstile
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

  // ---------- LOAD VIEWED PROFILE + MY ROLE ----------
  useEffect(() => {
    (async () => {
      // 1) Viewed profile by username
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', usernameParam)
        .maybeSingle();

      if (profileError || !profileData) {
        console.warn('[view] profile load error or missing:', profileError);
        setProfile(null);
      } else {
        setProfile({ ...(profileData as Profile), deals_completed: profileData.deals_completed ?? 0 });
      }

      // 2) My role (we do NOT require my profiles.id; API can auto-create if needed)
      const { data: me } = await supabase.auth.getUser();
      const authUid = me?.user?.id ?? null;

      if (authUid) {
        const { data: myProf } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', authUid)
          .maybeSingle();

        const r = myProf?.role;
        setViewerRole(r === 'creator' || r === 'business' ? r : null);
      } else {
        setViewerRole(null);
      }
    })();
  }, [usernameParam]);

  // ---------- DERIVED FLAGS ----------
  const targetRole: Role | null = useMemo(() => {
    if (!profile?.role) return null;
    if (profile.role === 'creator' || profile.role === 'business') return profile.role;
    return null;
  }, [profile]);

  const canSendDeal =
    !!viewerRole && !!targetRole && viewerRole !== targetRole;

  // ---------- MISC ----------
  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleReport = async () => {
    if (!profile) return;
    await supabase.from('reports').insert({
      reported_user: profile.id,
      message: reportMessage,
    });
    alert(`Reported with message: ${reportMessage || 'No message provided'}`);
    setReporting(false);
    setReportMessage('');
    setShowMenu(false);
  };

  if (!profile) return <div className="text-white p-10">Loading...</div>;

  // ---------- DEFENSIVE RECEIVER RESOLVER ----------
  const resolveReceiverId = async (): Promise<string | null> => {
    // fast path
    if (profile?.id) return profile.id;

    // defensive refetch by username
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', usernameParam)
      .maybeSingle();

    if (error || !data?.id) return null;
    return data.id as string;
  };

  // ---------- SEND ----------
  const validateAndOpenConfirm = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      alert('You must be logged in.');
      return;
    }
    if (!canSendDeal) {
      alert('Deals can only be sent to the opposite role.');
      return;
    }
    if (!dealMessage.trim()) {
      alert('Please describe your offer briefly and clearly.');
      return;
    }
    if (pricingMode === 'fixed') {
      const v = Number(budget);
      if (!v || v <= 0 || !Number.isFinite(v)) {
        alert('Enter a valid numeric budget.');
        return;
      }
    }

    // Require Turnstile in production, allow dev bypass
    const needsCaptcha = process.env.NODE_ENV === 'production';
    if (needsCaptcha && siteKey && !turnstileToken) {
      alert('Please complete the verification.');
      return;
    }

    setConfirmOpen(true);
  };

  const actuallySendDeal = async () => {
    if (!viewerRole) return; // we already validate role upstream
    setSubmitting(true);
    try {
      const idToUse = await resolveReceiverId();
      if (!idToUse) {
        alert('This profile is not available right now. Try again in a moment.');
        return;
      }

      const chosenAmount = pricingMode === 'fixed' ? Number(budget) : null;

      const { error } = await sendDealRequest({
        receiverId: idToUse, // guaranteed by resolver
        message: dealMessage.trim(),
        amount: chosenAmount ?? null,
        currency,
        pricingMode,
        senderRoleHint: viewerRole,          // API auto-creates sender profile if missing
        turnstileToken: turnstileToken ?? undefined, // dev bypass handled in helper/API
      });

      if (error) {
        alert('Failed to send deal: ' + error.message);
      } else {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        setShowDealModal(false);
        setDealMessage('');
        setBudget('');
        setPricingMode('negotiable');
        setTurnstileToken(null);
      }
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <section className="p-4 sm:p-6 md:p-12">
      <style jsx global>{`
        input[type='number']::-webkit-outer-spin-button,
        input[type='number']::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type='number'] { -moz-appearance: textfield; }
      `}</style>

      {process.env.NODE_ENV !== 'production' && (
        <div className="max-w-4xl mx-auto mb-4 text-xs text-gray-300 bg-black/40 border border-white/10 rounded p-3">
          <div><b>DEBUG</b></div>
          <div>username: {String(usernameParam)}</div>
          <div>viewed profile.id: {profile?.id || '(null)'}</div>
          <div>viewerRole: {viewerRole || '(null)'}</div>
          <button
            className="mt-2 px-2 py-1 bg-gray-700 rounded"
            onClick={() => {
              console.log('[debug]', { usernameParam, viewedProfileId: profile?.id, viewerRole });
            }}
          >
            Log to console
          </button>
        </div>
      )}

      <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
        <div className="w-[120px] h-[120px] sm:w-[130px] sm:h-[130px] md:w-[140px] md:h-[140px] rounded-full overflow-hidden border-2 border-white/20 bg-white/10">
          <Image
            src={profile.profile_url || '/profile-default.png'}
            alt="Profile Picture"
            width={140}
            height={140}
            className="object-cover w-full h-full"
            onError={(ev) => {
              (ev.currentTarget as HTMLImageElement).src = '/profile-default.png';
            }}
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
                className="text-sm font-medium mb-2 cursor-pointer text-white"
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
          <div className="text-gray-400 text-sm mt-1 capitalize text-center">{targetRole ?? profile.role}</div>
          <div className="text-gray-300 text-sm mt-1 text-center">Contact: {profile.email}</div>

          <div className="flex flex-col sm:flex-row justify-between items-center mt-5 gap-4">
            <div className="flex gap-4">
              <div
                className="bg-black px-4 py-2 rounded-xl text-center text-sm border border-white/10 text-white cursor-pointer"
                onClick={() => (window.location.href = `/dashboard/view/${profile.username}/deals`)}
              >
                <div className="text-yellow-400 font-semibold text-md">{profile.deals_completed || 0}</div>
                <div className="text-xs text-gray-400">Deals Completed</div>
              </div>
              <div className="bg-black px-4 py-2 rounded-xl text-center text-sm border border-white/10 text-white">
                <div className="text-yellow-400 font-semibold text-md">{profile.avg_rating ?? '⭐ 5.0'}</div>
                <div className="text-xs text-gray-400">Avg. Rating</div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDealModal(true)}
                className="px-4 py-2 rounded-full bg-yellow-400 text-black font-semibold hover:bg-yellow-500 disabled:opacity-50"
                disabled={!canSendDeal}
                title={!canSendDeal ? 'Opposite role only' : undefined}
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
              <button onClick={handleReport} className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded">
                Submit Report
              </button>
            </div>
          )}

          {showDealModal && (
            <div className="mt-6 bg-black/40 p-4 rounded-2xl border border-yellow-500 text-white">
              <div className="text-yellow-400 font-semibold mb-2">Describe your sponsorship offer</div>

              <div className="text-xs text-gray-300 bg-black/30 border border-white/10 rounded p-2 mb-3">
                Be precise and short. This is your <b>initial</b> offer — the final price will be agreed during
                <b> Deal Agreement</b>. Choose <b>Fixed</b> to suggest a budget (numbers only) or pick
                <b> Negotiate</b> and align on price later.
              </div>

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
                <label className="flex items-center gap-2 sm:col-span-3">
                  <input
                    type="radio"
                    name="pmode"
                    checked={pricingMode === 'fixed'}
                    onChange={() => setPricingMode('fixed')}
                  />
                  <span className="text-sm">Fixed (enter budget)</span>
                </label>
              </div>

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
                    inputMode="numeric"
                    min={1}
                    step="1"
                    placeholder="Budget (numbers only)"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ''))}
                    className="flex-1 bg-black/20 text-white p-2 rounded border border-white/10 text-sm"
                  />
                </div>
              )}

              <textarea
                value={dealMessage}
                onChange={(e) => setDealMessage(e.target.value)}
                placeholder="Example: Promote my product on your YouTube video for 1 minute. We can negotiate the price."
                className="w-full bg-black/20 text-white p-2 rounded border border-white/10 focus:outline-none"
                rows={3}
              />

              {/* Turnstile (required in production; dev bypass handled in API via 'dev-ok') */}
              {siteKey ? (
                <div className="mt-3">
                  <Turnstile
                    siteKey={siteKey}
                    options={{ action: 'send_deal' }}
                    onSuccess={(token) => setTurnstileToken(token)}
                    onExpire={() => setTurnstileToken(null)}
                    onError={() => setTurnstileToken(null)}
                  />
                </div>
              ) : null}

              <div className="mt-3 flex gap-3 justify-end">
                <button
                  onClick={() => setShowDealModal(false)}
                  className="px-4 py-1.5 bg-gray-700 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={validateAndOpenConfirm}
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

      {confirmOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !submitting && setConfirmOpen(false)} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[45%] w-[92%] max-w-md">
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl p-5 text-white">
              <h3 className="text-lg font-semibold mb-2">Send this offer?</h3>
              <p className="text-sm text-gray-300 mb-4">
                You can still negotiate final pricing during <b>Deal Agreement</b>. If you picked <b>Fixed</b>,
                your budget will be treated as the initial amount.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
                  onClick={() => setConfirmOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-1.5 rounded bg-yellow-500 text-black font-semibold hover:bg-yellow-600 disabled:opacity-50"
                  onClick={actuallySendDeal}
                  disabled={submitting}
                >
                  {submitting ? 'Sending…' : 'Confirm & Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}