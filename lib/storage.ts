// lib/storage.ts
import { supabaseServer } from './supabaseServer'

export async function getSignedAvatarUrl(path: string, expiresInSeconds = 60) {
  const supabase = await supabaseServer()
  const { data, error } = await supabase.storage.from('profiles').createSignedUrl(path, expiresInSeconds)
  if (error) return null
  return data?.signedUrl ?? null
}
