-- Fix infinite recursion in organization_members RLS policies (v2)
-- The problem: Any self-referential query causes infinite recursion
-- Solution: Simplify to only allow direct user access to their own records

-- Drop ALL existing policies on organization_members to start fresh
DROP POLICY IF EXISTS "Users can view members of their organizations" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can manage organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can update organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can delete organization members" ON public.organization_members;

-- Extremely simple policy: Users can only see their own membership records
-- This avoids ALL recursion issues
CREATE POLICY "Users can view their own memberships" ON public.organization_members
FOR SELECT
USING (user_id = auth.uid());

-- For now, disable modifications through the API
-- We'll handle admin operations through service role or functions
CREATE POLICY "No direct modifications" ON public.organization_members
FOR ALL
USING (false)
WITH CHECK (false);