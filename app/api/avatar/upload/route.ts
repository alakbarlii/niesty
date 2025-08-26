// app/api/avatars/upload/route.ts
import { NextResponse } from 'next/server';
import { createClient as createAdmin, SupabaseClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs'; // ensure Node runtime for Buffer/formdata

// Explicit type for response JSON
interface UploadResponse {
  ok: boolean;
  path?: string;
  publicUrl?: string;
  signedUrl?: string | null;
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    // 1) Get the logged-in user via SSR supabase (cookies)
    const res = new NextResponse<UploadResponse>();
    const supaSSR = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            res.cookies.set(name, value, options);
          },
          remove(name: string, options: CookieOptions) {
            res.cookies.set(name, '', { ...options, maxAge: 0 });
          },
        },
      }
    );

    const { data: userData, error: userErr } = await supaSSR.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
    }
    const user = userData.user;

    // 2) Parse multipart formdata (file + optional contentType)
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'No file provided' }, { status: 400 });
    }

    const contentType: string =
      (form.get('contentType') as string) || file.type || 'application/octet-stream';
    const ext: string = (file.name?.split('.').pop() || 'bin').toLowerCase();
    const filename: string = `${Date.now()}.${ext}`;
    const path: string = `${user.id}/${filename}`;

    const arrayBuffer: ArrayBuffer = await file.arrayBuffer();
    const buffer: Buffer = Buffer.from(arrayBuffer);

    // 3) Use service-role on the server to bypass Storage RLS safely
    const admin: SupabaseClient = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // NEVER expose to client
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Ensure bucket exists (no-op if present)
    await admin.storage.createBucket('avatars').catch(() => { /* ignore if exists */ });

    // Upload (upsert to overwrite old)
    const { error: upErr } = await admin.storage
      .from('avatars')
      .upload(path, buffer, { contentType, upsert: true });

    if (upErr) {
      return NextResponse.json({ ok: false, error: `Upload failed: ${upErr.message}` }, { status: 400 });
    }

    // 4) Save the pointer in the user’s profile
    const publicUrl: string = admin.storage.from('avatars').getPublicUrl(path).data.publicUrl;

    const { error: updErr } = await admin
      .from('profiles')
      .update({ avatar_path: path, avatar_url: publicUrl })
      .eq('user_id', user.id);

    if (updErr) {
      return NextResponse.json({ ok: false, error: `Profile update failed: ${updErr.message}` }, { status: 400 });
    }

    // 5) Mint a signed URL for immediate display (1 hour)
    const { data: signed, error: signErr } = await admin
      .storage
      .from('avatars')
      .createSignedUrl(path, 3600);

    const signedUrl: string | null = signErr ? null : signed?.signedUrl ?? null;

    return NextResponse.json({
      ok: true,
      path,
      publicUrl,
      signedUrl,
    }, { status: 200 });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unexpected error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
