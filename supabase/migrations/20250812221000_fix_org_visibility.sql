-- Fix organization visibility issue
-- The problem: "Check slug exists" policy allows all users to see all organizations
-- This causes new users to bypass onboarding

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Check slug exists" ON public.organizations;
DROP POLICY IF EXISTS "View full org details for members" ON public.organizations;

-- Create a single, clear SELECT policy
-- Users can ONLY see organizations they are members of
CREATE POLICY "Users see only their organizations" ON public.organizations
FOR SELECT
USING (
  id IN (
    SELECT organization_id 
    FROM public.organization_members 
    WHERE user_id = auth.uid() 
      AND is_active = true
  )
);

-- For slug checking during onboarding, we need a different approach
-- Create a function that checks slug availability without revealing organization data
CREATE OR REPLACE FUNCTION check_slug_available(slug_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE slug = slug_to_check
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION check_slug_available TO authenticated;

-- Now users can check slug availability via the function, not direct SELECT