import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
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

  // Hide header bar on auth pages and dashboard
  const authPages = ['/login', '/signup', '/signin', '/forgot-password', '/reset-password', '/auth/callback', '/auth/confirm']
  const dashboardPages = ['/dashboard', '/calculations', '/templates', '/history', '/projects', '/analytics', '/settings', '/profile']
  const isAuthPage = authPages.includes(location.pathname)
  const isDashboardPage = dashboardPages.includes(location.pathname)

  return (
    <div>
      {!isAuthPage && !isDashboardPage && (
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
              Calceum
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
      )}
      
      <main>
        <Outlet />
      </main>
    </div>
  )
}