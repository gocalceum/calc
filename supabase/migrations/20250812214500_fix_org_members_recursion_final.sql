-- Final fix for organization_members infinite recursion
-- The problem: ANY policy that queries organization_members table causes recursion
-- Solution: Use only direct column checks, no subqueries on the same table

-- Drop ALL existing policies on organization_members
DROP POLICY IF EXISTS "View own memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Manage organization memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.organization_members;
DROP POLICY IF EXISTS "No direct modifications" ON public.organization_members;

-- Create the simplest possible policy - users can only see their own records
CREATE POLICY "Users see own memberships only" ON public.organization_members
FOR SELECT
USING (user_id = auth.uid());

-- For INSERT: Allow the create_organization_with_owner function to work
-- We'll use SECURITY DEFINER on the function instead of RLS for inserts
CREATE POLICY "Insert via function only" ON public.organization_members
FOR INSERT
WITH CHECK (false);  -- Prevent direct inserts, use functions

-- For UPDATE/DELETE: Temporarily disable until we implement proper admin functions
CREATE POLICY "No direct updates" ON public.organization_members
FOR UPDATE
USING (false);

CREATE POLICY "No direct deletes" ON public.organization_members
FOR DELETE  
USING (false);

-- Update the function to bypass RLS (SECURITY DEFINER already set)
-- This allows it to insert into organization_members
ALTER FUNCTION create_organization_with_owner(TEXT, TEXT, TEXT) SECURITY DEFINER;

-- Create a function to manage organization members that bypasses RLS
CREATE OR REPLACE FUNCTION manage_organization_member(
  p_organization_id UUID,
  p_user_id UUID,
  p_role TEXT,
  p_action TEXT  -- 'add', 'update', 'remove'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Check if current user is admin/owner of the organization
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND is_active = true
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Not authorized to manage organization members';
  END IF;
  
  CASE p_action
    WHEN 'add' THEN
      INSERT INTO public.organization_members (organization_id, user_id, role, is_active)
      VALUES (p_organization_id, p_user_id, p_role, true)
      ON CONFLICT (organization_id, user_id) DO UPDATE
      SET role = p_role, is_active = true;
    WHEN 'update' THEN
      UPDATE public.organization_members
      SET role = p_role
      WHERE organization_id = p_organization_id AND user_id = p_user_id;
    WHEN 'remove' THEN
      UPDATE public.organization_members
      SET is_active = false
      WHERE organization_id = p_organization_id AND user_id = p_user_id;
    ELSE
      RAISE EXCEPTION 'Invalid action';
  END CASE;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION manage_organization_member TO authenticated;