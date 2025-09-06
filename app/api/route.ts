export async function GET() {
    return new Response(JSON.stringify({ ok: true, root: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }