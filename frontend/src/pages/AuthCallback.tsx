import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/supabaseClient'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      // Get the code from the URL
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const error = urlParams.get('error')
      const errorDescription = urlParams.get('error_description')

      // Handle any errors from the OAuth provider
      if (error) {
        console.error('OAuth error:', error, errorDescription)
        navigate(`/login?error=${encodeURIComponent(errorDescription || error)}`)
        return
      }

      // Exchange the code for a session
      if (code) {
        const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
        
        if (sessionError) {
          console.error('Error exchanging code for session:', sessionError)
          navigate(`/login?error=${encodeURIComponent(sessionError.message)}`)
        } else {
          // Successfully authenticated, redirect to home
          navigate('/')
        }
      } else {
        // No code or error, something went wrong
        navigate('/login?error=Authentication%20failed')
      }
    }

    handleCallback()
  }, [navigate, supabase])

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Completing sign in...</h2>
        <p className="text-muted-foreground">Please wait while we redirect you.</p>
        <div className="mt-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    </div>
  )
}