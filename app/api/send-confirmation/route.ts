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
         <p style="font-size: 16px; line-height: 1.5;">
      You’re officially on the Niesty waitlist. We’re building a platform that makes sponsorships effortless and powerful — whether you're a creator or a brand.
    </p>
          <br/>
          You’ll be notified as soon as access becomes available.
          <br/>
          <br/>
          <p>–Niesty Team</p>
        </div>
      `,
    });

    return new Response(JSON.stringify({ success: true }));
  } catch (err) {
    console.error('Email failed:', err); // ⬅ logs the real reason
    return new Response(JSON.stringify({ error: 'Email failed' }), { status: 500 });
  }
  }

