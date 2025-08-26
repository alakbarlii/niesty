// lib/uploadAvatar.ts
export async function uploadAvatar(file: File) {
    const form = new FormData();
    form.append('file', file);
    form.append('contentType', file.type || 'application/octet-stream');
  
    const res = await fetch('/api/avatars/upload', { method: 'POST', body: form });
    const body = await res.json();
    if (!res.ok || !body?.ok) throw new Error(body?.error || 'Upload failed');
    return body as { ok: true; path: string; publicUrl: string; signedUrl: string | null };
  }
  