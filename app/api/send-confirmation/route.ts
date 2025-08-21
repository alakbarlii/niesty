import { NextResponse } from 'next/server';

// make sure Next treats this as dynamic and doesn't pre-render
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Body = { email?: string; fullName?: string };

export async function POST(req: Request) {
  try {
    const { email, fullName } = (await req.json()) as Body;
    if (!email) {
      return NextResponse.json({ ok: false, error: 'No email provided' }, { status: 400 });
    }

    const key = process.env.RESEND_API_KEY;
    if (!key) {
      // No key in env → skip sending, but DO NOT fail build or request
      console.warn('[send-confirmation] RESEND_API_KEY missing; skipping email for', email);
      return NextResponse.json({ ok: true, skipped: 'no_api_key' }, { status: 200 });
    }

    // Lazy import & init only when key exists
    const { Resend } = await import('resend');
    const resend = new Resend(key);

    await resend.emails.send({
      from: 'Niesty <no-reply@niesty.com>', // set a verified sender on Resend
      to: email,
      subject: 'Welcome to Niesty!',
      html: `<p>🎉 You're on the waitlist, ${fullName ?? ''}! We'll notify you when early access opens.</p>`,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[send-confirmation] error', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
