// Hook for managing Self Assessment businesses data
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/supabaseClient'
import type { SAConnection } from '@/types/sa.types'

export function useSABusinesses(entityId?: string) {
  const [connections, setConnections] = useState<SAConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch connections for an entity
  const fetchConnections = useCallback(async () => {
    if (!entityId) {
      setConnections([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('hmrc_connections')
        .select('*')
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      setConnections((data as unknown as SAConnection[]) || [])
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch Self Assessment connections'
      setError(message)
      console.error('Fetch connections error:', err)
      setConnections([])
    } finally {
      setIsLoading(false)
    }
  }, [entityId])

  // Sync a specific business
  const syncBusiness = useCallback(
    async (connectionId: string): Promise<boolean> => {
      setError(null)

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('Not authenticated')
        }

        const response = await supabase.functions.invoke('hmrc-sync-business', {
          body: {
            connection_id: connectionId,
          },
        })

        if (response.error) {
          throw new Error(response.error.message || 'Failed to sync business')
        }

        // Refresh connections after sync
        await fetchConnections()

        return true
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to sync Self Assessment business'
        setError(message)
        console.error('Sync business error:', err)
        return false
      }
    },
    [fetchConnections]
  )

  // Subscribe to real-time updates
  useEffect(() => {
    if (!entityId) return

    fetchConnections()

    // Subscribe to changes
    const subscription = supabase
      .channel(`hmrc_connections:${entityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hmrc_connections',
          filter: `entity_id=eq.${entityId}`,
        },
        () => {
          fetchConnections()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [entityId, fetchConnections])

  return {
    connections,
    isLoading,
    error,
    refetch: fetchConnections,
    syncBusiness,
  }
}
