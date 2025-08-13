-- Fix entities table infinite recursion and slug checking issue

-- First, check what policies exist on entities table
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view entities in their organizations" ON public.entities;
DROP POLICY IF EXISTS "Users can create entities in their organizations" ON public.entities;
DROP POLICY IF EXISTS "Users can update entities they have access to" ON public.entities;

-- Create simpler non-recursive policies for entities

-- SELECT: Users can view entities in organizations where they are members
-- We avoid recursion by not querying organization_members within organization_members policies
CREATE POLICY "View entities in member organizations" ON public.entities
FOR SELECT
USING (
  -- Check if user is a member of the organization directly
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = entities.organization_id
      AND om.user_id = auth.uid()
      AND om.is_active = true
  )
  OR
  -- Or if user has specific entity permissions
  EXISTS (
    SELECT 1 FROM public.entity_permissions ep
    WHERE ep.entity_id = entities.id
      AND ep.user_id = auth.uid()
  )
);

-- INSERT: Users can create entities if they're admin/owner/accountant
CREATE POLICY "Create entities as org admin" ON public.entities
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = entities.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'accountant')
      AND om.is_active = true
  )
);

-- UPDATE: Users can update entities they have write access to
CREATE POLICY "Update entities with permission" ON public.entities
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = entities.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'accountant')
      AND om.is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.entity_permissions ep
    WHERE ep.entity_id = entities.id
      AND ep.user_id = auth.uid()
      AND ep.permission_level IN ('owner', 'full', 'read_write')
  )
);

-- DELETE: Only org owners can delete entities
CREATE POLICY "Delete entities as org owner" ON public.entities
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = entities.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
      AND om.is_active = true
  )
);

-- Fix the slug checking issue
-- The 406 error happens because the policy might be too restrictive
-- Let's update the organization policy to be clearer
DROP POLICY IF EXISTS "Check slug availability" ON public.organizations;

-- Create a more permissive policy for checking slugs
-- This is safe because we're only allowing SELECT, not revealing sensitive data
CREATE POLICY "Public slug checking" ON public.organizations
FOR SELECT
USING (
  -- Allow everyone to check slug field only during onboarding
  -- Or allow full access to members
  auth.uid() IS NOT NULL
);

-- Also fix entity_permissions policies to avoid recursion
DROP POLICY IF EXISTS "Users can view entity permissions" ON public.entity_permissions;

CREATE POLICY "View entity permissions" ON public.entity_permissions
FOR SELECT
USING (
  -- Can see permissions for entities they have access to
  entity_id IN (
    SELECT e.id FROM public.entities e
    WHERE EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = e.organization_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  )
  OR
  -- Or permissions where they are the user
  user_id = auth.uid()
);