import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XCircle } from 'lucide-react'

type ConfirmationStatus = 'confirming' | 'error'

export default function AuthConfirm() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<ConfirmationStatus>('confirming')
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Check if we have confirmation tokens in the URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const searchParams = new URLSearchParams(window.location.search)

    const error = hashParams.get('error') || searchParams.get('error')
    const errorDescription =
      hashParams.get('error_description') || searchParams.get('error_description')

    if (error) {
      setStatus('error')
      setMessage(errorDescription || 'An error occurred during confirmation')
    } else {
      // If no error, assume success and immediately redirect to dashboard
      // The OnboardingRouter will handle redirecting to onboarding if needed
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  // Only show UI for errors, success cases redirect immediately
  if (status === 'error') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <Card>
            <CardHeader className="text-center">
              <img
                src="/Calceum LOGO 1F_PNG.png"
                alt="Calceum Logo"
                className="mx-auto mb-4 h-12 w-auto"
              />
              <XCircle className="mx-auto mb-4 h-12 w-12 text-red-600" />
              <CardTitle className="text-2xl">Confirmation Failed</CardTitle>
              <CardDescription className="text-red-600">{message}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button onClick={() => navigate('/signup')} className="w-full" variant="outline">
                  Back to Sign Up
                </Button>
                <Button onClick={() => navigate('/login')} className="w-full">
                  Go to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Show loading spinner while processing
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
    </div>
  )
}
