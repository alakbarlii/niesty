// lib/waitlist.ts
export async function checkWaitlist(email: string): Promise<{ ok: boolean; role: string | null }> {
    const res = await fetch(`/api/waitlist?email=${encodeURIComponent(email.trim().toLowerCase())}`, { cache: 'no-store' });
    const json = await res.json();
    return { ok: !!json?.ok, role: json?.role ?? null };
  }
  
  export async function submitWaitlist(payload: { email: string; full_name?: string; role?: 'creator' | 'business' }) {
    const res = await fetch('/api/waitlist/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json?.ok) throw new Error(json?.error || 'waitlist submit failed');
    return true;
  }