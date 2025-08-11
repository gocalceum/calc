import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from './OrganizationContext'
import { Tables } from '@/lib/database.types'

type Entity = Tables<'entities'>
type EntityPermission = Tables<'entity_permissions'>

interface EntityContextType {
  currentEntity: Entity | null
  entities: Entity[]
  permission: EntityPermission | null
  isLoading: boolean
  error: Error | null
  switchEntity: (entityId: string) => Promise<void>
  refreshEntities: () => Promise<void>
  createEntity: (data: Partial<Entity>) => Promise<Entity>
}

const EntityContext = createContext<EntityContextType | undefined>(undefined)

export function EntityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { currentOrganization } = useOrganization()
  const [currentEntity, setCurrentEntity] = useState<Entity | null>(null)
  const [entities, setEntities] = useState<Entity[]>([])
  const [permission, setPermission] = useState<EntityPermission | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchEntities = async () => {
    if (!user || !currentOrganization) {
      setEntities([])
      setCurrentEntity(null)
      setPermission(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Get all entities in the current organization
      const { data: orgEntities, error: entitiesError } = await supabase
        .from('entities')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('name')

      if (entitiesError) throw entitiesError

      setEntities(orgEntities || [])

      // Get current entity from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_entity_id')
        .eq('id', user.id)
        .single()

      // Set current entity
      let currentEnt: Entity | null = null
      let currentPerm: EntityPermission | null = null

      if (profile?.current_entity_id) {
        currentEnt = orgEntities?.find((e) => e.id === profile.current_entity_id) || null

        // Get permission for current entity - may not exist, so handle gracefully
        const { data: perm } = await supabase
          .from('entity_permissions')
          .select('*')
          .eq('entity_id', profile.current_entity_id)
          .eq('user_id', user.id)
          .maybeSingle()

        currentPerm = perm
      }

      setCurrentEntity(currentEnt)
      setPermission(currentPerm)
    } catch (err) {
      console.error('Error fetching entities:', err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }

  const switchEntity = async (entityId: string) => {
    if (!user) return

    try {
      setError(null)

      // Update profile with new current entity
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ current_entity_id: entityId })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Update local state
      const newEntity = entities.find((e) => e.id === entityId)
      if (newEntity) {
        setCurrentEntity(newEntity)

        // Get permission for new entity - may not exist, so handle gracefully
        const { data: newPermission } = await supabase
          .from('entity_permissions')
          .select('*')
          .eq('entity_id', entityId)
          .eq('user_id', user.id)
          .maybeSingle()

        setPermission(newPermission)
      }
    } catch (err) {
      console.error('Error switching entity:', err)
      setError(err as Error)
      throw err
    }
  }

  const createEntity = async (data: Partial<Entity>) => {
    if (!user || !currentOrganization) {
      throw new Error('Must be logged in with an organization to create entities')
    }

    try {
      setError(null)

      const { data: newEntity, error: createError } = await supabase
        .from('entities')
        .insert({
          ...data,
          organization_id: currentOrganization.id,
          created_by: user.id,
        } as any)
        .select()
        .single()

      if (createError) throw createError

      // Refresh entities list
      await fetchEntities()

      return newEntity
    } catch (err) {
      console.error('Error creating entity:', err)
      setError(err as Error)
      throw err
    }
  }

  useEffect(() => {
    fetchEntities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentOrganization])

  const value: EntityContextType = {
    currentEntity,
    entities,
    permission,
    isLoading,
    error,
    switchEntity,
    refreshEntities: fetchEntities,
    createEntity,
  }

  return <EntityContext.Provider value={value}>{children}</EntityContext.Provider>
}

export function useEntity() {
  const context = useContext(EntityContext)
  if (context === undefined) {
    throw new Error('useEntity must be used within an EntityProvider')
  }
  return context
}
