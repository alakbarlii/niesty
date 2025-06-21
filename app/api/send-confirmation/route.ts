import { Resend } from 'resend';

export async function POST(req: Request) {
  const body = await req.json();
  const { fullName, email } = body;

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: 'Niesty <onboarding@resend.dev>',
      to: email,
      subject: "Niesty Waitlist Confirmation",
      html: `
        <div style="font-family: sans-serif; padding: 24px;">
          <h2>Hey ${fullName},</h2>
          <br/>
          <p>Thanks for joining the Niesty waitlist.</p>
          <br/>
          You’ll be notified as soon as access becomes available.
          <br/>
          <br/>
          <p>–Niesty Team</p>
        </div>
      `,
    });

    return new Response(JSON.stringify({ success: true }));
  } catch {
    return new Response(JSON.stringify({ error: 'Email failed' }), { status: 500 });
  }
  
  }

