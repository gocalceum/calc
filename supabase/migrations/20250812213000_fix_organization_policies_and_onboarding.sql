-- Fix organization policies and onboarding workflow
-- This consolidates and fixes all organization-related policies

-- Drop all existing policies on organizations to start fresh
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Anyone can check slug availability" ON public.organizations;
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;

-- Create clean, non-conflicting policies

-- 1. Allow authenticated users to check if a slug exists (for onboarding)
CREATE POLICY "Check slug availability" ON public.organizations
FOR SELECT
USING (auth.uid() IS NOT NULL);  -- Any authenticated user can check

-- 2. Allow users to create organizations (via function or direct insert)
CREATE POLICY "Create organizations" ON public.organizations
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- 3. Allow users to update organizations they own/admin
CREATE POLICY "Update own organizations" ON public.organizations
FOR UPDATE
USING (
  id IN (
    SELECT organization_id 
    FROM public.organization_members 
    WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND is_active = true
  )
);

-- 4. Allow users to delete organizations they own
CREATE POLICY "Delete own organizations" ON public.organizations
FOR DELETE
USING (
  id IN (
    SELECT organization_id 
    FROM public.organization_members 
    WHERE user_id = auth.uid() 
      AND role = 'owner'
      AND is_active = true
  )
);

-- Fix the organization creation function to ensure it works properly
CREATE OR REPLACE FUNCTION create_organization_with_owner(
  org_name TEXT,
  org_slug TEXT,
  org_type TEXT DEFAULT 'accounting_firm'
)
RETURNS UUID AS $$
DECLARE
  new_org_id UUID;
  user_id UUID;
BEGIN
  -- Get the current user ID
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Create the organization
  INSERT INTO public.organizations (name, slug, type, created_by)
  VALUES (org_name, org_slug, org_type, user_id)
  RETURNING id INTO new_org_id;
  
  -- Add the creator as owner
  INSERT INTO public.organization_members (organization_id, user_id, role, is_active)
  VALUES (new_org_id, user_id, 'owner', true);
  
  -- Ensure user has a profile, then set current organization
  INSERT INTO public.profiles (id, current_org_id, updated_at)
  VALUES (user_id, new_org_id, NOW())
  ON CONFLICT (id) DO UPDATE
  SET current_org_id = new_org_id,
      updated_at = NOW();
  
  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant proper permissions
GRANT EXECUTE ON FUNCTION create_organization_with_owner TO authenticated;
GRANT ALL ON public.organizations TO authenticated;
GRANT ALL ON public.organization_members TO authenticated;

-- Also ensure the organization context can properly fetch organizations
-- by fixing the organization_members policy to be simpler
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.organization_members;
DROP POLICY IF EXISTS "No direct modifications" ON public.organization_members;

-- Simple policy: users can see memberships where they are the user
CREATE POLICY "View own memberships" ON public.organization_members
FOR SELECT
USING (user_id = auth.uid());

-- Allow users to manage memberships in organizations they admin
CREATE POLICY "Manage organization memberships" ON public.organization_members
FOR ALL
USING (
  organization_id IN (
    SELECT om.organization_id 
    FROM public.organization_members om
    WHERE om.user_id = auth.uid() 
      AND om.role IN ('owner', 'admin')
      AND om.is_active = true
  )
);