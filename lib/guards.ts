// lib/guards.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from './supabaseServer'

export async function requireUser() {
  const supabase = await supabaseServer()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) {
    return { user: null, unauthorized: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { user: session.user, supabase }
}
