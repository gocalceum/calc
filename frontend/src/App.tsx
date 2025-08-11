import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'
import { Session } from '@supabase/supabase-js'
import Layout from './components/Layout'
import Login from './pages/Login'
import SignUpNew from './pages/SignUpNew'
import Dashboard from './pages/Dashboard'
import AuthCallback from './pages/AuthCallback'
import AuthConfirm from './pages/AuthConfirm'
import DebugAuth from './pages/DebugAuth'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import './App.css'
import './index.css'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

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
          <Route index element={session ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
          <Route path="dashboard" element={session ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="login" element={!session ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="signup" element={!session ? <SignUpNew /> : <Navigate to="/dashboard" />} />
          <Route path="signin" element={<Navigate to="/login" />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="auth/callback" element={<AuthCallback />} />
          <Route path="auth/confirm" element={<AuthConfirm />} />
          <Route path="debug-auth" element={<DebugAuth />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App