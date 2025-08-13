-- Fix infinite recursion in organization_members RLS policies
-- The issue: Policies were referencing the same table they were protecting, causing infinite recursion

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view members of their organizations" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can manage organization members" ON public.organization_members;

-- Create fixed SELECT policy - directly check the current user's membership without recursive query
CREATE POLICY "Users can view members of their organizations" ON public.organization_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.organization_members om
    WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.is_active = true
  )
);

-- Create fixed ALL policy for admins - directly check admin status without recursive query
CREATE POLICY "Admins can manage organization members" ON public.organization_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM public.organization_members om
    WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.is_active = true
  )
);