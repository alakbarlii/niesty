'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type Profile = {
  name: string
  role: string
  bio: string
  audience: string
  social_links: string
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)

  const [name, setName] = useState('')
  const [role, setRole] = useState('creator')
  const [bio, setBio] = useState('')
  const [audience, setAudience] = useState('')
  const [socialLinks, setSocialLinks] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session?.user.id)
        .single()

        if (error) {
          console.error('Error fetching profile:', error)
        }
        
      if (data) {
        setProfile(data)
        setName(data.name)
        setRole(data.role)
        setBio(data.bio)
        setAudience(data.audience)
        setSocialLinks(data.social_links)
      }

      setLoading(false)
    }

    fetchProfile()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {

    e.preventDefault()
    setLoading(true)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const userId = session?.user.id

    const payload = {
      id: userId,
      name,
      role,
      bio,
      audience,
      social_links: socialLinks,
    }

    const { error } = profile
      ? await supabase.from('profiles').update(payload).eq('id', userId)
      : await supabase.from('profiles').insert(payload)

    if (error) {
      alert('Failed to save profile.')
      console.error(error)
    } else {
      alert('Profile saved.')
    }

    setLoading(false)
  }

  return (
    <div className="max-w-xl mx-auto mt-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Your Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          required
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="creator">Creator</option>
          <option value="brand">Brand</option>
        </select>
        <textarea
          placeholder="Short Bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          placeholder="Audience / Company Size"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          placeholder="Social Links (IG, TikTok, Website)"
          value={socialLinks}
          onChange={(e) => setSocialLinks(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white py-2 px-4 rounded hover:opacity-90"
        >
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  )
}
