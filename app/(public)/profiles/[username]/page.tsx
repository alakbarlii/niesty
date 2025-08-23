// app/(public)/profiles/[username]/page.tsx
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { supabaseServer } from '@/lib/supabaseServer'
import { getSignedAvatarUrl } from '@/lib/storage'

export default async function ProfilePage(
  { params }: { params: Promise<{ username: string }> } // <- params is a Promise
) {
  const { username } = await params

  const supabase = await supabaseServer()

  const { data: profile } = await supabase
    .from('profiles_public')
    .select('user_id, full_name, username, avatar_path')
    .eq('username', username)
    .maybeSingle()

  if (!profile) notFound()

  const signedUrl = profile.avatar_path
    ? await getSignedAvatarUrl(profile.avatar_path, 60)
    : null

  return (
    <div className="max-w-xl mx-auto p-6">
      {signedUrl ? (
        <Image
          src={signedUrl}
          alt={`${profile.full_name ?? profile.username} avatar`}
          width={120}
          height={120}
          className="rounded-full"
        />
      ) : (
        <div className="w-[120px] h-[120px] rounded-full bg-gray-200" />
      )}

      <h1 className="text-2xl mt-4">{profile.full_name ?? profile.username}</h1>
      <p className="text-gray-600">@{profile.username}</p>
    </div>
  )
}
