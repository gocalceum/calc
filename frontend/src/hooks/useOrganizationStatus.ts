import { useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'
import { useAuth } from '@/hooks/useAuth'

interface OrganizationStatus {
  hasOrganization: boolean
  organizationId: string | null
  organizationName: string | null
  isLoading: boolean
  error: Error | null
}

export function useOrganizationStatus(): OrganizationStatus {
  const { user } = useAuth()
  const [status, setStatus] = useState<OrganizationStatus>({
    hasOrganization: false,
    organizationId: null,
    organizationName: null,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    if (!user) {
      setStatus({
        hasOrganization: false,
        organizationId: null,
        organizationName: null,
        isLoading: false,
        error: null,
      })
      return
    }

    const checkOrganization = async () => {
      try {
        const { data: membership, error } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single()

        if (error && error.code !== 'PGRST116') {
          throw error
        }

        if (membership && membership.organization_id) {
          // Get the organization details separately
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id, name, slug')
            .eq('id', membership.organization_id)
            .single()

          if (orgError) throw orgError

          if (org) {
            setStatus({
              hasOrganization: true,
              organizationId: org.id,
              organizationName: org.name,
              isLoading: false,
              error: null,
            })

            const { data: profile } = await supabase
              .from('profiles')
              .select('current_org_id')
              .eq('id', user.id)
              .single()

            if (!profile?.current_org_id) {
              await supabase.from('profiles').update({ current_org_id: org.id }).eq('id', user.id)
            }
          }
        } else {
          setStatus({
            hasOrganization: false,
            organizationId: null,
            organizationName: null,
            isLoading: false,
            error: null,
          })
        }
      } catch (error) {
        console.error('Error checking organization:', error)
        setStatus((prev) => ({
          ...prev,
          isLoading: false,
          error: error as Error,
        }))
      }
    }

    checkOrganization()
  }, [user])

  return status
}
