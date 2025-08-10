import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [authMode, setAuthMode] = useState('password') // 'password' or 'magic'

  const handleSignInWithPassword = async (e) => {
    e.preventDefault()
    
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert(error.error_description || error.message)
    }
    setLoading(false)
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      alert(error.error_description || error.message)
    } else {
      alert('Check your email for the confirmation link!')
    }
    setLoading(false)
  }

  const handleMagicLink = async (e) => {
    e.preventDefault()

    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email })

    if (error) {
      alert(error.error_description || error.message)
    } else {
      alert('Check your email for the login link!')
    }
    setLoading(false)
  }

  return (
    <div className="row flex-center flex">
      <div className="col-6 form-widget" aria-live="polite">
        <h1 className="header">Supabase + React</h1>
        
        <div className="auth-mode-selector" style={{ marginBottom: '20px' }}>
          <button
            type="button"
            className={`button ${authMode === 'password' ? 'primary' : 'secondary'}`}
            onClick={() => setAuthMode('password')}
            style={{ marginRight: '10px' }}
          >
            Email & Password
          </button>
          <button
            type="button"
            className={`button ${authMode === 'magic' ? 'primary' : 'secondary'}`}
            onClick={() => setAuthMode('magic')}
          >
            Magic Link
          </button>
        </div>

        {authMode === 'password' ? (
          <>
            <p className="description">
              {isSignUp ? 'Create a new account' : 'Sign in with your email and password'}
            </p>
            <form className="form-widget" onSubmit={isSignUp ? handleSignUp : handleSignInWithPassword}>
              <div>
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  className="inputField"
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  className="inputField"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <button className="button block primary" aria-live="polite" disabled={loading}>
                  {loading ? <span>Loading...</span> : <span>{isSignUp ? 'Sign Up' : 'Sign In'}</span>}
                </button>
              </div>
              <div style={{ marginTop: '10px', textAlign: 'center' }}>
                <button
                  type="button"
                  className="button link"
                  onClick={() => setIsSignUp(!isSignUp)}
                  style={{ background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <p className="description">Sign in via magic link with your email below</p>
            <form className="form-widget" onSubmit={handleMagicLink}>
              <div>
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  className="inputField"
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <button className="button block primary" aria-live="polite" disabled={loading}>
                  {loading ? <span>Loading...</span> : <span>Send Magic Link</span>}
                </button>
              </div>
            </form>
          </>
        )}

        {authMode === 'password' && (
          <div style={{ marginTop: '20px', padding: '10px', background: '#f3f4f6', borderRadius: '4px' }}>
            <p style={{ margin: 0, fontSize: '14px' }}>
              <strong>Test Account:</strong><br />
              Email: test@example.com<br />
              Password: test123456
            </p>
          </div>
        )}
      </div>
    </div>
  )
}