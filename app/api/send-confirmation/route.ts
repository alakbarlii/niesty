import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'No email provided' }, { status: 400 });
    }

    await resend.emails.send({
      from: 'Niesty <no-reply@niesty.com>', // once domain is ready
      to: email,
      subject: 'Welcome to Niesty!',
      html: `<p>🎉 You're on the waitlist! We'll notify you as soon as early access opens.</p>`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
