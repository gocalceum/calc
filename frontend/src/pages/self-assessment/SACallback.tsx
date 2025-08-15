import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSAAuth } from '@/hooks/useSAAuth'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SACallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { handleCallback } = useSAAuth()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [connectionCount, setConnectionCount] = useState(0)

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      if (error) {
        setStatus('error')
        setErrorMessage(errorDescription || error || 'OAuth authorization was denied')
        return
      }

      if (!code || !state) {
        setStatus('error')
        setErrorMessage('Missing authorization code or state parameter')
        console.error('Missing OAuth params:', { code: !!code, state: !!state })
        return
      }

      console.log('Processing OAuth callback:', {
        code: code?.substring(0, 10) + '...',
        state,
        storedState: localStorage.getItem('sa_oauth_state'),
      })

      try {
        const result = await handleCallback(code, state)
        if (result) {
          setConnectionCount(result.connections.length)
          setStatus('success')

          // Close window if opened as popup
          if (window.opener) {
            window.opener.postMessage(
              { type: 'oauth-success', connections: result.connections },
              '*'
            )
            setTimeout(() => window.close(), 2000)
          } else {
            // Redirect after 2 seconds
            setTimeout(() => navigate('/self-assessment'), 2000)
          }
        } else {
          setStatus('error')
          setErrorMessage('Failed to complete authentication')
        }
      } catch (err) {
        setStatus('error')
        setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred')
      }
    }

    processCallback()
  }, [searchParams, handleCallback, navigate])

  return (
    <div className="flex h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Self Assessment Connection</CardTitle>
          <CardDescription>
            {status === 'processing' && 'Processing your authorization...'}
            {status === 'success' && 'Successfully connected!'}
            {status === 'error' && 'Connection failed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'processing' && (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-center text-muted-foreground">
                Please wait while we complete your Self Assessment connection...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
              <div className="text-center">
                <p className="font-semibold">Connection successful!</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {connectionCount === 1
                    ? `Connected 1 business`
                    : `Connected ${connectionCount} businesses`}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {window.opener
                    ? 'This window will close automatically...'
                    : 'Redirecting to Self Assessment dashboard...'}
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Connection Failed</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    if (window.opener) {
                      window.close()
                    } else {
                      navigate('/self-assessment')
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={() => navigate('/self-assessment')}>
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
