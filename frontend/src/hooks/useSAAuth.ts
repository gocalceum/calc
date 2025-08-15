// Hook for managing Self Assessment (Self Assessment) OAuth authentication
import { useState, useCallback } from 'react'
import { supabase } from '@/supabaseClient'
import type { OAuthInitiateResponse, OAuthCallbackResponse } from '@/types/sa.types'

export function useSAAuth() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initiateOAuth = useCallback(
    async (entityId: string): Promise<OAuthInitiateResponse | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('Not authenticated')
        }

        const response = await supabase.functions.invoke('hmrc-auth-initiate', {
          body: {
            entity_id: entityId,
            scopes: ['read:self-assessment', 'write:self-assessment'],
          },
        })

        if (response.error) {
          throw new Error(response.error.message || 'Failed to initiate OAuth')
        }

        const data = response.data as OAuthInitiateResponse

        // Open authorization URL in new window
        window.open(data.auth_url, 'sa-auth', 'width=800,height=600,left=200,top=100')

        // Store state in localStorage for callback verification (accessible across windows)
        localStorage.setItem('sa_oauth_state', data.state)
        localStorage.setItem('sa_oauth_entity', entityId)
        console.log('OAuth state stored:', {
          state: data.state,
          entityId,
          verifyStorage: localStorage.getItem('sa_oauth_state'),
        })

        return data
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to initiate Self Assessment authentication'
        setError(message)
        console.error('Self Assessment OAuth initiation error:', err)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const handleCallback = useCallback(
    async (code: string, state: string): Promise<OAuthCallbackResponse | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('Not authenticated')
        }

        // Verify state matches (check localStorage since it's accessible across windows)
        const storedState = localStorage.getItem('sa_oauth_state')
        console.log('OAuth state validation:', {
          receivedState: state,
          storedState,
          match: state === storedState,
        })
        if (state !== storedState) {
          throw new Error('Invalid OAuth state - possible CSRF attack')
        }

        const response = await supabase.functions.invoke('hmrc-auth-callback', {
          body: {
            code,
            state,
          },
        })

        if (response.error) {
          throw new Error(response.error.message || 'Failed to complete OAuth')
        }

        const data = response.data as OAuthCallbackResponse

        // Clean up localStorage
        localStorage.removeItem('sa_oauth_state')
        localStorage.removeItem('sa_oauth_entity')

        return data
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to complete Self Assessment authentication'
        setError(message)
        console.error('Self Assessment OAuth callback error:', err)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const disconnectBusiness = useCallback(async (connectionId: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('hmrc_connections')
        .update({
          is_active: false,
          disconnected_at: new Date().toISOString(),
          oauth_tokens: null,
        })
        .eq('id', connectionId)

      if (error) {
        throw error
      }

      return true
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to disconnect Self Assessment business'
      setError(message)
      console.error('Self Assessment disconnect error:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isLoading,
    error,
    initiateOAuth,
    handleCallback,
    disconnectBusiness,
  }
}
