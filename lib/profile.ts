// lib/profile.ts
import { supabase } from '@/lib/supabase'

/**
 * Tables we touch, typed narrowly so we don’t depend on codegen.
 * Adjust field names if your schema differs.
 */
export type ProfileRow = {
  user_id: string
  email: string
  username: string | null
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  role: string | null
}

export type DealStatus = 'created' | 'active' | 'completed' | 'cancelled' | string

export type DealRow = {
  id: string
  creator_user_id: string
  brand_user_id?: string | null
  status: DealStatus
  created_at?: string | null
}

export type ReviewRow = {
  id: string
  target_user_id: string
  rating: number | null
}

export type MyStats = {
  dealsCompleted: number
  avgRating: number | null // 1 decimal, e.g. 4.9; null if no ratings
}

/** Small helper to get the current user id (throws if not logged in). */
async function getUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const uid = data.session?.user?.id
  if (!uid) throw new Error('No session')
  return uid
}

/** Load the signed-in user’s profile (RLS: user_id = auth.uid()). */
export async function loadMyProfile(): Promise<ProfileRow> {
  const uid = await getUserId()

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id,email,username,full_name,bio,avatar_url,role')
    .eq('user_id', uid)
    .single<ProfileRow>()

  if (error) throw error
  return data
}

/**
 * Load creator stats:
 * - dealsCompleted: exact count of completed deals for this user
 * - avgRating: average of ratings about this user (rounded to 1 decimal)
 */
export async function loadMyStats(): Promise<MyStats> {
  const uid = await getUserId()

  // Count completed deals (use HEAD to avoid transferring rows)
  const { count: dealsCompleted, error: dealsErr } = await supabase
    .from('deals')
    .select('*', { count: 'exact', head: true })
    .eq('creator_user_id', uid)
    .eq('status', 'completed')

  if (dealsErr) throw dealsErr

  // Fetch ratings about me
  const { data: ratings, error: ratingsErr } = await supabase
    .from('reviews')
    .select('rating')
    .eq('target_user_id', uid)

  if (ratingsErr) throw ratingsErr

  // Compute average safely without using `any`
  const numbers: number[] =
    (ratings ?? [])
      .map((r) => (typeof r.rating === 'number' ? r.rating : null))
      .filter((v): v is number => v !== null)

  const avgRating: number | null =
    numbers.length === 0
      ? null
      : Math.round(
          (numbers.reduce((sum, n) => sum + n, 0) / numbers.length) * 10
        ) / 10

  return {
    dealsCompleted: dealsCompleted ?? 0,
    avgRating,
  }
}

/** Convenience loader to fetch everything in parallel. */
export async function loadProfileAndStats(): Promise<{
  profile: ProfileRow
  stats: MyStats
}> {
  const [profile, stats] = await Promise.all([loadMyProfile(), loadMyStats()])
  return { profile, stats }
}
