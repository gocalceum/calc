import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../supabaseClient'

export default function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const view = searchParams.get('view') || 'sign_in'

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/')
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/')
      }
      if (event === 'USER_UPDATED') {
        navigate('/')
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div className="container" style={{ padding: '50px 0 100px 0' }}>
      <div className="row flex-center flex">
        <div className="col-6 form-widget" style={{ maxWidth: '400px', width: '100%' }}>
          <h1 className="header" style={{ textAlign: 'center', marginBottom: '10px' }}>
            Calc App
          </h1>
          <p className="description" style={{ textAlign: 'center', marginBottom: '30px' }}>
            Sign in to your account or create a new one
          </p>

          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#24b47e',
                    brandAccent: '#1ea06e',
                    inputBackground: '#101010',
                    inputText: 'white',
                    inputPlaceholder: '#666',
                    inputBorder: '#333',
                    inputBorderFocus: '#24b47e',
                    inputBorderHover: '#444',
                    messageText: 'white',
                    messageBackground: '#222',
                    messageBorder: '#333',
                    anchorTextColor: '#24b47e',
                    anchorTextHoverColor: '#1ea06e',
                  },
                  space: {
                    inputPadding: '10px 15px',
                    buttonPadding: '10px 15px',
                  },
                  borderWidths: {
                    buttonBorderWidth: '1px',
                    inputBorderWidth: '1px',
                  },
                  radii: {
                    borderRadiusButton: '4px',
                    buttonBorderRadius: '4px',
                    inputBorderRadius: '4px',
                  },
                },
              },
              style: {
                button: {
                  fontSize: '14px',
                  fontWeight: 'normal',
                  textTransform: 'uppercase',
                },
                label: {
                  color: '#666',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                },
                input: {
                  fontSize: '14px',
                },
                anchor: {
                  fontSize: '14px',
                },
                message: {
                  fontSize: '14px',
                  padding: '10px',
                  borderRadius: '4px',
                  marginBottom: '10px',
                },
              },
            }}
            theme="dark"
            providers={[]}
            view={view}
            showLinks={true}
            redirectTo={`${window.location.origin}/`}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Email',
                  password_label: 'Password',
                  button_label: 'Sign In',
                  link_text: "Don't have an account? Sign up",
                },
                sign_up: {
                  email_label: 'Email',
                  password_label: 'Password',
                  button_label: 'Sign Up',
                  link_text: 'Already have an account? Sign in',
                },
                forgotten_password: {
                  link_text: 'Forgot your password?',
                  button_label: 'Send reset email',
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  )
}
