import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { Tables } from '@/lib/database.types'

type Organization = Tables<'organizations'>
type OrganizationMember = Tables<'organization_members'>

interface OrganizationContextType {
  currentOrganization: Organization | null
  organizations: Organization[]
  membership: OrganizationMember | null
  isLoading: boolean
  error: Error | null
  switchOrganization: (orgId: string) => Promise<void>
  refreshOrganizations: () => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [membership, setMembership] = useState<OrganizationMember | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchOrganizations = async () => {
    if (!user) {
      setOrganizations([])
      setCurrentOrganization(null)
      setMembership(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Get all organizations user is a member of
      const { data: memberships, error: membershipError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (membershipError) throw membershipError

      // Now get the organizations separately
      let orgs: Organization[] = []
      if (memberships && memberships.length > 0) {
        const orgIds = memberships
          .map((m) => m.organization_id)
          .filter((id): id is string => id !== null)
        const { data: organizationsData, error: orgsError } = await supabase
          .from('organizations')
          .select('*')
          .in('id', orgIds)

        if (orgsError) throw orgsError
        orgs = organizationsData || []
      }
      setOrganizations(orgs)

      // Get current organization from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_org_id')
        .eq('id', user.id)
        .single()

      // Set current organization
      let currentOrg: Organization | null = null
      let currentMembership: OrganizationMember | null = null

      if (profile?.current_org_id) {
        currentOrg = orgs?.find((o) => o.id === profile.current_org_id) || null
        currentMembership =
          memberships?.find((m) => m.organization_id === profile.current_org_id) || null
      } else if (orgs && orgs.length > 0) {
        // If no current org set, use the first one
        currentOrg = orgs[0]
        currentMembership = memberships?.[0] || null

        // Update profile with current org
        await supabase.from('profiles').update({ current_org_id: currentOrg.id }).eq('id', user.id)
      }

      setCurrentOrganization(currentOrg)
      setMembership(currentMembership)
    } catch (err) {
      console.error('Error fetching organizations:', err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }

  const switchOrganization = async (orgId: string) => {
    if (!user) return

    try {
      setError(null)

      // Update profile with new current org
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ current_org_id: orgId })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Update local state
      const newOrg = organizations.find((o) => o.id === orgId)
      if (newOrg) {
        setCurrentOrganization(newOrg)

        // Get membership for new org
        const { data: newMembership } = await supabase
          .from('organization_members')
          .select('*')
          .eq('organization_id', orgId)
          .eq('user_id', user.id)
          .single()

        setMembership(newMembership)
      }
    } catch (err) {
      console.error('Error switching organization:', err)
      setError(err as Error)
      throw err
    }
  }

  useEffect(() => {
    fetchOrganizations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const value: OrganizationContextType = {
    currentOrganization,
    organizations,
    membership,
    isLoading,
    error,
    switchOrganization,
    refreshOrganizations: fetchOrganizations,
  }

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}
