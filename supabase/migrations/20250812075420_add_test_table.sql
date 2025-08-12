-- Test migration to verify CI/CD pipeline
-- This table will be removed after testing

CREATE TABLE IF NOT EXISTS public.pipeline_test (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_name TEXT NOT NULL,
    test_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS for security
ALTER TABLE public.pipeline_test ENABLE ROW LEVEL SECURITY;

-- Create a simple policy for authenticated users
CREATE POLICY "Authenticated users can view test records" 
    ON public.pipeline_test 
    FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Authenticated users can insert test records" 
    ON public.pipeline_test 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = created_by);

-- Add a comment to identify this as a test table
COMMENT ON TABLE public.pipeline_test IS 'Temporary test table for CI/CD pipeline verification - to be removed';

-- Insert a test record
INSERT INTO public.pipeline_test (test_name, test_value) 
VALUES ('CI/CD Pipeline Test', '{"timestamp": "2025-08-12", "purpose": "verify migration workflow"}'::jsonb);