import React from 'react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/supabaseClient'
import { Session } from '@supabase/supabase-js'

export default function Home() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [website, setWebsite] = useState('')
  const [avatar_url, setAvatarUrl] = useState('')
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (!session) {
        navigate('/login')
      } else {
        getProfile(session)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) {
        navigate('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  const getProfile = async (session: Session) => {
    try {
      setLoading(true)
      const { user } = session

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`username, website, avatar_url`)
        .eq('id', user.id)
        .single()

      if (error && status !== 406) {
        throw error
      }

      if (data) {
        setUsername(data.username || '')
        setWebsite(data.website || '')
        setAvatarUrl(data.avatar_url || '')
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!session) return

    try {
      setLoading(true)
      const { user } = session

      const updates = {
        id: user.id,
        username,
        website,
        avatar_url,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from('profiles').upsert(updates)
      if (error) throw error
      alert('Profile updated!')
    } catch (error) {
      alert('Error updating the data!')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="container" style={{ padding: '50px 0 100px 0' }}>
      <div className="row flex-center">
        <div className="col-6">
          <h1 className="header">Welcome to Calc App</h1>
          <p className="description" style={{ marginBottom: '40px' }}>
            {session?.user?.email}
          </p>

          <form onSubmit={updateProfile} className="form-widget">
            <div>
              <label htmlFor="email">Email</label>
              <input id="email" type="text" value={session?.user?.email} disabled />
            </div>
            <div>
              <label htmlFor="username">Name</label>
              <input
                id="username"
                type="text"
                value={username || ''}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="website">Website</label>
              <input
                id="website"
                type="url"
                value={website || ''}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div>
              <button className="button primary block" disabled={loading}>
                {loading ? 'Loading ...' : 'Update Profile'}
              </button>
            </div>

            <div style={{ marginTop: '20px' }}>
              <button className="button block" onClick={handleSignOut} type="button">
                Sign Out
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
