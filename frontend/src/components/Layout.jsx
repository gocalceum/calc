import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Layout() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div>
      <nav style={{
        background: '#222',
        padding: '15px 30px',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <Link to="/" style={{ 
            color: '#24b47e', 
            fontSize: '20px', 
            fontWeight: 'bold',
            textDecoration: 'none' 
          }}>
            Calc App
          </Link>
        </div>
        
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {session ? (
            <>
              <Link to="/" style={{ color: '#fff', textDecoration: 'none' }}>
                Home
              </Link>
              <span style={{ color: '#666' }}>|</span>
              <span style={{ color: '#888' }}>{session.user.email}</span>
              <button
                onClick={handleSignOut}
                style={{
                  background: 'transparent',
                  border: '1px solid #666',
                  color: '#fff',
                  padding: '5px 15px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ color: '#fff', textDecoration: 'none' }}>
                Login
              </Link>
              <Link 
                to="/signup" 
                style={{ 
                  color: '#24b47e', 
                  textDecoration: 'none',
                  border: '1px solid #24b47e',
                  padding: '5px 15px',
                  borderRadius: '4px'
                }}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>
      
      <main>
        <Outlet />
      </main>
    </div>
  )
}