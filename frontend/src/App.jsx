import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import SignUpNew from './pages/SignUpNew'
import './App.css'
import './index.css'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="container" style={{ padding: '50px 0 100px 0', textAlign: 'center' }}>
        <h2>Loading...</h2>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={session ? <Home /> : <Navigate to="/login" />} />
          <Route path="login" element={!session ? <Login /> : <Navigate to="/" />} />
          <Route path="signup" element={!session ? <SignUpNew /> : <Navigate to="/" />} />
          <Route path="signin" element={<Navigate to="/login" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App