// app/api/deals/route.ts
import type { NextRequest } from 'next/server';
import { jsonNoStore, requireJson } from '@/lib/http';
import { userSafe } from '@/lib/errors';
import { requireUser } from '@/lib/guards';
import { supabaseServer } from '@/lib/supabaseServer';
import { DealSchema } from '@/lib/validators';
import { verifyTurnstile } from '@/lib/turnstile';
import { secLog } from '@/lib/secLog';

export const dynamic = 'force-dynamic';

type Role = 'creator' | 'business';
type SenderProfile = { id: string; role: Role | string; username?: string | null; email?: string | null } | null;

export async function POST(req: NextRequest) {
  try {
    // 1) Auth
    const g = await requireUser();
    if (!g.user) {
      void secLog('/api/deals', 'unauthorized');
      return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2) Parse + size limit + schema
    const parsed = await requireJson(req, DealSchema, { maxKB: 64 });
    if (parsed instanceof Response) return parsed;
    const body = parsed.data as {
      receiver_id?: string;
      message?: string;
      deal_value?: number | null;
      offer_currency?: string | null;
      offer_pricing_mode?: 'fixed' | 'negotiable' | null;
      sender_role_hint?: Role | null;
      turnstileToken?: string | null;
    };

    // 3) Turnstile (dev bypass "dev-ok")
    const ip =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for') ||
      undefined;

    const token = body.turnstileToken ?? '';
    const v = await verifyTurnstile(token, ip);
    if (!v.ok) {
      void secLog('/api/deals', `turnstile_${v.reason}`, g.user.id);
      return jsonNoStore({ error: 'Bot' }, { status: 400 });
    }

    // 4) Resolve sender/receiver as *profiles.id*
    const supabase = await supabaseServer();

    // Find sender profile (const result), then keep a mutable variable we can set if we auto-create
    const { data: foundSender, error: senderErr } = await supabase
      .from('profiles')
      .select('id, role, username, email')
      .eq('user_id', g.user.id)
      .maybeSingle();

    let senderProf: SenderProfile = foundSender;

    // If missing, attempt **self-heal**: create minimal profile for this user
    if ((!senderProf || !senderProf.id) && !senderErr) {
      const role = body.sender_role_hint;
      if (role !== 'creator' && role !== 'business') {
        return jsonNoStore(
          { error: 'Missing your profile record. Open your profile page, save it once, then try again.' },
          { status: 400 }
        );
      }

      const fallbackUsername = `user-${g.user.id.slice(0, 6)}`;
      const fallbackFullName = g.user.user_metadata?.name || 'New User';
      const fallbackEmail = g.user.email || null;

      const { data: created, error: createErr } = await supabase
        .from('profiles')
        .insert({
          user_id: g.user.id,
          username: fallbackUsername,
          full_name: fallbackFullName,
          role,
          email: fallbackEmail,
        })
        .select('id, role, username, email')
        .maybeSingle();

      if (createErr || !created?.id) {
        void secLog('/api/deals', 'profile_autocreate_failed', g.user.id);
        return jsonNoStore(
          { error: 'Your profile record is missing and could not be created automatically.' },
          { status: 400 }
        );
      }

      senderProf = created;
    }

    if (!senderProf?.id) {
      void secLog('/api/deals', 'missing_sender_profile', g.user.id);
      return jsonNoStore(
        { error: 'Missing your profile record. Open your profile page, save it once, then try again.' },
        { status: 400 }
      );
    }

    // receiver must also be a valid profiles.id
    const receiverId: string | undefined = body.receiver_id ?? undefined;
    if (!receiverId) {
      return jsonNoStore({ error: 'receiver_id is required' }, { status: 400 });
    }

    const { data: receiverProf, error: recvErr } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', receiverId)
      .maybeSingle();

    if (recvErr || !receiverProf?.id) {
      return jsonNoStore({ error: 'Receiver not found' }, { status: 400 });
    }

    // Role validation (opposite roles only, both must be set)
    const sRole = senderProf.role as Role | null;
    const rRole = receiverProf.role as Role | null;
    const valid = (val: unknown): val is Role => val === 'creator' || val === 'business';

    if (!valid(sRole) || !valid(rRole) || sRole === rRole) {
      return jsonNoStore({ error: 'Deals can only be sent to the opposite role' }, { status: 400 });
    }

    // 5) Normalize pricing fields
    const mode: 'fixed' | 'negotiable' =
      body.offer_pricing_mode === 'fixed' || body.offer_pricing_mode === 'negotiable'
        ? body.offer_pricing_mode
        : (body.deal_value && body.deal_value > 0 ? 'fixed' : 'negotiable');

    let deal_value: number | null = null;
    if (mode === 'fixed') {
      if (body.deal_value == null || !Number.isFinite(body.deal_value) || body.deal_value <= 0) {
        return jsonNoStore({ error: 'Enter a valid amount for fixed offers' }, { status: 400 });
      }
      deal_value = body.deal_value;
    } else {
      deal_value = null;
    }

    const msg = (body.message ?? '').trim();
    if (!msg) return jsonNoStore({ error: 'Message is required' }, { status: 400 });

    const curr = (body.offer_currency ?? 'USD').toUpperCase();
    if (!/^[A-Z]{3}$/.test(curr)) {
      return jsonNoStore({ error: 'Currency must be a 3-letter ISO code' }, { status: 400 });
    }

    // 6) Insert (columns must match your table exactly)
    const { data, error } = await supabase
      .from('deals')
      .insert({
        sender_id: senderProf.id as string,     // profiles.id (UUID)
        receiver_id: receiverProf.id as string, // profiles.id (UUID)
        message: msg,
        deal_value,
        offer_currency: curr,
        offer_pricing_mode: mode,
        deal_stage: 'Waiting for Response' as const,
      })
      .select('id')
      .single();

    if (error) {
      const reason = process.env.NODE_ENV === 'production'
        ? userSafe(error.message)
        : error.message;
      void secLog('/api/deals', 'db_error', g.user.id);
      return jsonNoStore({ error: reason }, { status: 400 });
    }

    return jsonNoStore({ deal: data }, { status: 201 });
  } catch (e) {
    void secLog('/api/deals', 'unhandled_error');
    const msg =
      process.env.NODE_ENV === 'production'
        ? 'Request failed'
        : (e instanceof Error ? e.message : 'Request failed');
    return jsonNoStore({ error: msg }, { status: 500 });
  }
}