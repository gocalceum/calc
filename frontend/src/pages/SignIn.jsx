import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../supabaseClient'

export default function SignIn() {
  const navigate = useNavigate()

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/')
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/')
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div className="row flex-center flex">
      <div className="col-6 form-widget" style={{ maxWidth: '400px', width: '100%' }}>
        <h1 className="header" style={{ textAlign: 'center', marginBottom: '30px' }}>
          Sign In to Calc App
        </h1>
        
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#24b47e',
                  brandAccent: '#1ea06e',
                  inputBackground: 'transparent',
                  inputText: 'white',
                  inputBorder: '#333',
                  inputBorderFocus: '#24b47e',
                  inputBorderHover: '#444',
                }
              },
            },
            className: {
              container: 'supabase-auth-container',
              button: 'supabase-auth-button',
              input: 'supabase-auth-input',
            },
          }}
          theme="dark"
          providers={[]}
          view="sign_in"
          showLinks={true}
          redirectTo={`${window.location.origin}/`}
        />
      </div>
    </div>
  )
}